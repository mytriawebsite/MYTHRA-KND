/**
 * MYTRIA — Motor Data-Driven Atualizado (Porta 9092)
 * Suporte completo aos 6 novos modelos de racks fatiados (rack_1001 a rack_1006)
 * com limpeza automática de cache de inventário e loja.
 */

// ============================================
// MYTRIA — ESTADO TEMPORÁRIO DA SALA
// Nenhum estoque fictício ou persistência local.
// O estado real será carregado do Firebase.
// ============================================


// Calibração global fixa: [Y quadrada, Y retangular] por prateleira.
// Índices: rack 0-15; prateleira 0-3. Não depende de conta ou dispositivo.
const MACHINE_POSITION_Y = [
  [[-9,-7.5],[-1.5,0],[2,2.5],[2.5,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,3.5],[2,4.5]],
  [[-9,-7],[-1.5,1],[1.5,3.5],[2,4]],
  [[-9,-7.5],[-1.5,0.5],[1.5,3],[2,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,4]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,3.5]],
  [[-9,-7.5],[-1.5,0],[1.5,2.5],[2,4]],
  [[-8.5,-7.5],[-1.5,0],[1.5,2.5],[4,3.5]],
  [[-8.5,-7.5],[-1,0],[1.5,2],[2,3.5]],
  [[-8.5,-7.5],[0,0],[0,2.5],[0,3.5]],
  [[-8.5,-7.5],[-1.5,0],[1.5,2.5],[2,3.5]],
  [[-8.5,-7.5],[-1.5,0],[0.5,2.5],[2,3.5]],
  [[-8.5,-7.5],[-1.5,0],[1.5,2.5],[3.5,3.5]]
];

let catalog = {
    racks: {},
    miners: {}
};

let roomState = {
    racks: Array.from({ length: 16 }, (_, i) => ({
        id: `slot_${i + 1}`,
        modelId: null,
        shelves: [[], [], [], []]
    }))
};

let userInventory = {
    racks: {},
    miners: {},
    others: {}
};

let activeTargetRackIndex = null;
let activeTargetShelfIndex = null;
let activeTargetSide = 'left';

// Conexão e estado persistente da Sala de Mineração.
let roomFirebaseApi = null;
let roomUser = null;
let roomAuthUnsub = null;
let roomStateUnsub = null;
let roomReady = false;
let roomBusy = false;
let rackRemovalBusy = false;


function normalizeRoom(data) {
    const rawRacks = data?.room?.racks;

    let source = [];

    if (Array.isArray(rawRacks)) {
        source = rawRacks;
    } else if (rawRacks && typeof rawRacks === "object") {
        source = Object.keys(rawRacks)
            .sort((a, b) => Number(a.replace("slot_", "")) - Number(b.replace("slot_", "")))
            .map(key => rawRacks[key]);
    }

    return {
        racks: Array.from({ length: 16 }, (_, i) => {
            const old = source[i] || {};

            return {
                id: old.id || `slot_${i + 1}`,
                modelId: old.modelId || null,
                shelves: Array.from({ length: 4 }, (_, shelfIndex) => {
                    const saved = old.shelves || {};

                    const shelf = Array.isArray(saved)
                        ? saved[shelfIndex]
                        : saved[`shelf_${shelfIndex + 1}`];

                    if (Array.isArray(shelf)) {
                        return normalizeShelf(shelf);
                    }

                    if (shelf && typeof shelf === "object") {
                        return Object.keys(shelf)
                            .sort((a, b) => Number(a.replace("machine_", "")) - Number(b.replace("machine_", "")))
                            .map(key => shelf[key]);
                    }

                    return [];
                })
            };
        })
    };
}


function machineSide(machine, index) {
    if (machine?.side === "left" || machine?.side === "right") {
        return machine.side;
    }
    if (Number(catalog.miners[machine?.minerId]?.size) === 2) {
        return "both";
    }
    return index === 0 ? "left" : "right";
}

function normalizeShelf(shelf) {
    if (!Array.isArray(shelf)) return [];
    return shelf.map((machine, index) => ({
        ...machine,
        side: machineSide(machine, index)
    }));
}

function normalizeInventory(data) {
    const inv = data && data.inventory && typeof data.inventory === "object"
        ? data.inventory : {};

    return {
        ...inv,
        racks: inv.racks && typeof inv.racks === "object" ? inv.racks : {},
        miners: inv.miners && typeof inv.miners === "object" ? inv.miners : {}
    };
}




