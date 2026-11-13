from pathlib import Path
import shutil

arquivo = Path("mining-room.js")
codigo = arquivo.read_text(encoding="utf-8")

# Backup antes da alteração
shutil.copy2(arquivo, "mining-room.js.backup_encaixes")

inicio = codigo.find("            const shelvesOverlay = document.createElement('div');")
fim_texto = "            rackWrapper.appendChild(shelvesOverlay);"
fim = codigo.find(fim_texto, inicio)

if inicio < 0 or fim < 0:
    raise SystemExit("ERRO: não encontrei o bloco de encaixes. Arquivo não alterado.")

fim += len(fim_texto)

novo_bloco = r'''            // Área de encaixe proporcional à imagem do rack.
            const shelvesOverlay = document.createElement('div');
            shelvesOverlay.style.cssText = `
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;

            // Quatro aberturas identificadas no rack de referência.
            const slotPositions = [
                { top: 2, height: 14 },
                { top: 25, height: 14 },
                { top: 48, height: 14 },
                { top: 72, height: 14 }
            ];

            slotPositions.forEach((pos, s) => {
                const shelfSlot = document.createElement('div');

                shelfSlot.style.cssText = `
                    position: absolute;
                    left: 15%;
                    top: ${pos.top}%;
                    width: 70%;
                    height: ${pos.height}%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 2px;
                    overflow: visible;
                    pointer-events: auto;
                    cursor: pointer;
                `;

                shelfSlot.onclick = () => openMinerModal(rackIndex, s);

                const slotContent = rack.shelves[s] || [];

                if (slotContent.length === 0) {
                    shelfSlot.style.border = '1px dashed rgba(0,242,255,0.10)';
                    shelfSlot.style.borderRadius = '3px';
                } else {
                    slotContent.forEach((m, mIdx) => {
                        const minerMeta = catalog.miners[m.minerId];

                        if (!minerMeta || !minerMeta.asset) return;

                        const minerImg = document.createElement('img');
                        minerImg.src = minerMeta.asset;
                        minerImg.alt = minerMeta.name;
                        minerImg.title = `${minerMeta.name} (Clique para remover)`;

                        const isSquare = Number(minerMeta.size) === 1;

                        minerImg.style.cssText = `
                            display: block;
                            flex: ${isSquare ? '0 1 49%' : '1 1 100%'};
                            width: ${isSquare ? '49%' : '100%'};
                            height: 100%;
                            min-width: 0;
                            max-width: ${isSquare ? '49%' : '100%'};
                            object-fit: contain;
                            object-position: center;
                            cursor: pointer;
                            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9));
                        `;

                        minerImg.onclick = (e) => {
                            e.stopPropagation();
                            removeMiner(rackIndex, s, mIdx);
                        };

                        shelfSlot.appendChild(minerImg);
                    });
                }

                shelvesOverlay.appendChild(shelfSlot);
            });

            rackWrapper.appendChild(shelvesOverlay);'''

codigo = codigo[:inicio] + novo_bloco + codigo[fim:]

# Mantém a imagem e a camada de encaixe com a mesma proporção.
codigo = codigo.replace(
    'rackWrapper.style.cssText = "position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: flex-end;";',
    'rackWrapper.style.cssText = "position: relative; width: 100%; max-height: 155px; aspect-ratio: 338 / 364; display: flex; justify-content: center; align-items: stretch;";',
    1
)

codigo = codigo.replace(
    'rackImg.style.cssText = "height: 155px; width: auto; max-width: 100%; object-fit: contain; display: block;";',
    'rackImg.style.cssText = "width: 100%; height: 100%; object-fit: contain; display: block;";',
    1
)

arquivo.write_text(codigo, encoding="utf-8")
print("Encaixes visuais atualizados.")
print("Backup criado: mining-room.js.backup_encaixes")
