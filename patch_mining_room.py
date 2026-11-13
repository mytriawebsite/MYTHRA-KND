from pathlib import Path
import re
import shutil
from datetime import datetime

file = Path("mining-room.js")
src = file.read_text(encoding="utf-8")

# Confere se estamos trabalhando na versão esperada.
required = [
    "async function initMiningEngine()",
    "function injectRollerCoinModalStyles()",
    "function renderMiningRoom()",
    "window.openGlobalModal = function(category, isPlacement = false)",
    "window.openGearQuickPanel = function()"
]
for marker in required:
    if marker not in src:
        raise SystemExit(f"ABORTADO: marcador não encontrado: {marker}")

if "roomFirebaseApi" in src or "commitRoomInventory" in src:
    raise SystemExit("ABORTADO: o patch parece já ter sido aplicado.")

# Backup adicional, sem sobrescrever os backups existentes.
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = Path(f"mining-room.js.before_patch_{stamp}")
shutil.copy2(file, backup)

# Estado da conexão Firebase.
anchor = "let activeTargetShelfIndex = null;"
extra = r"""

// Conexão e estado persistente da Sala de Mineração.
let roomFirebaseApi = null;
let roomUser = null;
let roomAuthUnsub = null;
let roomStateUnsub = null;
let roomReady = false;
let roomBusy = false;

function normalizeRoom(data) {
    const source = data && data.room && Array.isArray(data.room.racks)
        ? data.room.racks : [];

    return {
        racks: Array.from({ length: 16 }, (_, i) => {
            const old = source[i] || {};
            return {
                id: old.id || `slot_${i + 1}`,
                modelId: old.modelId || null,
                shelves: Array.from({ length: 4 }, (_, s) =>
                    Array.isArray(old.shelves && old.shelves[s])
                        ? old.shelves[s] : []
                )
            };
        })
    };
}

function normalizeInventory(data) {
    const inv = data && data.inventory ? data.inventory : {};
    return {
        racks: inv.racks && typeof inv.racks === "object" ? inv.racks : {},
        miners: inv.miners && typeof inv.miners === "object" ? inv.miners : {},
        others: inv.others && typeof inv.others === "object" ? inv.others : {}
    };
}

async function commitRoomInventory(change) {
    if (!roomFirebaseApi || !roomUser || !roomReady) {
        throw new Error("A sala ainda não está sincronizada com o Firebase.");
    }
    if (roomBusy) throw new Error("Aguarde a operação anterior terminar.");

    roomBusy = true;
    try {
        const {
            db, doc, runTransaction, serverTimestamp
        } = roomFirebaseApi;

        const ref = doc(db, "users", roomUser.uid, "game", "state");

        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) {
                throw new Error("Documento de estado do jogador não encontrado.");
            }

            const current = snap.data();
            const room = normalizeRoom(current);
            const inventory = normalizeInventory(current);

            // A alteração é validada novamente dentro da transação.
            change(room, inventory);

            transaction.update(ref, {
                room,
                inventory,
                updatedAt: serverTimestamp()
            });
        });
    } finally {
        roomBusy = false;
    }
}
"""
if src.count(anchor) != 1:
    raise SystemExit("ABORTADO: não foi possível localizar o ponto único do estado.")
src = src.replace(anchor, anchor + extra, 1)

# Substitui somente a inicialização; a renderização e os estilos ficam intactos.
new_init = r"""async function initMiningEngine() {
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
        const { auth, onAuthStateChanged, db, doc, onSnapshot } = roomFirebaseApi;

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
}"""

pattern = re.compile(
    r"async function initMiningEngine\(\)\s*\{.*?\n\}\s*\n\s*function injectRollerCoinModalStyles\(\)",
    re.S
)
src, count = pattern.subn(new_init + "\n\nfunction injectRollerCoinModalStyles()", src, count=1)
if count != 1:
    raise SystemExit("ABORTADO: não foi possível substituir initMiningEngine.")

