with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Ajuste fino das coordenadas absolutas do overlay de prateleiras dentro da imagem do rack
old_block = """            const shelvesOverlay = document.createElement('div');
            // Alinhamento exato prateleira por prateleira (Vão 238px / Máquina 228px)
            shelvesOverlay.style.cssText = "position: absolute; top: 11%; left: 8%; width: 84%; height: 82%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

new_block = """            const shelvesOverlay = document.createElement('div');
            // Alinhamento corrigido: desce o bloco para encaixar milimetricamente nos vãos das prateleiras
            shelvesOverlay.style.cssText = "position: absolute; top: 15%; left: 8%; width: 84%; height: 73%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;";"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open("mining-room.js", "w", encoding="utf-8") as f:
        f.write(code)
    print("Alinhamento do overlay de prateleiras ajustado com sucesso!")
else:
    print("Bloco anterior não encontrado, verifique o código.")
