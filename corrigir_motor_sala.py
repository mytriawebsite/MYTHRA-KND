import json
import shutil
from pathlib import Path

motor = Path("mining-room.js")
catalogo = Path("items-racks.json")

# Backups
shutil.copy2(motor, Path("mining-room.js.backup_motor"))
shutil.copy2(catalogo, Path("items-racks.json.backup_motor"))

# 1. Corrigir os caminhos das imagens que realmente existem
data = json.loads(catalogo.read_text(encoding="utf-8"))

assets = {
    "rack_1001": "assets/racks/rack_1001_azul.png",
    "rack_1002": "assets/racks/rack_1002_vermelho.png",
    "rack_1003": "assets/racks/rack_1003_roxo.png",
    "rack_1004": "assets/racks/rack_1004_verde.png",
    "rack_1005": None,
    "rack_1006": None,
}

for rack_id, asset in assets.items():
    if rack_id in data["items"]:
        data["items"][rack_id]["asset"] = asset

catalogo.write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

# 2. Declarar catálogo e carregar a sala preservando o estado salvo
source = motor.read_text(encoding="utf-8")

anchor = "const ROOM_STORAGE_KEY = 'mytria_room_state_v10';"

if "let catalog =" not in source:
    initialization = r"""

// Catálogos carregados dos arquivos JSON
let catalog = {
    racks: {},
    miners: {}
};

// Recupera a sala existente sem apagar os racks instalados.
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

    // Completa posições ausentes, sem remover posições já existentes.
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
        rack.shelves = rack.shelves.map(shelf =>
            Array.isArray(shelf) ? shelf : []
        );
        if (!rack.id) rack.id = `slot_${i + 1}`;
        if (rack.modelId === undefined) rack.modelId = null;
    });

    return saved;
}

let roomState = loadRoomState();
"""
    if anchor not in source:
        raise SystemExit("ERRO: não encontrei a linha ROOM_STORAGE_KEY. Nenhuma alteração no motor foi feita.")
    source = source.replace(anchor, anchor + initialization, 1)

# 3. Impedir instalação de rack sem imagem disponível
old = """window.selectRack = function(rackId) {
    if (activeTargetRackIndex === null) return;
    if ((userInventory.racks[rackId] || 0) > 0) {"""

new = """window.selectRack = function(rackId) {
    if (activeTargetRackIndex === null) return;

    const rackMeta = catalog.racks[rackId];
    if (!rackMeta || !rackMeta.asset) {
        alert("A imagem deste modelo de rack ainda não está na pasta assets/racks.");
        return;
    }

    if ((userInventory.racks[rackId] || 0) > 0) {"""

if old in source:
    source = source.replace(old, new, 1)
elif "A imagem deste modelo de rack ainda não está na pasta assets/racks." not in source:
    raise SystemExit("ERRO: não encontrei a função selectRack no formato esperado.")

motor.write_text(source, encoding="utf-8")

print("Correção inicial aplicada.")
print("Backups: mining-room.js.backup_motor e items-racks.json.backup_motor")
print("Sala salva preservada; racks sem imagem não poderão ser instalados.")
