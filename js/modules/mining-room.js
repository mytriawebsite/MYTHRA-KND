/**
 * MYTRIA — Motor Data-Driven (Mapeamento correto de 2 slots por prateleira)
 */

const ROOM_STORAGE_KEY = 'mytria_room_state_v10';

let catalog = {
    racks: {}, miners: {}
};

function loadRoomState() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(ROOM_STORAGE_KEY));
    } catch (error) {
        console.warn("Estado anterior da sala inválido.", error);
    }

    if (!saved || !Array.isArray(saved.racks)) {
        saved = {
            racks: Array.from({ length: 16 }, (_, i) => ({
                id: `slot_${i + 1}`,
                modelId: null,
                shelves: [[], [], [], []]
            }))
        };
    }

    while (saved.racks.length < 9) {
        const i = saved.racks.length;
        saved.racks.push({
            id: `slot_${i + 1}`,
            modelId: null,
            shelves: [[], [], [], []]
        });
    }

    saved.racks.forEach((rack, i) => {
        if (!Array.isArray(rack.shelves)) rack.shelves = [];
        while (rack.shelves.length < 4) rack.shelves.push([]);
        rack.shelves = rack.shelves.slice(0, 4);
        rack.shelves = rack.shelves.map(shelf => {
            if (!Array.isArray(shelf)) return [null, null];
            while (shelf.length < 2) shelf.push(null);
            return shelf.slice(0, 2);
        });
        if (!rack.id) rack.id = `slot_${i + 1}`;
        if (rack.modelId === undefined) rack.modelId = null;
    });

    return saved;
}

let roomState = loadRoomState();

const INV_STORAGE_KEY = 'mytria_inventory_state_v3';
const TEST_STOCK = {
    racks: { rack_1001: 5, rack_1002: 5, rack_1003: 5, rack_1004: 5, rack_1005: 5, rack_1006: 5 },
    miners: { miner_2001: 5, miner_2002: 5, miner_2003: 5, miner_2004: 5 }
};

function loadTestInventory() {
    let current = {};
    try {
        current = JSON.parse(localStorage.getItem(INV_STORAGE_KEY)) || {};
    } catch (e) {
        console.warn("Inventário anterior inválido.", e);
    }
    current.racks = current.racks || {};
    current.miners = current.miners || {};
    current.others = current.others || {};

    for (const [id, qty] of Object.entries(TEST_STOCK.racks)) {
        current.racks[id] = Math.max(Number(current.racks[id]) || 0, qty);
    }
    for (const [id, qty] of Object.entries(TEST_STOCK.miners)) {
        current.miners[id] = Math.max(Number(current.miners[id]) || 0, qty);
    }
    localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(current));
    return current;
}

let userInventory = loadTestInventory();

function saveState() {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(roomState));
    localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(userInventory));
}

let activeTargetRackIndex = null;
let activeTargetShelfIndex = null;

async function initMiningEngine() {
    try {
        const [racksRes, minersRes] = await Promise.all([
            fetch('items-racks.json'),
            fetch('items-miners.json')
        ]);
        catalog.racks = (await racksRes.json()).items || {};
        catalog.miners = (await minersRes.json()).items || {};
    } catch (e) {
        console.error("Erro ao carregar catálogos JSON:", e);
    }
    renderMiningRoom();
    injectRollerCoinTopBar();
    injectRollerCoinModalStyles();
}