function serializeRoom(room) {
    const racks = {};
    room.racks.forEach((rack, rackIndex) => {
        const shelves = {};
        for (let shelfIndex = 0; shelfIndex < 4; shelfIndex++) {
            const machines = {};
            (rack.shelves[shelfIndex] || []).forEach((machine, machineIndex) => {
                machines[`machine_${machineIndex + 1}`] = {
                    minerId: machine.minerId,
                    side: machine.side || machineSide(machine, machineIndex)
                };
            });
            shelves[`shelf_${shelfIndex + 1}`] = machines;
        }
        racks[`slot_${rackIndex + 1}`] = {
            id: rack.id || `slot_${rackIndex + 1}`,
            modelId: rack.modelId || null,
            shelves
        };
    });
    return { racks };
}


async function commitRoomInventory(change) {
    if (!roomFirebaseApi || !roomReady || !roomUser) {
        throw new Error("A sala ainda não está sincronizada com o Firebase.");
    }
    if (roomBusy) {
        throw new Error("Aguarde a operação anterior terminar.");
    }

    roomBusy = true;
    try {
        const { db, doc, runTransaction, serverTimestamp } = roomFirebaseApi;
        const ref = doc(db, "users", roomUser.uid, "game", "state");

        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) {
                throw new Error("Documento de estado do jogador não encontrado.");
            }

            const current = snap.data();
            const room = normalizeRoom(current);
            const inventory = normalizeInventory(current);

            change(room, inventory);

            transaction.update(ref, {
                room: serializeRoom(room),
                inventory,
                updatedAt: serverTimestamp()
            });
        });
    } finally {
        roomBusy = false;
    }
}

function inventoryCount(map, id) {
    const value = Number(map[id] || 0);
    if (!Number.isInteger(value) || value < 0) {
        throw new Error("Quantidade inválida no inventário: " + id);
    }
    return value;
}

function addInventory(map, id, amount = 1) {
    map[id] = inventoryCount(map, id) + amount;
}

function getRack(room, index) {
    if (!Number.isInteger(index) || index < 0 || index >= 16) {
        throw new Error("Posição de rack inválida.");
    }
    return room.racks[index];
}

function getMinerSize(minerId) {
    const meta = catalog.miners[minerId];
    const size = Number(meta?.size);
    if (!meta || ![1, 2].includes(size)) {
        throw new Error("Modelo de mineradora inválido.");
    }
    return size;
}

async function installRackDirect(rackIndex, rackId) {
    await commitRoomInventory((room, inventory) => {
        const rack = getRack(room, rackIndex);
        if (!catalog.racks[rackId]) throw new Error("Modelo de rack inválido.");
        if (rack.modelId) throw new Error("Esse espaço já possui um rack.");
        if (inventoryCount(inventory.racks, rackId) < 1) {
            throw new Error("Rack indisponível no inventário.");
        }

        inventory.racks[rackId]--;
        rack.modelId = rackId;
        rack.shelves = [[], [], [], []];
    });
}


async function installMinerDirect(rackIndex, shelfIndex, minerId, requestedSide) {
    await commitRoomInventory((room, inventory) => {
        const rack = getRack(room, rackIndex);
        if (!rack.modelId) throw new Error("Instale um rack primeiro.");
        if (!Number.isInteger(shelfIndex) || shelfIndex < 0 || shelfIndex > 3) {
            throw new Error("Prateleira inválida.");
        }

        const size = getMinerSize(minerId);
        const shelf = normalizeShelf(rack.shelves[shelfIndex]);
        const side = requestedSide === "right" ? "right" : "left";

        if (inventoryCount(inventory.miners, minerId) < 1) {
            throw new Error("Mineradora indisponível no inventário.");
        }

        const occupied = new Set();
        shelf.forEach((machine, index) => {
            const machineSize = getMinerSize(machine.minerId);
            const machinePosition = machineSide(machine, index);
            if (machineSize === 2 || machinePosition === "both") {
                occupied.add("left");
                occupied.add("right");
            } else {
                occupied.add(machinePosition);
            }
        });

        if (size === 2) {
            if (occupied.size > 0) {
                throw new Error("A mineradora retangular precisa dos dois slots livres.");
            }
            shelf.push({ minerId, side: "both" });
        } else {
            if (occupied.has(side)) {
                throw new Error(`O slot ${side === "left" ? "esquerdo" : "direito"} já está ocupado.`);
            }
            shelf.push({ minerId, side });
        }

        rack.shelves[shelfIndex] = shelf;
        inventory.miners[minerId]--;
    });
}



