import os
import json
from PIL import Image

print("=== ANÁLISE DE ASSETS PIXEL A PIXEL ===")

# 1. Analisar Rack
if os.path.exists("rack_1001.png"):
    img_rack = Image.open("rack_1001.png").convert("RGBA")
    w, h = img_rack.size
    tb, bb, lb, rb = h, 0, w, 0
    for y in range(h):
        for x in range(w):
            if img_rack.getpixel((x, y))[3] > 30:
                if y < tb: tb = y
                if y > bb: bb = y
                if x < lb: lb = x
                if x > rb: rb = x
    print(f"[RACK 1001] Tamanho arquivo: {w}x{h}px | Conteúdo visível: X({lb} a {rb}), Y({tb} a {bb})")
    print(f"  -> Altura útil do rack: {bb - tb}px")

# 2. Ler catálogo de miners para achar o arquivo da máquina
if os.path.exists("items-miners.json"):
    with open("items-miners.json", "r", encoding="utf-8") as f:
        m_data = json.load(f)
        for m_id, m_meta in m_data.get("items", {}).items():
            asset_path = m_meta.get("asset")
            if asset_path and os.path.exists(asset_path):
                img_m = Image.open(asset_path).convert("RGBA")
                mw, mh = img_m.size
                mtb, mbb, mlb, mrb = mh, 0, mw, 0
                for y in range(mh):
                    for x in range(mw):
                        if img_m.getpixel((x, y))[3] > 30:
                            if y < mtb: mtb = y
                            if y > mbb: mbb = y
                            if x < mlb: mlb = x
                            if x > mrb: mrb = x
                print(f"[MINER: {m_id}] Arquivo: {asset_path} | Tamanho: {mw}x{mh}px | Conteúdo visível: X({mlb} a {mrb}), Y({mtb} a {mbb})")
                print(f"  -> Altura útil da máquina: {mbb - mtb}px | Largura útil: {mrb - mlb}px")
                break
