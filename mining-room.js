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
                        return shelf;
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

function normalizeInventory(data) {
    const inv = data && data.inventory && typeof data.inventory === "object"
        ? data.inventory : {};

    return {
        ...inv,
        racks: inv.racks && typeof inv.racks === "object" ? inv.racks : {},
        miners: inv.miners && typeof inv.miners === "object" ? inv.miners : {}
    };
}


async function invokeRoomCallable(callable, payload) {
    if (!roomFirebaseApi || !roomReady || !roomUser) {
        throw new Error("A sala ainda não está sincronizada com o Firebase.");
    }
    if (roomBusy) {
        throw new Error("Aguarde a operação anterior terminar.");
    }

    roomBusy = true;
    try {
        const result = await callable(payload);
        return result.data;
    } finally {
        roomBusy = false;
    }
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
            installRackCallable, installMinerCallable,
            removeMinerCallable, removeRackCallable
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
    container.style.cssText = "width: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 165px; gap: 5px; padding: 0; align-content: end; justify-items: center; min-height: 510px; z-index: 2;";

    Array.from({ length: 16 }, (_, rackIndex) => {
        const rack = roomState.racks[rackIndex] || {
            id: `slot_${rackIndex + 1}`,
            modelId: null,
            shelves: [[], [], [], []],
            previewOnly: true
        };

        const rackCell = document.createElement('div');
        rackCell.style.cssText = "position: relative; width: 100%; height: 165px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; border: 1px dashed rgba(0, 242, 255, 0.12); border-radius: 6px; background: rgba(4, 6, 11, 0.2);";

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
            rackWrapper.style.cssText = "position: relative; width: 100%; max-height: 155px; aspect-ratio: 338 / 364; display: flex; justify-content: center; align-items: stretch;";

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = "position: absolute; top: -4px; right: 2px; background:#ef4444; border:none; color:#fff; width:15px; height:15px; border-radius:50%; font-size:0.55rem; font-weight:bold; cursor:pointer; z-index:10;";
            removeBtn.onclick = () => removeRack(rackIndex);
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

                shelfSlot.style.cssText = `
                    position: absolute;
                    left: 15%;
                    top: ${pos.top}%;
                    width: 70%;
                    height: ${pos.height}%;
                    transform: ${
                        s === 0 ? 'translateY(-20px)' :
                        s === 1 ? 'translateY(-15px)' :
                        s === 3 ? 'translateY(5px)' :
                        'translateY(0)'
                    };
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 2px;
                    padding: 0;
                    box-sizing: border-box;
                    overflow: visible;
                    pointer-events: auto;
                    cursor: pointer;
                `;

                shelfSlot.onclick = () => openMinerModal(rackIndex, s);

                const slotContent = rack.shelves[s] || [];

                if (slotContent.length === 0) {
                    shelfSlot.style.border = '1px dashed rgba(0,242,255,0.10)';
                    shelfSlot.style.borderRadius = '3px';
                } else {
                    slotContent.forEach((m, mIdx) => {
                        const minerMeta = catalog.miners[m.minerId];

                        if (!minerMeta || !minerMeta.asset) return;

                        const minerImg = document.createElement('img');
                        minerImg.src = minerMeta.asset;
                        minerImg.alt = minerMeta.name;
                        minerImg.title = `${minerMeta.name} (Clique para remover)`;

                        const isSquare = Number(minerMeta.size) === 1;

                        minerImg.style.cssText = `
                            display: block;
                            flex: ${isSquare ? '0 1 49%' : '1 1 100%'};
                            width: ${isSquare ? '49%' : '100%'};
                            height: 100%;
                            min-width: 0;
                            max-width: ${isSquare ? '49%' : '100%'};
                            object-fit: contain;
                            object-position: center;
                            transform: scale(1.5625);
                            cursor: pointer;
                            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9));
                        `;

                        minerImg.onclick = (e) => {
                            e.stopPropagation();
                            removeMiner(rackIndex, s, mIdx);
                        };

                        shelfSlot.appendChild(minerImg);
                    });
                }

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

window.openMinerModal = function(rackIndex, shelfIndex) {
    activeTargetRackIndex = rackIndex;
    activeTargetShelfIndex = shelfIndex;
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
        await invokeRoomCallable(roomFirebaseApi.installRackCallable, {
            slotId: `slot_${index + 1}`,
            rackId
        });

        closeModal();
        activeTargetRackIndex = null;
    } catch (error) {
        console.error(error);
        alert(error.message || "Não foi possível instalar o rack.");
    }
};

window.removeRack = async function(rackIndex) {
    if (!roomReady || !roomUser || rackRemovalBusy) return;

    const slotNumber = Number(rackIndex) + 1;
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 16) {
        alert("Posição de rack inválida.");
        return;
    }

    const slotId = `slot_${slotNumber}`;
    rackRemovalBusy = true;

    try {
        await invokeRoomCallable(roomFirebaseApi.removeRackCallable, { slotId });
        console.info("MYTRIA: rack e mineradoras devolvidos ao inventário.", slotId);
    } catch (error) {
        console.error("Erro ao retirar rack pelo backend:", error);
        alert(error.message || "Não foi possível remover o rack.");
    } finally {
        rackRemovalBusy = false;
    }
};

window.selectMiner = async function(minerId) {
    if (activeTargetRackIndex === null || activeTargetShelfIndex === null || !roomReady) return;

    const rackIndex = activeTargetRackIndex;
    const shelfIndex = activeTargetShelfIndex;
    const meta = catalog.miners[minerId];

    if (!meta) return;

    try {
        await invokeRoomCallable(roomFirebaseApi.installMinerCallable, {
            slotId: `slot_${rackIndex + 1}`,
            shelfId: `shelf_${shelfIndex + 1}`,
            minerId
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
        await invokeRoomCallable(roomFirebaseApi.removeMinerCallable, {
            slotId: `slot_${rackIndex + 1}`,
            shelfId: `shelf_${shelfIndex + 1}`,
            machineIndex
        });
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
