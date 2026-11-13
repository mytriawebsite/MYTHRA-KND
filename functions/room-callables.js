"use strict";

// Funções auxiliares e operações seguras da sala de mineração.
// O arquivo será incorporado ao index.js na próxima etapa.

const VALID_RACKS = new Set([
  "rack_1001", "rack_1002", "rack_1003",
  "rack_1004", "rack_1005", "rack_1006",
]);

const MINER_SIZES = {
  miner_2001: 2,
  miner_2002: 2,
  miner_2003: 1,
  miner_2004: 1,
};

const VALID_SHELVES = ["shelf_1", "shelf_2", "shelf_3", "shelf_4"];
const VALID_MACHINE_KEYS = ["machine_1", "machine_2"];

function roomError(HttpsError, code, message) {
  throw new HttpsError(code, message);
}

function validateSlotId(HttpsError, slotId) {
  if (typeof slotId !== "string" ||
      !/^slot_(?:[1-9]|1[0-6])$/.test(slotId)) {
    roomError(HttpsError, "invalid-argument", "Posição de rack inválida.");
  }
}

function validateShelfId(HttpsError, shelfId) {
  if (!VALID_SHELVES.includes(shelfId)) {
    roomError(HttpsError, "invalid-argument", "Prateleira inválida.");
  }
}

function safeInventoryCount(HttpsError, value, label) {
  const count = value ?? 0;
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000000) {
    roomError(HttpsError, "failed-precondition", `Quantidade inválida: ${label}.`);
  }
  return count;
}

function safeInventoryAddition(HttpsError, current, amount, label) {
  const count = safeInventoryCount(HttpsError, current, label);

  if (!Number.isSafeInteger(amount) || amount < 0 || count + amount > 1000000) {
    roomError(HttpsError, "failed-precondition",
      `Devolução excede o limite seguro do inventário: ${label}.`);
  }

  return count + amount;
}

function normalizeRoomForBackend(HttpsError, roomData) {
  if (!roomData || typeof roomData !== "object" || Array.isArray(roomData)) {
    roomError(HttpsError, "failed-precondition", "Estrutura da sala inválida.");
  }

  const rawRacks = roomData.racks;
  if (!Array.isArray(rawRacks) &&
      (!rawRacks || typeof rawRacks !== "object")) {
    roomError(HttpsError, "failed-precondition", "Lista de racks inválida.");
  }

  if (Array.isArray(rawRacks) && rawRacks.length > 16) {
    roomError(HttpsError, "failed-precondition", "A sala possui posições extras de racks.");
  }

  if (!Array.isArray(rawRacks) &&
      Object.keys(rawRacks).some((key) => !/^slot_(?:[1-9]|1[0-6])$/.test(key))) {
    roomError(HttpsError, "failed-precondition", "A sala possui uma posição de rack desconhecida.");
  }

  const racks = {};

  for (let i = 1; i <= 16; i++) {
    const slotId = `slot_${i}`;
    const rawRack = Array.isArray(rawRacks)
      ? rawRacks[i - 1]
      : rawRacks[slotId];

    if (rawRack == null) {
      racks[slotId] = {
        id: slotId,
        modelId: null,
        shelves: {
          shelf_1: {}, shelf_2: {}, shelf_3: {}, shelf_4: {},
        },
      };
      continue;
    }

    if (typeof rawRack !== "object" || Array.isArray(rawRack)) {
      roomError(HttpsError, "failed-precondition", `Rack inválido: ${slotId}.`);
    }

    const rawShelves = rawRack.shelves;
    if (!Array.isArray(rawShelves) &&
        (!rawShelves || typeof rawShelves !== "object")) {
      roomError(HttpsError, "failed-precondition", `Prateleiras inválidas: ${slotId}.`);
    }

    if (Array.isArray(rawShelves) && rawShelves.length > 4) {
      roomError(HttpsError, "failed-precondition", `Prateleiras extras: ${slotId}.`);
    }

    if (!Array.isArray(rawShelves) &&
        Object.keys(rawShelves).some((key) => !VALID_SHELVES.includes(key))) {
      roomError(HttpsError, "failed-precondition", `Prateleira desconhecida: ${slotId}.`);
    }

    const shelves = {};

    for (let s = 0; s < 4; s++) {
      const shelfId = VALID_SHELVES[s];
      const rawShelf = Array.isArray(rawShelves)
        ? rawShelves[s]
        : rawShelves[shelfId];

      if (rawShelf == null) {
        shelves[shelfId] = {};
        continue;
      }

      if (Array.isArray(rawShelf)) {
        if (rawShelf.length > 2) {
          roomError(HttpsError, "failed-precondition", "Prateleira excede duas posições.");
        }
        shelves[shelfId] = {};
        rawShelf.forEach((machine, index) => {
          shelves[shelfId][`machine_${index + 1}`] = machine;
        });
      } else if (typeof rawShelf === "object") {
        shelves[shelfId] = {...rawShelf};
      } else {
        roomError(HttpsError, "failed-precondition", "Formato de prateleira inválido.");
      }

      const machineKeys = Object.keys(shelves[shelfId]);
      if (machineKeys.some((key) => !VALID_MACHINE_KEYS.includes(key))) {
        roomError(HttpsError, "failed-precondition", "Posição de máquina desconhecida.");
      }

      const compact = {};
      let nextMachine = 1;

      for (const key of VALID_MACHINE_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(shelves[shelfId], key)) continue;
        const machine = shelves[shelfId][key];

        if (!machine || typeof machine !== "object" ||
            Array.isArray(machine) ||
            typeof machine.minerId !== "string" ||
            !Object.prototype.hasOwnProperty.call(MINER_SIZES, machine.minerId)) {
          roomError(HttpsError, "failed-precondition", "Máquina instalada inválida.");
        }

        compact[`machine_${nextMachine++}`] = {minerId: machine.minerId};
      }

      shelves[shelfId] = compact;
    }

    const modelId = rawRack.modelId ?? null;
    if (modelId !== null && !VALID_RACKS.has(modelId)) {
      roomError(HttpsError, "failed-precondition", "Modelo de rack inválido.");
    }

    racks[slotId] = {
      id: slotId,
      modelId,
      shelves,
    };
  }

  return {...roomData, racks};
}

