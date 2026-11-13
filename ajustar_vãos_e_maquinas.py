from pathlib import Path
import shutil

arquivo = Path("mining-room.js")
codigo = arquivo.read_text(encoding="utf-8")

# Confere se os trechos esperados existem antes de alterar.
vão_antigo = "{ top: 7, height: 9 }"
escala_antiga = "transform: scale(1.25);"

if vão_antigo not in codigo:
    raise SystemExit("ERRO: não encontrei o vão superior com altura 9%. Nada foi alterado.")

if escala_antiga not in codigo:
    raise SystemExit("ERRO: não encontrei a escala 1.25. Nada foi alterado.")

shutil.copy2(arquivo, "mining-room.js.backup_mais25")

# Igualar a altura do vão superior aos outros três.
codigo = codigo.replace(vão_antigo, "{ top: 7, height: 14 }", 1)

# Aumentar mais 25% sobre a escala atual de 1.25.
codigo = codigo.replace(
    escala_antiga,
    "transform: scale(1.5625);"
)

arquivo.write_text(codigo, encoding="utf-8")

print("Ajustes aplicados:")
print("- Os quatro vãos agora têm 14% de altura.")
print("- Todas as máquinas recebem mais 25% de ampliação.")
print("- Backup salvo em mining-room.js.backup_mais25")
