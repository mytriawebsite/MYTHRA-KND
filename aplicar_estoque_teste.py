import json
import re
import shutil
from pathlib import Path

# 1. Fazer backups
arquivos = [
    "items-miners.json",
    "inventory.html",
    "market.html",
    "mining-room.js"
]

for nome in arquivos:
    p = Path(nome)
    if p.exists():
        shutil.copy2(p, nome + ".backup")

# 2. Adicionar as duas máquinas quadradas ao catálogo
p = Path("items-miners.json")
data = json.loads(p.read_text(encoding="utf-8"))
miners = data.setdefault("items", {})

miners.setdefault("miner_2003", {
    "name": "Krypto Reactor 3 - Quadrado",
    "rarity": "Rare",
    "size": 1,
    "asset": "assets/miners/miner_2003_quadrado.gif"
})

miners.setdefault("miner_2004", {
    "name": "Krypto Reactor 4 - Quadrado",
    "rarity": "Epic",
    "size": 1,
    "asset": "assets/miners/miner_2004_quadrado.gif"
})

p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# 3. Bloco comum: estoque mínimo de cinco unidades
estoque = """
const INV_STORAGE_KEY = 'mytria_inventory_state_v3';

const TEST_STOCK = {
    racks: {
        rack_1001: 5,
        rack_1002: 5,
        rack_1003: 5,
        rack_1004: 5,
        rack_1005: 5,
        rack_1006: 5
    },
    miners: {
        miner_2001: 5,
        miner_2002: 5,
        miner_2003: 5,
        miner_2004: 5
    }
};

function loadTestInventory() {
    let current = {};
    try {
        current = JSON.parse(localStorage.getItem(INV_STORAGE_KEY)) || {};
    } catch (e) {
        console.warn("Inventário anterior inválido; criando estrutura segura.", e);
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
"""

# 4. Corrigir inventário: não reiniciar os dados existentes
p = Path("inventory.html")
s = p.read_text(encoding="utf-8")

pattern = r"const INV_STORAGE_KEY\s*=\s*'mytria_inventory_state_v3'.*?let catalogData\s*="
replacement = estoque + "\nlet userInventory = loadTestInventory();\n\nlet catalogData ="

s2, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Não encontrei o bloco de inicialização esperado em inventory.html")
p.write_text(s2, encoding="utf-8")

# 5. Corrigir a loja: usar a mesma chave do inventário e do motor da sala
p = Path("market.html")
s = p.read_text(encoding="utf-8")

pattern = r"const INV_STORAGE_KEY\s*=\s*'mytria_inventory_state_v1'.*?let catalogData\s*="
replacement = estoque + "\nlet userInventory = loadTestInventory();\n\nlet catalogData ="

s2, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Não encontrei o bloco de inicialização esperado em market.html")

# A compra continua sem cobrança de saldo nesta fase de testes.
p.write_text(s2, encoding="utf-8")

# 6. Corrigir a inicialização do motor da sala
p = Path("mining-room.js")
s = p.read_text(encoding="utf-8")

pattern = r"const INV_STORAGE_KEY\s*=\s*'mytria_inventory_state_v3'.*?\nfunction saveState\(\)"
replacement = estoque + "\nlet userInventory = loadTestInventory();\n\nfunction saveState()"

s2, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Não encontrei o bloco de inicialização esperado em mining-room.js")
p.write_text(s2, encoding="utf-8")

print("ESTOQUE DE TESTE APLICADO COM SUCESSO!")
print("6 modelos de racks: mínimo de 5 unidades cada.")
print("4 modelos de máquinas: mínimo de 5 unidades cada.")
print("Inventário existente preservado.")
print("Loja e sala usando a mesma chave de inventário.")
print("Backups criados com extensão .backup.")
