from pathlib import Path
import shutil

arquivo = Path("mining-room.js")
codigo = arquivo.read_text(encoding="utf-8")

backup = Path("mining-room.js.backup_encaixe")
shutil.copy2(arquivo, backup)

antigo = """                    gap: 2px;
                    overflow: visible;
                    pointer-events: auto;"""

novo = """                    gap: 2px;
                    padding: 2.75% 14.8% 5.5%;
                    box-sizing: border-box;
                    overflow: visible;
                    pointer-events: auto;"""

if antigo not in codigo:
    raise SystemExit("Não encontrei o trecho das aberturas. Arquivo original preservado.")

codigo = codigo.replace(antigo, novo, 1)

antigo2 = """                            object-position: center;
                            cursor: pointer;"""

novo2 = """                            object-position: center;
                            transform: ${s === 0 ? 'scale(0.88)' : 'scale(1)'};
                            cursor: pointer;"""

if antigo2 not in codigo:
    raise SystemExit("Não encontrei o trecho de posicionamento das máquinas.")

codigo = codigo.replace(antigo2, novo2, 1)

arquivo.write_text(codigo, encoding="utf-8")

print("Teste de encaixe aplicado.")
print("Margens proporcionais configuradas.")
print("Máquina superior reduzida em 12%.")
print("Backup criado:", backup)