# Substitui as operações de inventário, sem tocar na renderização.
start = src.find("window.openGlobalModal = function(category, isPlacement = false)")
end = src.find("window.openGearQuickPanel = function()", start)
if start < 0 or end < 0:
    raise SystemExit("ABORTADO: limites das funções de inventário não encontrados.")

new_inventory_functions = r"""window.openGlobalModal = function(category, isPlacement = false) {
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
        await commitRoomInventory((room, inventory) => {
            const rack = room.racks[index];
            if (!rack || rack.modelId) throw new Error("Esta posição já possui um rack.");
            if (Number(inventory.racks[rackId] || 0) <= 0) {
                throw new Error("Estante esgotada no inventário.");
            }

            inventory.racks[rackId] = Number(inventory.racks[rackId]) - 1;
            rack.modelId = rackId;
            rack.shelves = [[], [], [], []];
        });

        closeModal();
        activeTargetRackIndex = null;
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível instalar o rack.");
    }
};

window.removeRack = async function(rackIndex) {
    if (!roomReady) return;

    try {
        await commitRoomInventory((room, inventory) => {
            const rack = room.racks[rackIndex];
            if (!rack || !rack.modelId) throw new Error("Não há rack instalado nesta posição.");

            const rackId = rack.modelId;
            inventory.racks[rackId] = Number(inventory.racks[rackId] || 0) + 1;

            (rack.shelves || []).forEach((shelf) => {
                (shelf || []).forEach((miner) => {
                    if (!miner || !miner.minerId) return;
                    inventory.miners[miner.minerId] =
                        Number(inventory.miners[miner.minerId] || 0) + 1;
                });
            });

            rack.modelId = null;
            rack.shelves = [[], [], [], []];
        });
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível remover o rack.");
    }
};

window.selectMiner = async function(minerId) {
    if (activeTargetRackIndex === null || activeTargetShelfIndex === null || !roomReady) return;

    const rackIndex = activeTargetRackIndex;
    const shelfIndex = activeTargetShelfIndex;
    const meta = catalog.miners[minerId];

    if (!meta) return;

    try {
        await commitRoomInventory((room, inventory) => {
            const rack = room.racks[rackIndex];
            if (!rack || !rack.modelId) throw new Error("Instale um rack antes de colocar mineradoras.");

            const size = Number(meta.size);
            if (size !== 1 && size !== 2) throw new Error("Tamanho de mineradora inválido.");

            if (Number(inventory.miners[minerId] || 0) <= 0) {
                throw new Error("Sem unidades desta máquina no inventário.");
            }

            const shelf = rack.shelves[shelfIndex];
            if (!Array.isArray(shelf)) throw new Error("Prateleira inválida.");

            if (size === 2 && shelf.length !== 0) {
                throw new Error("Esta prateleira precisa estar vazia para uma máquina grande de 2 slots.");
            }

            if (size === 1) {
                if (shelf.length >= 2) throw new Error("Prateleira cheia (máx. 2 máquinas de 1 slot).");
                if (shelf.some(item => Number(catalog.miners[item.minerId]?.size) === 2)) {
                    throw new Error("Prateleira ocupada por uma máquina grande.");
                }
            }

            inventory.miners[minerId] = Number(inventory.miners[minerId]) - 1;
            shelf.push({ minerId });
        });

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
        await commitRoomInventory((room, inventory) => {
            const rack = room.racks[rackIndex];
            const shelf = rack && rack.shelves[shelfIndex];
            if (!Array.isArray(shelf) || !shelf[machineIndex]) {
                throw new Error("Mineradora não encontrada nesta prateleira.");
            }

            const removed = shelf.splice(machineIndex, 1)[0];
            inventory.miners[removed.minerId] =
                Number(inventory.miners[removed.minerId] || 0) + 1;
        });
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível remover a mineradora.");
    }
};

"""
src = src[:start] + new_inventory_functions + src[end:]

# Salva somente depois de todas as verificações.
file.write_text(src, encoding="utf-8")
print("PATCH APLICADO.")
print(f"Backup criado: {backup}")
print("A renderização e os estilos existentes foram preservados.")
