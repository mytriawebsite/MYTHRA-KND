with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Substitui o overlay para mapear exatamente os 4 vãos baseados nas proporções 585x238 / 585x228
old_block = """            const shelvesOverlay = document.createElement('div');
            // Proporção exata baseada nas dimensões: Vão 585x238 | Máquina 585x228
            shelvesOverlay.style.cssText = "position: absolute; top: 13.5%; left: 9.5%; width: 81%; height: 75.5%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

new_block = """            const shelvesOverlay = document.createElement('div');
            // Alinhamento exato prateleira por prateleira (Vão 238px / Máquina 228px)
            shelvesOverlay.style.cssText = "position: absolute; top: 11%; left: 8%; width: 84%; height: 82%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

old_img_rule = "width: 100%; height: auto; max-height: 22.5%; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"
new_img_rule = "width: 100%; height: 100%; max-height: 52px; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"

if old_block in code:
    code = code.replace(old_block, new_block)
if old_img_rule in code:
    code = code.replace(old_img_rule, new_img_rule)

with open("mining-room.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Ajuste de encaixe por prateleira aplicado com sucesso!")
