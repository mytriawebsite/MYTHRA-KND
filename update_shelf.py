# Atualizador automático do motor de prateleiras para o Mytria
with open("mining-room.js", "r", encoding="utf-8") as f:
    code = f.read()

# Substitui o estilo do overlay das prateleiras por um mapeamento fixo e preciso por porcentagem de altura
old_style = "const shelvesOverlay = document.createElement('div');\n            shelvesOverlay.style.cssText = \"position: absolute; top: 14px; bottom: 6px; width: 75%; max-width: 90px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;\";"

new_style = """const shelvesOverlay = document.createElement('div');
            // Alinhamento milimétrico baseado no padrão da sua simulação do Canva
            shelvesOverlay.style.cssText = "position: absolute; top: 12%; left: 12%; width: 76%; height: 82%; display: flex; flex-direction: column; justify-content: space-around; pointer-events: none;";"""

if old_style in code:
    code = code.replace(old_style, new_style)
    with open("mining-room.js", "w", encoding="utf-8") as f:
        f.write(code)
    print("Regra de alinhamento das prateleiras atualizada com sucesso no mining-room.js!")
else:
    print("Aviso: Estrutura antiga já modificada ou com formato diferente. Verifique manualmente se necessário.")
