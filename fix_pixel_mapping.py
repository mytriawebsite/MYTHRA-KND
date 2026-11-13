with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Substitui o overlay calculando exatamente os limites úteis extraídos dos pixels
old_block = """            const shelvesOverlay = document.createElement('div');
            // Alinhamento corrigido: desce o bloco para encaixar milimetricamente nos vãos das prateleiras
            shelvesOverlay.style.cssText = "position: absolute; top: 15%; left: 8%; width: 84%; height: 73%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

new_block = """            const shelvesOverlay = document.createElement('div');
            // Mapeamento baseado na análise real de pixels (Rack 512x512, área útil Y: 6 a 500)
            shelvesOverlay.style.cssText = "position: absolute; top: 12%; left: 11%; width: 78%; height: 76%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

old_img_style = "width: 100%; height: 100%; max-height: 52px; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"
new_img_style = "width: 100%; height: auto; max-height: 23%; object-fit: contain; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.9));"

if old_block in code:
    code = code.replace(old_block, new_block)
if old_img_style in code:
    code = code.replace(old_img_style, new_img_style)

with open("mining-room.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Mapeamento por pixels aplicado com sucesso no mining-room.js!")
