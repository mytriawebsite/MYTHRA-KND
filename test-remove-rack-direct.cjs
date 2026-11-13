process.env.GCLOUD_PROJECT = "demo-mytria02";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";

const assert = require("node:assert/strict");

// Carrega a função e o Admin SDK somente depois de apontar para o emulador.
const functions = require("./functions/index.js");
const {createRequire}=require("node:module"); const functionsRequire=createRequire(require.resolve("./functions/package.json")); const {getFirestore}=functionsRequire("firebase-admin/firestore");

const db = getFirestore();
const uid = `teste_remove_rack_${Date.now()}`;
const stateRef = db.doc(`users/${uid}/game/state`);

async function main() {
  console.log("PROJETO:", process.env.GCLOUD_PROJECT);
  console.log("FIRESTORE:", process.env.FIRESTORE_EMULATOR_HOST);
  console.log("JOGADOR DE TESTE:", uid);

  const initialState = {
    balance: 12345,
    inventory: {
      racks: {
        rack_1001: 0
      },
      miners: {
        miner_2001: 1,
        miner_2002: 0,
        miner_2003: 2,
        miner_2004: 0
      }
    },
    room: {
      racks: {
        slot_1: {
          id: "slot_1",
          modelId: "rack_1001",
          shelves: {
            shelf_1: {
              machine_1: {minerId: "miner_2001"},
              machine_2: {minerId: "miner_2003"}
            },
            shelf_2: {
              machine_1: {minerId: "miner_2001"}
            },
            shelf_3: {
              machine_2: {minerId: "miner_2003"}
            },
            shelf_4: {
              machine_1: {minerId: "miner_2002"}
            }
          }
        }
      }
    }
  };

  try {
    await stateRef.set(initialState);
    console.log("PASSOU — Criar jogador e rack ocupado no emulador");

    const before = (await stateRef.get()).data();
    const result = await functions.removeRack.run({
      auth: {uid},
      data: {slotId: "slot_1"}
    });

    assert.equal(result.success, true);
    console.log("PASSOU — Executar removeRack");

    const after = (await stateRef.get()).data();

    assert.equal(after.balance, before.balance);
    console.log("PASSOU — Saldo permaneceu em 12345");

    assert.equal(after.inventory.racks.rack_1001, 1);
    console.log("PASSOU — Rack devolvido ao inventário");

    assert.equal(after.inventory.miners.miner_2001, 3);
    assert.equal(after.inventory.miners.miner_2002, 1);
    assert.equal(after.inventory.miners.miner_2003, 4);
    assert.equal(after.inventory.miners.miner_2004, 0);
    console.log("PASSOU — Todas as mineradoras devolvidas nas quantidades corretas");

    const rack = after.room.racks.slot_1;
    assert.equal(rack.modelId, null);
    assert.deepEqual(rack.shelves, {
      shelf_1: {},
      shelf_2: {},
      shelf_3: {},
      shelf_4: {}
    });
    console.log("PASSOU — Posição liberada e quatro prateleiras vazias");

    let duplicateRejected = false;
    try {
      await functions.removeRack.run({
        auth: {uid},
        data: {slotId: "slot_1"}
      });
    } catch (error) {
      duplicateRejected = true;
    }

    assert.equal(duplicateRejected, true);
    const finalState = (await stateRef.get()).data();

    assert.equal(finalState.balance, 12345);
    assert.equal(finalState.inventory.racks.rack_1001, 1);
    assert.equal(finalState.inventory.miners.miner_2001, 3);
    assert.equal(finalState.inventory.miners.miner_2002, 1);
    assert.equal(finalState.inventory.miners.miner_2003, 4);
    console.log("PASSOU — Segunda retirada bloqueada, sem duplicação");

    console.log("\nTODOS OS TESTES DIRETOS DA RETIRADA PASSARAM.");
    console.log("Saldo final:", finalState.balance);
    console.log("Inventário final:", JSON.stringify(finalState.inventory, null, 2));
  } finally {
    await stateRef.delete();
    console.log("\nDocumento fictício removido do emulador.");
  }
}

main().catch((error) => {
  console.error("\nTESTE FALHOU:", error);
  process.exitCode = 1;
});
