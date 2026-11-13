with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Substitui o bloco de renderização do slot de prateleira por um controle de encaixe pixel-perfeito
old_render = """            const shelvesOverlay = document.createElement('div');
            // Alinhamento milimétrico baseado no padrão da sua simulação do Canva
            shelvesOverlay.style.cssText = "position: absolute; top: 12%; left: 12%; width: 76%; height: 82%; display: flex; flex-direction: column; justify-content: space-around; pointer-events: none;";"""

new_render = """            const shelvesOverlay = document.createElement('div');
            // Ajuste pixel-perfeito: restringe a área interna exata das 4 prateleiras do rack
            shelvesOverlay.style.cssText = "position: absolute; top: 14%; left: 10%; width: 80%; height: 74%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

old_img_style = "max-height: 22px; max-width: 60px; width: 100%; object-fit: contain; cursor: pointer; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.9));"
new_img_style = "height: 18px; max-width: 58px; width: auto; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"

if old_render in code:
    code = code.replace(old_render, new_render)
if old_img_style in code:
    code = code.replace(old_img_style, new_img_style)

with open("mining-room.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Ajuste pixel-perfeito aplicado com sucesso no mining-room.js!")