function normalizeInventoryForBackend(HttpsError, inventoryData) {
  if (!inventoryData || typeof inventoryData !== "object" ||
      Array.isArray(inventoryData)) {
    roomError(HttpsError, "failed-precondition", "Inventário inválido.");
  }

  for (const category of ["racks", "miners"]) {
    if (inventoryData[category] != null &&
        (typeof inventoryData[category] !== "object" ||
         Array.isArray(inventoryData[category]))) {
      roomError(HttpsError, "failed-precondition", `Inventário de ${category} inválido.`);
    }
  }

  return {
    ...inventoryData,
    racks: {...(inventoryData.racks || {})},
    miners: {...(inventoryData.miners || {})},
  };
}

function validateInstalledRack(HttpsError, rack) {
  if (!rack || !VALID_RACKS.has(rack.modelId)) {
    roomError(HttpsError, "failed-precondition", "Instale um rack primeiro.");
  }
}

function countShelfMachines(shelf) {
  return Object.keys(shelf).length;
}

// Cole este bloco no functions/index.js somente depois da conferência.

function validateRoomLayout(HttpsError, racks) {
  for (const slotId of Object.keys(racks)) {
    const rack = racks[slotId];
    const hasMachines = Object.values(rack.shelves)
      .some((shelf) => Object.keys(shelf).length > 0);

    if (!rack.modelId && hasMachines) {
      roomError(HttpsError, "failed-precondition",
        `Existem máquinas em um espaço sem rack: ${slotId}.`);
    }

    for (const shelfId of VALID_SHELVES) {
      const shelf = rack.shelves[shelfId];
      const machines = Object.values(shelf);

      if (machines.length > 2) {
        roomError(HttpsError, "failed-precondition",
          "Prateleira excede duas máquinas.");
      }

      const sizes = machines.map((machine) => MINER_SIZES[machine.minerId]);

      if (sizes.includes(2) && machines.length !== 1) {
        roomError(HttpsError, "failed-precondition",
          "Máquina de tamanho 2 precisa ocupar a prateleira sozinha.");
      }
    }
  }
}