async function removeMinerDirect(rackIndex, shelfIndex, machineIndex) {
    await commitRoomInventory((room, inventory) => {
        const rack = getRack(room, rackIndex);
        if (!rack.modelId) throw new Error("Não existe rack nesse espaço.");
        if (!Number.isInteger(shelfIndex) || shelfIndex < 0 || shelfIndex > 3) {
            throw new Error("Prateleira inválida.");
        }

        const shelf = normalizeShelf(rack.shelves[shelfIndex]);
        const machine = shelf[machineIndex];
        if (!machine) throw new Error("Mineradora não encontrada.");

        shelf.splice(machineIndex, 1);
        rack.shelves[shelfIndex] = shelf;
        addInventory(inventory.miners, machine.minerId);
    });
}


async function removeRackDirect(rackIndex) {
    await commitRoomInventory((room, inventory) => {
        const rack = getRack(room, rackIndex);
        if (!rack.modelId) throw new Error("Não existe rack nesse espaço.");

        addInventory(inventory.racks, rack.modelId);

        for (const shelf of rack.shelves) {
            for (const machine of shelf) {
                addInventory(inventory.miners, machine.minerId);
            }
        }

        rack.modelId = null;
        rack.shelves = [[], [], [], []];
    });
}

async function initMiningEngine() {
    try {
        const [racksRes, minersRes] = await Promise.all([
            fetch('items-racks.json'),
            fetch('items-miners.json')
        ]);

        if (!racksRes.ok || !minersRes.ok) {
            throw new Error("Não foi possível carregar os catálogos.");
        }

        catalog.racks = (await racksRes.json()).items || {};
        catalog.miners = (await minersRes.json()).items || {};

        injectRollerCoinTopBar();
        injectRollerCoinModalStyles();

        roomFirebaseApi = await import("./firebase.js");
        const {
            auth, onAuthStateChanged, db, doc, onSnapshot,
            runTransaction, serverTimestamp
        } = roomFirebaseApi;

        roomAuthUnsub = onAuthStateChanged(auth, (user) => {
            roomReady = false;
            roomUser = user || null;

            if (roomStateUnsub) {
                roomStateUnsub();
                roomStateUnsub = null;
            }

            if (!user) {
                userInventory = { racks: {}, miners: {}, others: {} };
                roomState = normalizeRoom({});
                renderMiningRoom();
                console.warn("MYTRIA: aguardando autenticação do jogador.");
                return;
            }

            const stateRef = doc(db, "users", user.uid, "game", "state");

            roomStateUnsub = onSnapshot(stateRef, (snapshot) => {
                if (!snapshot.exists()) {
                    roomReady = false;
                    console.error("MYTRIA: documento game/state não encontrado.");
                    return;
                }

                const data = snapshot.data();
                roomState = normalizeRoom(data);
                userInventory = normalizeInventory(data);
                roomReady = true;
                renderMiningRoom();
            }, (error) => {
                roomReady = false;
                console.error("Erro ao sincronizar Sala de Mineração:", error);
            });
        });
    } catch (error) {
        console.error("Erro ao iniciar Sala de Mineração:", error);
        alert("Não foi possível conectar a Sala de Mineração ao Firebase. Consulte o console.");
    }
}

