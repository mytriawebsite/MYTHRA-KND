with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Substitui o overlay mantendo a proporção exata do vão (585x238) e da máquina (585x228)
old_overlay = """            const shelvesOverlay = document.createElement('div');
            // Ajuste pixel-perfeito: restringe a área interna exata das 4 prateleiras do rack
            shelvesOverlay.style.cssText = "position: absolute; top: 14%; left: 10%; width: 80%; height: 74%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

new_overlay = """            const shelvesOverlay = document.createElement('div');
            // Proporção exata baseada nas dimensões: Vão 585x238 | Máquina 585x228
            shelvesOverlay.style.cssText = "position: absolute; top: 13.5%; left: 9.5%; width: 81%; height: 75.5%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

old_img = "height: 18px; max-width: 58px; width: auto; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"
new_img = "width: 100%; height: auto; max-height: 22.5%; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"

if old_overlay in code:
    code = code.replace(old_overlay, new_overlay)
if old_img in code:
    code = code.replace(old_img, new_img)

with open("mining-room.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Proporções matemáticas 585x238 e 585x228 aplicadas com sucesso!")
