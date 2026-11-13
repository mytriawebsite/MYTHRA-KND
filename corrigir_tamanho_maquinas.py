from pathlib import Path
import shutil

arquivo = Path("mining-room.js")
codigo = arquivo.read_text(encoding="utf-8")

shutil.copy2(arquivo, "mining-room.js.backup_tamanho_corrigido")

# Retira as margens internas que estavam diminuindo a área útil.
codigo = codigo.replace(
    "padding: 2.75% 14.8% 5.5%;",
    "padding: 0;"
)

# Retira a redução aplicada à máquina superior.
codigo = codigo.replace(
    "transform: ${s === 0 ? 'scale(0.88)' : 'scale(1)'};",
    "transform: scale(1.25);"
)

# Aumenta a altura visual sem cortar as imagens.
codigo = codigo.replace(
    "height: 145%;",
    "height: 170%;"
)

arquivo.write_text(codigo, encoding="utf-8")
print("Ajuste aplicado: máquinas ampliadas e redução superior removida.")
print("Backup: mining-room.js.backup_tamanho_corrigido")