function injectRollerCoinModalStyles() {
    if (document.getElementById('rollercoin-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'rollercoin-modal-style';
    style.innerHTML = `
        #mytria-fullscreen-modal {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(4, 6, 11, 0.9);
            backdrop-filter: blur(4px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .rc-modal-content {
            background: #080e1d;
            border: 2px solid var(--accent-cyan, #00f2ff);
            border-radius: 14px;
            width: 100%;
            max-width: 440px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0, 242, 255, 0.25);
            overflow: hidden;
        }
        .rc-modal-header {
            padding: 14px 16px;
            background: #0f172a;
            border-bottom: 1px solid #1e293b;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .rc-modal-title {
            font-size: 0.9rem;
            font-weight: bold;
            color: var(--accent-cyan, #00f2ff);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .rc-modal-close {
            background: #ef4444;
            border: none;
            color: #fff;
            width: 26px; height: 26px;
            border-radius: 50%;
            font-size: 0.9rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .rc-modal-body {
            padding: 14px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(85vh - 60px);
        }
        .rc-item-row {
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .mytria-slot-target:focus-visible {
    outline:2px solid #fff;
    outline-offset:-2px;
}
.rc-item-row:hover {
            border-color: var(--accent-cyan, #00f2ff);
            background: #162032;
        }
        .rc-item-img-box {
            width: 60px; height: 60px;
            background: #04060b;
            border: 1px solid #334155;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
        }
        .rc-item-img-box img {
            max-height: 50px;
            max-width: 55px;
            object-fit: contain;
        }
        .rc-item-info { flex: 1; min-width: 0; }
        .rc-item-name { font-size: 0.8rem; font-weight: bold; color: #fff; margin-bottom: 3px; }
        .rc-item-sub { font-size: 0.7rem; color: #94a3b8; }
        .rc-item-qty { font-size: 0.75rem; font-weight: bold; color: #84cc16; background: #04060b; padding: 4px 8px; border-radius: 6px; border: 1px solid #1e293b; }
    `;
    document.head.appendChild(style);
}

function renderMiningRoom() {
    const container = document.getElementById('roomContent');
    if (!container) return;

    container.innerHTML = '';
    container.style.cssText = "width: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(4, auto); grid-auto-rows: auto; column-gap: 5px; row-gap: 5px; padding-left: 1px; padding-top: 101px; align-content: start; justify-items: center; min-height: 510px; z-index: 2;";

    Array.from({ length: 16 }, (_, rackIndex) => {
        const rack = roomState.racks[rackIndex] || {
            id: `slot_${rackIndex + 1}`,
            modelId: null,
            shelves: [[], [], [], []],
            previewOnly: true
        };

        const rackCell = document.createElement('div');
            rackCell.dataset.rackIndex = rackIndex;
        rackCell.style.cssText = "position: relative; width: 100%; height: auto; aspect-ratio: 313 / 346; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; border: 1px dashed rgba(0, 242, 255, 0.12); border-radius: 6px; background: rgba(4, 6, 11, 0.2);";

        if (!rack.modelId || !catalog.racks[rack.modelId]) {
            rackCell.innerHTML = `
                <div style="position: absolute; top: 4px; left: 6px; font-size: 0.55rem; color: #94a3b8;">#${rackIndex + 1}</div>
                ${rack.previewOnly
                    ? '<div style="margin:auto; font-size:0.58rem; color:#64748b; text-align:center;">EXPANSÃO<br>EM TESTE</div>'
                    : `<button onclick="openRackModal(${rackIndex})" style="background: rgba(0, 242, 255, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 4px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: bold; cursor: pointer; margin: auto;">+ Rack</button>`}
            `;
        } else {
            const rackMeta = catalog.racks[rack.modelId];
            const rackWrapper = document.createElement('div');
            rackWrapper.style.cssText = "position: relative; width: 100%; height: 100%; max-height: none; aspect-ratio: 313 / 346; display: flex; justify-content: center; align-items: stretch;";

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = "position: absolute; top: -4px; right: 2px; background:#ef4444; border:none; color:#fff; width:15px; height:15px; border-radius:50%; font-size:0.55rem; font-weight:bold; cursor:pointer; z-index:10;";
            removeBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                window.removeRack(rackIndex);
            };
            rackWrapper.appendChild(removeBtn);

            const rackImg = document.createElement('img');
            rackImg.src = rackMeta.asset;
            rackImg.alt = rackMeta.name;
            rackImg.style.cssText = "width: 100%; height: 100%; object-fit: contain; display: block;";
            rackWrapper.appendChild(rackImg);

            // Área de encaixe proporcional à imagem do rack.
            const shelvesOverlay = document.createElement('div');
            shelvesOverlay.style.cssText = `
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;

            // Quatro aberturas identificadas no rack de referência.
            const slotPositions = [
                { top: 7, height: 14 },
                { top: 25, height: 14 },
                { top: 48, height: 14 },
                { top: 72, height: 14 }
            ];


            slotPositions.forEach((pos, s) => {
                const shelfSlot = document.createElement('div');
                shelfSlot.classList.add('mytria-shelf-slot');
                shelfSlot.dataset.shelfIndex = s;
                shelfSlot.style.cssText = `
                    position:absolute;
                    left:15%;
                    top:${pos.top}%;
                    width:70%;
                    height:${pos.height}%;
                    display:flex;
                    align-items:stretch;
                    justify-content:stretch;
                    padding:0;
                    box-sizing:border-box;
                    overflow:visible;
                    pointer-events:none;
                `;

                const slotContent = normalizeShelf(rack.shelves[s] || []);
                const occupied = { left: false, right: false };

                slotContent.forEach((machine, index) => {
                    const size = getMinerSize(machine.minerId);
                    const side = size === 2 ? "both" : machineSide(machine, index);
                    if (side === "both") {
                        occupied.left = true;
                        occupied.right = true;
                    } else {
                        occupied[side] = true;
                    }
                });

                ["left", "right"].forEach(side => {
                    const target = document.createElement("button");
                    target.type = "button";
                    target.className = `mytria-slot-target mytria-slot-${side}`;
                    target.textContent = side === "left" ? "E" : "D";
                    target.title = `Selecionar slot ${side === "left" ? "esquerdo" : "direito"}`;
                    target.disabled = occupied[side];
                    target.style.cssText = `
                        position:absolute;
                        ${side}:0;
                        top:0;
                        width:50%;
                        height:100%;
                        padding:0;
                        border:1px dashed rgba(0,242,255,.48);
                        border-radius:3px;
                        background:${occupied[side] ? "rgba(100,116,139,.12)" : "rgba(0,242,255,.055)"};
                        color:rgba(125,211,252,.75);
                        font-size:8px;
                        font-weight:bold;
                        pointer-events:auto;
                        cursor:${occupied[side] ? "not-allowed" : "pointer"};
                        z-index:1;
                    `;
                    target.onclick = event => {
                        event.stopPropagation();
                        if (!occupied[side]) openMinerModal(rackIndex, s, side);
                    };
                    shelfSlot.appendChild(target);
                });

                slotContent.forEach((machine, machineIndex) => {
                    const minerMeta = catalog.miners[machine.minerId];
                    if (!minerMeta || !minerMeta.asset) return;

                    const isSquare = Number(minerMeta.size) === 1;
                    const side = isSquare ? machineSide(machine, machineIndex) : "both";
                    const minerImg = document.createElement("img");
                    minerImg.src = minerMeta.asset;
                    minerImg.alt = minerMeta.name;
                    minerImg.title = `${minerMeta.name} (Clique para remover)`;
                    minerImg.classList.add("mytria-miner");
                    minerImg.dataset.minerType = isSquare ? "square" : "rect";
                    minerImg.dataset.minerSide = side === "right" ? "1" : "0";
                    minerImg.dataset.shelfIndex = s;
                    minerImg.dataset.rackIndex = rackIndex;
                    minerImg.dataset.minerId = machine.minerId;

                    minerImg.style.cssText = `
                        position:absolute;
                        left:${side === "right" ? "50%" : "0"};
                        bottom:0;
                        display:block;
                        width:${isSquare ? "50%" : "100%"};
                        height:100%;
                        min-width:0;
                        max-width:${isSquare ? "50%" : "100%"};
                        object-fit:contain;
                        object-position:center bottom;
                        transform:none;
                        transform-origin:center bottom;
                        cursor:pointer;
                        pointer-events:auto;
                        z-index:3;
                        filter:drop-shadow(0 1px 2px rgba(0,0,0,.9));
                    `;

                    const calibratedY = MACHINE_POSITION_Y[rackIndex]?.[s]?.[isSquare ? 0 : 1] ?? 0;
            minerImg.style.transform = `translateY(${calibratedY}px) scale(1.5625)`;
                    minerImg.onclick = event => {
                        event.stopPropagation();

                        window.removeMiner(rackIndex, s, machineIndex);
                    };

                    shelfSlot.appendChild(minerImg);
                });

                shelvesOverlay.appendChild(shelfSlot);
            });

            rackWrapper.appendChild(shelvesOverlay);
            rackCell.appendChild(rackWrapper);
        }
        container.appendChild(rackCell);
    });

}

function injectRollerCoinTopBar() {
    const roomHeaderExternal = document.querySelector('.room-header-external');
    if (!roomHeaderExternal || document.getElementById('rollercoin-top-bar')) return;

    const topBar = document.createElement('div');
    topBar.id = 'rollercoin-top-bar';
    topBar.style.cssText = "display: flex; justify-content: space-around; align-items: center; background: #080e1d; border: 1px solid var(--border-color); padding: 10px; border-radius: 12px; margin-bottom: 8px;";
    topBar.innerHTML = `
        <button onclick="openGlobalModal('racks')" style="background:#101c38; border:1px solid #1e293b; color:#38bdf8; padding:8px 10px; border-radius:8px; font-size:0.75rem; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; max-width:85px;">
            <i class="fa-solid fa-layer-group" style="font-size:1rem;"></i> Racks
        </button>
        <button onclick="openGlobalModal('miners')" style="background:#101c38; border:1px solid #1e293b; color:#38bdf8; padding:8px 10px; border-radius:8px; font-size:0.75rem; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; max-width:85px;">
            <i class="fa-solid fa-server" style="font-size:1rem;"></i> Mineradoras
        </button>
        <button onclick="openGlobalModal('others')" style="background:#101c38; border:1px solid #1e293b; color:#38bdf8; padding:8px 10px; border-radius:8px; font-size:0.75rem; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; max-width:85px;">
            <i class="fa-solid fa-box-archive" style="font-size:1rem;"></i> Outros
        </button>
        <button onclick="openGearQuickPanel()" style="background:rgba(0, 242, 255, 0.15); border:1px solid var(--accent-cyan); color:var(--accent-cyan); padding:8px 10px; border-radius:8px; font-size:0.75rem; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; max-width:85px;" title="Configurações">
            <i class="fa-solid fa-gear" style="font-size:1rem;"></i> Config
        </button>
    `;
    roomHeaderExternal.insertAdjacentElement('afterend', topBar);

    if (!document.getElementById('mytria-fullscreen-modal')) {
        const fullModal = document.createElement('div');
        fullModal.id = 'mytria-fullscreen-modal';
        fullModal.innerHTML = `
            <div class="rc-modal-content">
                <div class="rc-modal-header">
                    <div id="full-modal-title" class="rc-modal-title">INVENTÁRIO</div>
                    <button class="rc-modal-close" onclick="closeModal()">×</button>
                </div>
                <div id="full-modal-body" class="rc-modal-body"></div>
            </div>
        `;
        document.body.appendChild(fullModal);
    }
}

function closeModal() {
    const modal = document.getElementById('mytria-fullscreen-modal');
    if (modal) modal.style.display = 'none';
}

window.openRackModal = function(rackIndex) {
    activeTargetRackIndex = rackIndex;
    openGlobalModal('racks', true);
};

window.openMinerModal = function(rackIndex, shelfIndex, side = "left") {
    activeTargetRackIndex = rackIndex;
    activeTargetShelfIndex = shelfIndex;
    activeTargetSide = side === "right" ? "right" : "left";
    openGlobalModal('miners', true);
};

window.openGlobalModal = function(category, isPlacement = false) {
    const modal = document.getElementById('mytria-fullscreen-modal');
    const titleEl = document.getElementById('full-modal-title');
    const bodyEl = document.getElementById('full-modal-body');

    if (!modal || !titleEl || !bodyEl) return;
    if (!roomReady) {
        alert("Aguarde a sincronização do inventário com o Firebase.");
        return;
    }

    modal.style.display = 'flex';
    let html = '';

    if (category === 'racks') {
        titleEl.innerHTML = `<i class="fa-solid fa-layer-group"></i> INVENTÁRIO: RACKS`;

        Object.entries(catalog.racks).forEach(([rackId, meta]) => {
            const qty = Number(userInventory.racks[rackId] || 0);
            if (qty <= 0) return;

            html += `
                <div class="rc-item-row" ${isPlacement ? `onclick="selectRack('${rackId}')"` : ''}>
                    <div class="rc-item-img-box"><img src="${meta.asset || ''}" alt="${meta.name || rackId}"></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${meta.name || rackId}</div>
                        <div class="rc-item-sub">Estante Oficial Mytria</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>`;
        });
    } else if (category === 'miners') {
        titleEl.innerHTML = `<i class="fa-solid fa-server"></i> INVENTÁRIO: MINERADORAS`;

        Object.entries(catalog.miners).forEach(([minerId, meta]) => {
            const qty = Number(userInventory.miners[minerId] || 0);
            if (qty <= 0) return;

            html += `
                <div class="rc-item-row" ${isPlacement ? `onclick="selectMiner('${minerId}')"` : ''}>
                    <div class="rc-item-img-box"><img src="${meta.asset || ''}" alt="${meta.name || minerId}"></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${meta.name || minerId}</div>
                        <div class="rc-item-sub">${meta.hashPower || 'Mineradora'} | Tamanho: ${meta.size} Slot(s)</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>`;
        });
    } else if (category === 'others') {
        titleEl.innerHTML = `<i class="fa-solid fa-box-archive"></i> INVENTÁRIO: OUTROS ITENS`;

        Object.entries(userInventory.others || {}).forEach(([itemKey, qty]) => {
            if (Number(qty) <= 0) return;
            html += `
                <div class="rc-item-row">
                    <div class="rc-item-img-box"><i class="fa-solid fa-battery-full" style="color:#38bdf8; font-size:1.5rem;"></i></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${itemKey.toUpperCase()}</div>
                        <div class="rc-item-sub">Item de Utilidade</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>`;
        });
    }

    bodyEl.innerHTML = html || '<div style="text-align:center; color:#94a3b8; padding:20px;">Nenhum item disponível no inventário.</div>';
};


window.selectRack = async function(rackId) {
    if (activeTargetRackIndex === null || !roomReady) return;

    const rackMeta = catalog.racks[rackId];
    if (!rackMeta || !rackMeta.asset) {
        alert("A imagem deste modelo de rack ainda não está na pasta assets/racks.");
        return;
    }

    const index = activeTargetRackIndex;
    try {
        await installRackDirect(index, rackId);
        closeModal();
        activeTargetRackIndex = null;
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível instalar o rack.");
    }
};

window.removeRack = async function(rackIndex) {
    if (!roomReady || !roomUser || rackRemovalBusy) return;

    rackRemovalBusy = true;
    try {
        await removeRackDirect(Number(rackIndex));
        console.info("MYTRIA: rack e mineradoras devolvidos ao inventário.");
    } catch (error) {
        console.error("Erro ao retirar rack:", error);
        alert(error.message || "Não foi possível remover o rack.");
    } finally {
        rackRemovalBusy = false;
    }
};

window.selectMiner = async function(minerId) {
    if (activeTargetRackIndex === null ||
        activeTargetShelfIndex === null || !roomReady) return;

    const rackIndex = activeTargetRackIndex;
    const shelfIndex = activeTargetShelfIndex;

    if (!catalog.miners[minerId]) return;

    try {
        await installMinerDirect(rackIndex, shelfIndex, minerId, activeTargetSide);
        closeModal();
        activeTargetRackIndex = null;
        activeTargetShelfIndex = null;
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível instalar a mineradora.");
    }
};

window.removeMiner = async function(rackIndex, shelfIndex, machineIndex) {
    if (!roomReady) return;

    try {
        await removeMinerDirect(
            Number(rackIndex),
            Number(shelfIndex),
            Number(machineIndex)
        );
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível remover a mineradora.");
    }
};

window.openGearQuickPanel = function() {
    const modal = document.getElementById('mytria-fullscreen-modal');
    modal.style.display = 'flex';
    document.getElementById('full-modal-title').innerHTML = `<i class="fa-solid fa-gear"></i> CONFIGURAÇÕES DA SALA`;

    let html = `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:8px;">Grade 4x4 (16 posições disponíveis):</div>`;
    roomState.racks.forEach((rack, idx) => {
        const meta = catalog.racks[rack.modelId];
        html += `
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:bold;">Posição ${idx + 1}</div>
                    <div style="font-size:0.7rem; color:#fff;">${meta ? meta.name : 'Espaço Vazio'}</div>
                </div>
                <div style="font-size:0.7rem; color:var(--accent-green);">${rack.modelId ? 'Ativo' : 'Disponível'}</div>
            </div>
        `;
    });
    document.getElementById('full-modal-body').innerHTML = html;
};

document.addEventListener('DOMContentLoaded', () => {
    initMiningEngine();
});
