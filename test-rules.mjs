import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, runTransaction, serverTimestamp } from "firebase/firestore";

const projectId = "demo-mytria02";
const rules = await readFile(
  "/data/data/com.termux/files/home/MYTRIA.KND/firestore.rules",
  "utf8"
);

const env = await initializeTestEnvironment({
  projectId,
  firestore: { rules, host: "127.0.0.1", port: 8080 }
});

try {
  const uid = "jogador-teste-001";

  const racks = Array.from({ length: 16 }, (_, i) => ({
    id: `slot_${i + 1}`,
    modelId: null,
    shelves: {
      shelf_1: [],
      shelf_2: [],
      shelf_3: [],
      shelf_4: []
    }
  }));

  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "users", uid, "game", "state"), {
      balance: 1000,
      inventory: { racks: {}, miners: {} },
      room: { racks },
      initialTestCreditApplied: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  const db = env.authenticatedContext(uid).firestore();
  const ref = doc(db, "users", uid, "game", "state");

  console.log("TESTE 1 — Compra de 2 racks");

  await assertSucceeds(runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const state = snap.data();

    tx.update(ref, {
      balance: state.balance - 2,
      "inventory.racks.rack_1001": 2,
      updatedAt: serverTimestamp()
    });
  }));

  console.log("PASSOU: compra autorizada");

  console.log("TESTE 2 — Instalação de rack");

  await assertFails(runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const state = snap.data();
    const updatedRacks = [...state.room.racks];

    updatedRacks[0] = {
      ...updatedRacks[0],
      modelId: "rack_1001"
    };

    tx.update(ref, {
      room: { racks: updatedRacks },
      "inventory.racks.rack_1001": 1,
      updatedAt: serverTimestamp()
    });
  }));

  console.log("PASSOU: instalação bloqueada pelas regras atuais");

  console.log("TESTE 3 — Tentativa de alterar saldo sem compra");

  await assertFails(runTransaction(db, async tx => {
    const snap = await tx.get(ref);

    tx.update(ref, {
      balance: snap.data().balance + 500,
      updatedAt: serverTimestamp()
    });
  }));

  console.log("PASSOU: crédito indevido bloqueado");
  console.log("Diagnóstico concluído.");

} finally {
  await env.cleanup();
}