function injectRollerCoinModalStyles() {
    if (document.getElementById('rollercoin-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'rollercoin-modal-style';
    style.innerHTML = `
        #mytria-fullscreen-modal {
            display: none; position: fixed; top: 0; left: 0;
            width: 100vw; height: 100vh; background: rgba(4, 6, 11, 0.9);
            backdrop-filter: blur(4px); z-index: 99999;
            align-items: center; justify-content: center; padding: 16px;
        }
        .rc-modal-content {
            background: #080e1d; border: 2px solid var(--accent-cyan, #00f2ff);
            border-radius: 14px; width: 100%; max-width: 440px; max-height: 85vh;
            display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0, 242, 255, 0.25); overflow: hidden;
        }
        .rc-modal-header { padding: 14px 16px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        .rc-modal-title { font-size: 0.9rem; font-weight: bold; color: var(--accent-cyan, #00f2ff); display: flex; align-items: center; gap: 8px; }
        .rc-modal-close { background: #ef4444; border: none; color: #fff; width: 26px; height: 26px; border-radius: 50%; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .rc-modal-body { padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; max-height: calc(85vh - 60px); }
        .rc-item-row { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; }
        .rc-item-row:hover { border-color: var(--accent-cyan, #00f2ff); background: #162032; }
        .rc-item-img-box { width: 60px; height: 60px; background: #04060b; border: 1px solid #334155; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
        .rc-item-img-box img { max-height: 50px; max-width: 55px; object-fit: contain; }
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
    container.style.cssText = "width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: 165px; gap: 5px; padding: 0; align-content: end; justify-items: center; min-height: 510px; z-index: 2;";

    let slotXOffsets = [0, -4];
    try {
        let tempX = localStorage.getItem('mytria_slot_x_offsets');
        if (tempX) slotXOffsets = JSON.parse(tempX);
    } catch(e) {}

    roomState.racks.forEach((rack, rackIndex) => {
        const rackCell = document.createElement('div');
        rackCell.style.cssText = "position: relative; width: 100%; height: 165px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; border: 1px dashed rgba(0, 242, 255, 0.12); border-radius: 6px; background: rgba(4, 6, 11, 0.2);";

        if (!rack.modelId || !catalog.racks[rack.modelId]) {
            rackCell.innerHTML = `
                <div style="position: absolute; top: 4px; left: 6px; font-size: 0.55rem; color: #94a3b8;">#${rackIndex + 1}</div>
                <button onclick="openRackModal(${rackIndex})" style="background: rgba(0, 242, 255, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 4px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: bold; cursor: pointer; margin: auto;">+ Rack</button>
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

            const shelvesOverlay = document.createElement('div');
            shelvesOverlay.style.cssText = `
                position: absolute;
                top: 13%;
                bottom: 10%;
                left: 12%;
                right: 12%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                pointer-events: none;
            `;

            for (let level = 0; level < 4; level++) {
                const row = document.createElement('div');
                row.className = `shelf-row-${level + 1}`;
                row.style.cssText = `
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    align-items: center;
                    gap: 2px;
                    position: relative;
                    min-height: 0;
                    height: 18%;
                    pointer-events: auto;
                    cursor: pointer;
                `;
                row.onclick = () => openMinerModal(rackIndex, level);

                const slots = rack.shelves[level] || [null, null];

                // Verifica se há máquina retangular (size 2 / wide) ocupando os dois slots
                const isWide = slots[0] && catalog.miners[slots[0].minerId] && Number(catalog.miners[slots[0].minerId].size) === 2;

                if (isWide) {
                    const wideSlot = document.createElement('div');
                    wideSlot.style.cssText = "grid-column: 1/3; min-width:0; min-height:0; display:flex; justify-content:center; align-items:center; height:100%; position:relative;";
                    
                    const minerMeta = catalog.miners[slots[0].minerId];
                    const wideImg = document.createElement('img');
                    wideImg.src = minerMeta ? minerMeta.asset : (ASSET_PATH + 'miner_2001_retangular.gif');
                    wideImg.style.cssText = "display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; transform: scale(1.5625); cursor: pointer; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9));";
                    wideSlot.appendChild(wideImg);

                    wideSlot.onclick = (e) => {
                        e.stopPropagation();
                        removeMiner(rackIndex, level, 0);
                    };
                    row.appendChild(wideSlot);
                } else {
                    // Renderiza individualmente os 2 slots (esquerdo 0 e direito 1) para máquinas quadradas ou vazios
                    for (let side = 0; side < 2; side++) {
                        const slot = document.createElement('div');
                        slot.style.cssText = "min-width:0; min-height:0; display:flex; justify-content:center; align-items:center; height:100%; position:relative;";

                        const machineData = slots[side];
                        if (machineData) {
                            const minerMeta = catalog.miners[machineData.minerId];
                            const minerImg = document.createElement('img');
                            minerImg.src = minerMeta ? minerMeta.asset : (ASSET_PATH + 'miner_2004_quadrado-1.gif');
                            
                            const shiftX = slotXOffsets[side] || 0;
                            minerImg.style.cssText = `
                                display: block;
                                width: 100%;
                                height: 100%;
                                object-fit: contain;
                                object-position: center;
                                transform: scale(1.5625) translateX(${shiftX}px);
                                cursor: pointer;
                                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9));
                            `;

                            slot.appendChild(minerImg);
                        }

                        slot.onclick = (e) => {
                            e.stopPropagation();
                            if (slots[side]) {
                                removeMiner(rackIndex, level, side);
                            } else {
                                openMinerModal(rackIndex, level);
                            }
                        };
                        row.appendChild(slot);
                    }
                }
                shelvesOverlay.appendChild(row);
            }

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
    modal.style.display = 'flex';
    const titleEl = document.getElementById('full-modal-title');
    const bodyEl = document.getElementById('full-modal-body');

    let html = '';

    if (category === 'racks') {
        titleEl.innerHTML = `<i class="fa-solid fa-layer-group"></i> INVENTÁRIO: RACKS`;
        Object.entries(catalog.racks).forEach(([rackId, meta]) => {
            const qty = userInventory.racks[rackId] || 0;
            html += `
                <div class="rc-item-row" onclick="${isPlacement ? `selectRack('${rackId}')` : ''}">
                    <div class="rc-item-img-box"><img src="${meta.asset}" alt="${meta.name}"></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${meta.name}</div>
                        <div class="rc-item-sub">Estante Oficial Mytria</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>
            `;
        });
    } else if (category === 'miners') {
        titleEl.innerHTML = `<i class="fa-solid fa-server"></i> INVENTÁRIO: MINERADORAS`;
        Object.entries(catalog.miners).forEach(([mId, meta]) => {
            const qty = userInventory.miners[mId] || 0;
            html += `
                <div class="rc-item-row" onclick="${isPlacement ? `selectMiner('${mId}')` : ''}">
                    <div class="rc-item-img-box"><img src="${meta.asset}" alt="${meta.name}"></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${meta.name}</div>
                        <div class="rc-item-sub">${meta.hashPower || 'Mineradora'} | Tamanho: ${meta.size} Slot(s)</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>
            `;
        });
    } else if (category === 'others') {
        titleEl.innerHTML = `<i class="fa-solid fa-box-archive"></i> INVENTÁRIO: OUTROS ITENS`;
        Object.entries(userInventory.others || {}).forEach(([itemKey, qty]) => {
            html += `
                <div class="rc-item-row">
                    <div class="rc-item-img-box"><i class="fa-solid fa-battery-full" style="color:#38bdf8; font-size:1.5rem;"></i></div>
                    <div class="rc-item-info">
                        <div class="rc-item-name">${itemKey.toUpperCase()}</div>
                        <div class="rc-item-sub">Item de Utilidade</div>
                    </div>
                    <div class="rc-item-qty">Qtd: ${qty}</div>
                </div>
            `;
        });
    }

    bodyEl.innerHTML = html || '<div style="text-align:center; color:#94a3b8; padding:20px;">Nenhum item encontrado.</div>';
};

window.selectRack = function(rackId) {
    if (activeTargetRackIndex === null) return;

    const rackMeta = catalog.racks[rackId];
    if (!rackMeta || !rackMeta.asset) {
        alert("A imagem deste modelo de rack ainda não está na pasta assets/racks.");
        return;
    }

    if ((userInventory.racks[rackId] || 0) > 0) {
        userInventory.racks[rackId]--;
        roomState.racks[activeTargetRackIndex].modelId = rackId;
        saveState();
        closeModal();
        renderMiningRoom();
        activeTargetRackIndex = null;
    } else {
        alert("Estante esgotada no inventário!");
    }
};

window.removeRack = function(rackIndex) {
    const rack = roomState.racks[rackIndex];
    if (rack.modelId) {
        userInventory.racks[rack.modelId] = (userInventory.racks[rack.modelId] || 0) + 1;
        rack.shelves.forEach(shelf => {
            if (Array.isArray(shelf)) {
                shelf.forEach(m => {
                    if (m && m.minerId) {
                        userInventory.miners[m.minerId] = (userInventory.miners[m.minerId] || 0) + 1;
                    }
                });
            }
        });
        rack.modelId = null;
        rack.shelves = [[null, null], [null, null], [null, null], [null, null]];
        saveState();
        renderMiningRoom();
    }
};

window.selectMiner = function(minerId) {
    if (activeTargetRackIndex === null || activeTargetShelfIndex === null) return;
    const shelf = roomState.racks[activeTargetRackIndex].shelves[activeTargetShelfIndex];
    const minerMeta = catalog.miners[minerId];

    if (!minerMeta) return;

    if ((userInventory.miners[minerId] || 0) <= 0) {
        alert("Sem unidades desta máquina no inventário!");
        return;
    }

    const isWide = Number(minerMeta.size) === 2;

    if (isWide) {
        if (shelf[0] !== null || shelf[1] !== null) { 
            alert("Esta prateleira precisa estar totalmente vazia para uma máquina grande de 2 slots!"); 
            return; 
        }
        userInventory.miners[minerId]--;
        shelf[0] = { minerId: minerId };
        shelf[1] = { minerId: minerId }; // Ocupa ambos os slots
    } else {
        // Máquina quadrada (tamanho 1): procura slot vazio (0 = esquerdo, 1 = direito)
        let targetSide = shelf[0] === null ? 0 : (shelf[1] === null ? 1 : -1);
        
        // Verifica se a prateleira já está ocupada por uma retangular
        if (shelf[0] && shelf[1] && shelf[0].minerId === shelf[1].minerId) {
            const existingMeta = catalog.miners[shelf[0].minerId];
            if (existingMeta && Number(existingMeta.size) === 2) {
                alert("Prateleira ocupada por uma máquina grande!");
                return;
            }
        }

        if (targetSide === -1) {
            alert("Prateleira cheia (máx 2 máquinas de 1 slot)!");
            return;
        }

        userInventory.miners[minerId]--;
        shelf[targetSide] = { minerId: minerId };
    }

    saveState();
    closeModal();
    renderMiningRoom();
    activeTargetRackIndex = null;
    activeTargetShelfIndex = null;
};

window.removeMiner = function(rackIndex, shelfIndex, side) {
    const shelf = roomState.racks[rackIndex].shelves[shelfIndex];
    
    if (!shelf[0] && !shelf[1]) return;

    // Se for máquina grande (ambos os slots têm o mesmo minerId) ou slot específico
    let removedMinerId = null;
    if (shelf[0] && shelf[1] && shelf[0].minerId === shelf[1].minerId) {
        removedMinerId = shelf[0].minerId;
        shelf[0] = null;
        shelf[1] = null;
    } else if (shelf[side]) {
        removedMinerId = shelf[side].minerId;
        shelf[side] = null;
    }

    if (removedMinerId) {
        userInventory.miners[removedMinerId] = (userInventory.miners[removedMinerId] || 0) + 1;
        saveState();
        renderMiningRoom();
    }
};

window.openGearQuickPanel = function() {
    const modal = document.getElementById('mytria-fullscreen-modal');
    modal.style.display = 'flex';
    document.getElementById('full-modal-title').innerHTML = `<i class="fa-solid fa-gear"></i> CONFIGURAÇÕES DA SALA`;

    let html = `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:8px;">Grade (Ativos na Sala):</div>`;
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
