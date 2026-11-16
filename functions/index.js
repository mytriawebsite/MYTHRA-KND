"use strict";

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

initializeApp();

setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 5,
});

const db = getFirestore();

exports.initializePlayer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Você precisa estar conectado para inicializar o jogo.",
    );
  }

  const signInProvider =
    request.auth.token.firebase &&
    request.auth.token.firebase.sign_in_provider;

  if (
    signInProvider === "password" &&
    request.auth.token.email_verified !== true
  ) {
    throw new HttpsError(
        "permission-denied",
        "Verifique seu endereço de e-mail antes de entrar no MYTRIA.",
    );
  }

  const uid = request.auth.uid;
  const email = String(request.auth.token.email || "").toLowerCase();
  const isTestProject = process.env.GCLOUD_PROJECT === "demo-mytria02";

  // Esta conta só recebe ADM e crédito dentro do emulador.
  const isTestAdmin =
    isTestProject && email === "mytria.adm.teste@example.com";

  const accountType = isTestAdmin ? "ADM" : "JOGADOR";
  const initialBalance = isTestAdmin ? 1000 : 0;
  const stateRef = db.doc(`users/${uid}/game/state`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef);

      if (snapshot.exists) {
        const existing = snapshot.data();
        return {
          created: false,
          balance: existing.balance ?? 0,
          accountType: existing.accountType || "JOGADOR",
        };
      }

      const roomRacks = {};
      for (let index = 1; index <= 16; index++) {
        const slotId = `slot_${index}`;
        roomRacks[slotId] = {
          id: slotId,
          modelId: null,
          shelves: {
            shelf_1: {},
            shelf_2: {},
            shelf_3: {},
            shelf_4: {},
          },
        };
      }

      const initialState = {
        balance: initialBalance,
        accountType,
        inventory: {
          racks: {},
          miners: {},
        },
        room: {
          racks: roomRacks,
        },
        ...(isTestAdmin ? {initialTestCreditApplied: true} : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.create(stateRef, initialState);

      return {
        created: true,
        balance: initialBalance,
        accountType,
      };
    });

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("Erro ao inicializar jogador:", error);
    if (error instanceof HttpsError) throw error;

    throw new HttpsError(
        "internal",
        "Não foi possível inicializar os dados do jogador.",
    );
  }
});

// Catálogo autorizado para a fase de testes.
// Todos os produtos custam 1 MYT.
const TEST_CATALOG = {
  racks: [
    "rack_1001",
    "rack_1002",
    "rack_1003",
    "rack_1004",
  ],
  miners: [
    "miner_2001",
    "miner_2002",
    "miner_2003",
    "miner_2004",
  ],
};

exports.purchaseItem = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Faça login para comprar.");
  }

  const {type, itemId, quantity} = request.data || {};

  if (!["racks", "miners"].includes(type)) {
    throw new HttpsError("invalid-argument", "Tipo de produto inválido.");
  }

  if (typeof itemId !== "string" ||
      !TEST_CATALOG[type].includes(itemId)) {
    throw new HttpsError("invalid-argument", "Produto não autorizado.");
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new HttpsError(
        "invalid-argument",
        "A quantidade deve estar entre 1 e 99.",
    );
  }

  const uid = request.auth.uid;
  const stateRef = db.doc(`users/${uid}/game/state`);
  const unitPrice = 0;
  const totalPrice = unitPrice * quantity;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef);

      if (!snapshot.exists) {
        throw new HttpsError(
            "failed-precondition",
            "Inicialize os dados do jogador antes de comprar.",
        );
      }

      const state = snapshot.data();
      const balance = Number(state.balance);

      if (!Number.isFinite(balance) || balance < totalPrice) {
        throw new HttpsError(
            "failed-precondition",
            "Saldo insuficiente.",
        );
      }

      const inventory = state.inventory || {};
      const category = inventory[type] || {};
      const currentQuantity = Number(category[itemId] || 0);

      if (!Number.isSafeInteger(currentQuantity) ||
          currentQuantity < 0 ||
          currentQuantity + quantity > 1000000) {
        throw new HttpsError(
            "failed-precondition",
            "Quantidade de inventário inválida.",
        );
      }

      const newBalance = balance - totalPrice;
      const newQuantity = currentQuantity + quantity;

      transaction.update(stateRef, {
        balance: newBalance,
        [`inventory.${type}.${itemId}`]: newQuantity,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        balance: newBalance,
        itemId,
        type,
        quantity: newQuantity,
        purchased: quantity,
        unitPrice,
        totalPrice,
      };
    });

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    console.error("Erro na compra:", error);
    throw new HttpsError(
        "internal",
        "Não foi possível concluir a compra.",
    );
  }
});

// Operações da sala de mineração centralizadas.
const {createRoomCallables} = require("./room-callables");

const roomCallables = createRoomCallables({
  onCall,
  HttpsError,
  db,
  FieldValue,
});

exports.installRack = roomCallables.installRack;
exports.installMiner = roomCallables.installMiner;
exports.removeMiner = roomCallables.removeMiner;
exports.removeRack = roomCallables.removeRack;