function createRoomCallables({onCall, HttpsError, db, FieldValue}) {
  async function mutateRoom(request, operation) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login para continuar.");
    }

    const uid = request.auth.uid;
    const slotId = request.data?.slotId;
    validateSlotId(HttpsError, slotId);

    const stateRef = db.doc(`users/${uid}/game/state`);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef);

      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Estado do jogador não encontrado.");
      }

      const state = snapshot.data();
      const room = normalizeRoomForBackend(HttpsError, state.room);
      const inventory = normalizeInventoryForBackend(
        HttpsError, state.inventory
      );

      validateRoomLayout(HttpsError, room.racks);

      const result = operation({
        room,
        inventory,
        rack: room.racks[slotId],
        data: request.data || {},
      });

      transaction.update(stateRef, {
        room: result.room || room,
        inventory: result.inventory || inventory,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {success: true, ...result.response};
    });
  }

  const installRack = onCall((request) => mutateRoom(request, ({
    room, inventory, rack, data,
  }) => {
    const rackId = data.rackId;

    if (!VALID_RACKS.has(rackId)) {
      throw new HttpsError("invalid-argument", "Modelo de rack inválido.");
    }
    if (rack.modelId) {
      throw new HttpsError("failed-precondition", "Esse espaço já possui um rack.");
    }

    const count = safeInventoryCount(
      HttpsError, inventory.racks[rackId], rackId
    );
    if (count < 1) {
      throw new HttpsError("failed-precondition", "Rack indisponível no inventário.");
    }

    inventory.racks[rackId] = count - 1;
    rack.modelId = rackId;

    return {room, inventory, response: {slotId: data.slotId, rackId}};
  }));

  const installMiner = onCall((request) => mutateRoom(request, ({
    room, inventory, rack, data,
  }) => {
    const {shelfId, minerId} = data;
    validateShelfId(HttpsError, shelfId);

    if (!rack.modelId) {
      throw new HttpsError("failed-precondition", "Instale um rack primeiro.");
    }
    if (!Object.prototype.hasOwnProperty.call(MINER_SIZES, minerId)) {
      throw new HttpsError("invalid-argument", "Máquina inválida.");
    }

    const count = safeInventoryCount(
      HttpsError, inventory.miners[minerId], minerId
    );
    if (count < 1) {
      throw new HttpsError("failed-precondition", "Máquina indisponível no inventário.");
    }

    const shelf = rack.shelves[shelfId];
    const occupied = Object.values(shelf);
    const size = MINER_SIZES[minerId];

    if (size === 2 && occupied.length !== 0) {
      throw new HttpsError("failed-precondition",
        "Máquina de tamanho 2 precisa de uma prateleira vazia.");
    }
    if (size === 1 && (
      occupied.length >= 2 ||
      occupied.some((machine) => MINER_SIZES[machine.minerId] === 2)
    )) {
      throw new HttpsError("failed-precondition",
        "Não há espaço disponível nessa prateleira.");
    }

    const machineKey = occupied.length === 0 ? "machine_1" : "machine_2";
    shelf[machineKey] = {minerId};
    inventory.miners[minerId] = count - 1;

    return {
      room,
      inventory,
      response: {slotId: data.slotId, shelfId, minerId},
    };
  }));

  const removeMiner = onCall((request) => mutateRoom(request, ({
    room, inventory, rack, data,
  }) => {
    const {shelfId, machineIndex} = data;
    validateShelfId(HttpsError, shelfId);

    if (!rack.modelId) {
      throw new HttpsError("failed-precondition", "Não existe rack nesse espaço.");
    }
    if (!Number.isInteger(machineIndex) ||
        machineIndex < 0 || machineIndex > 1) {
      throw new HttpsError("invalid-argument", "Posição da máquina inválida.");
    }

    const shelf = rack.shelves[shelfId];
    const machineKey = `machine_${machineIndex + 1}`;
    const machine = shelf[machineKey];

    if (!machine) {
      throw new HttpsError("not-found", "Máquina não encontrada nessa posição.");
    }

    const minerId = machine.minerId;
    const count = safeInventoryCount(
      HttpsError, inventory.miners[minerId], minerId
    );

    delete shelf[machineKey];

    if (machineKey === "machine_1" && shelf.machine_2) {
      shelf.machine_1 = shelf.machine_2;
      delete shelf.machine_2;
    }

    inventory.miners[minerId] = safeInventoryAddition(HttpsError, count, 1, minerId);

    return {
      room,
      inventory,
      response: {slotId: data.slotId, shelfId, minerId},
    };
  }));

  const removeRack = onCall((request) => mutateRoom(request, ({
    room, inventory, rack, data,
  }) => {
    if (!rack.modelId) {
      throw new HttpsError("failed-precondition", "Não existe rack nesse espaço.");
    }

    const rackId = rack.modelId;
    const rackCount = safeInventoryCount(
      HttpsError, inventory.racks[rackId], rackId
    );
    const returnedMiners = {};

    for (const shelfId of VALID_SHELVES) {
      for (const machine of Object.values(rack.shelves[shelfId])) {
        const minerId = machine.minerId;
        returnedMiners[minerId] = (returnedMiners[minerId] || 0) + 1;
      }
    }

    inventory.racks[rackId] = safeInventoryAddition(HttpsError, rackCount, 1, rackId);

    for (const [minerId, amount] of Object.entries(returnedMiners)) {
      const current = safeInventoryCount(
        HttpsError, inventory.miners[minerId], minerId
      );
      inventory.miners[minerId] = safeInventoryAddition(HttpsError, current, amount, minerId);
    }

    rack.modelId = null;
    rack.shelves = {
      shelf_1: {}, shelf_2: {}, shelf_3: {}, shelf_4: {},
    };

    return {
      room,
      inventory,
      response: {slotId: data.slotId, rackId, returnedMiners},
    };
  }));

  return {installRack, installMiner, removeMiner, removeRack};
}

module.exports = {createRoomCallables};
