from pathlib import Path
import shutil

index = Path("index.html")
motor = Path("mining-room.js")

html = index.read_text(encoding="utf-8")
js = motor.read_text(encoding="utf-8")

# Backups
shutil.copy2(index, "index.html.backup_layout_sala")
shutil.copy2(motor, "mining-room.js.backup_layout_sala")

# 1. Separar decoração e área de racks
old_markup = '''    <div class="mining-room-container">
      <div class="room-grid-layer" id="roomContent"></div>
    </div>'''

new_markup = '''    <div class="mining-room-container">
      <div class="room-decoration-area" id="roomDecorationArea">
        <!-- Espaço reservado para futuras decorações e eventos -->
      </div>
      <div class="room-grid-layer" id="roomContent"></div>
    </div>'''

if old_markup not in html:
    raise SystemExit("ERRO: estrutura HTML da sala não encontrada.")

html = html.replace(old_markup, new_markup, 1)

# 2. Ajustar CSS da sala
start = html.find("    .mining-room-container {")
end = html.find("  </style>", start)

if start < 0 or end < 0:
    raise SystemExit("ERRO: bloco CSS da sala não encontrado.")

new_css = '''    .mining-room-container {
      width: 100%;
      min-height: 700px;
      background-image: url('Salademineracao.jpg');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center top;
      border: 2px solid var(--accent-cyan);
      border-radius: 12px;
      padding: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 25px rgba(0, 242, 255, 0.2);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 8px;
    }

    .room-decoration-area {
      width: 100%;
      height: 155px;
      min-height: 155px;
      position: relative;
      z-index: 2;
      border: 1px dashed rgba(0, 242, 255, 0.13);
      border-radius: 8px;
      background: rgba(4, 10, 20, 0.12);
    }

    .room-grid-layer {
      width: 100%;
      min-height: 510px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-auto-rows: 165px;
      align-content: end;
      justify-items: center;
      gap: 5px;
      z-index: 2;
    }

    @media (min-width: 1000px) {
      .mining-room-container {
        min-height: 900px;
      }

      .room-decoration-area {
        height: 230px;
        min-height: 230px;
      }
    }

'''

html = html[:start] + new_css + html[end:]

# 3. Corrigir a grade gerada pelo JavaScript
old_grid = 'container.style.cssText = "width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 10px; padding: 10px 8px 10px 8px; align-content: end; min-height: 600px; z-index: 2;";'
new_grid = 'container.style.cssText = "width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: 165px; gap: 5px; padding: 0; align-content: end; justify-items: center; min-height: 510px; z-index: 2;";'

if old_grid not in js:
    raise SystemExit("ERRO: estilo antigo da grade não encontrado.")

js = js.replace(old_grid, new_grid, 1)

# 4. Ajustar tamanho dos espaços à grade
old_cell = 'rackCell.style.cssText = "position: relative; height: 165px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 2px; border: 1px dashed rgba(0, 242, 255, 0.12); border-radius: 6px; background: rgba(4, 6, 11, 0.2);";'
new_cell = 'rackCell.style.cssText = "position: relative; width: 100%; height: 165px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; border: 1px dashed rgba(0, 242, 255, 0.12); border-radius: 6px; background: rgba(4, 6, 11, 0.2);";'

if old_cell not in js:
    raise SystemExit("ERRO: estilo das posições dos racks não encontrado.")

js = js.replace(old_cell, new_cell, 1)

# 5. Coordenadas das quatro aberturas do rack de referência
old_positions = '''            const slotPositions = [
                { top: 2, height: 14 },
                { top: 25, height: 14 },
                { top: 48, height: 14 },
                { top: 72, height: 14 }
            ];'''

new_positions = '''            const slotPositions = [
                { top: 7, height: 9 },
                { top: 25, height: 14 },
                { top: 48, height: 14 },
                { top: 72, height: 14 }
            ];'''

if old_positions not in js:
    raise SystemExit("ERRO: coordenadas antigas dos encaixes não encontradas.")

js = js.replace(old_positions, new_positions, 1)

index.write_text(html, encoding="utf-8")
motor.write_text(js, encoding="utf-8")

print("Layout da sala atualizado.")
print("Área superior reservada para decoração.")
print("Grade 4x4 com 16 posições preservada.")
print("Quatro encaixes ajustados ao rack de referência.")
print("Backups criados.")
