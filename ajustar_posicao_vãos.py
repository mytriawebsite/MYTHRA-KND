from pathlib import Path
import shutil

arquivo = Path("mining-room.js")
codigo = arquivo.read_text(encoding="utf-8")

alvo = """                    height: ${pos.height}%;
                    display: flex;"""

novo = """                    height: ${pos.height}%;
                    transform: ${
                        s === 0 ? 'translateY(-20px)' :
                        s === 1 ? 'translateY(-15px)' :
                        s === 3 ? 'translateY(5px)' :
                        'translateY(0)'
                    };
                    display: flex;"""

if alvo not in codigo:
    raise SystemExit("Trecho não encontrado. Nenhuma alteração realizada.")

shutil.copy2(arquivo, "mining-room.js.backup_posicao_vaos")

codigo = codigo.replace(alvo, novo, 1)
arquivo.write_text(codigo, encoding="utf-8")

print("Posições ajustadas:")
print("1º vão: -20 px")
print("2º vão: -15 px")
print("3º vão: sem alteração")
print("4º vão: +5 px")
print("Backup: mining-room.js.backup_posicao_vaos")
