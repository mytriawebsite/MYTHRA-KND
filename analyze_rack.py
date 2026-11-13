from PIL import Image

try:
    img = Image.open("rack_1001.png").convert("RGBA")
    w, h = img.size
    print(f"--- ANÁLISE DE PIXELS DO RACK ---")
    print(f"Dimensões totais do rack cortado: {w}x{h}px")

    # Vamos analisar a opacidade (alpha) para identificar o início e fim da estrutura física do rack
    left_bound = w
    right_bound = 0
    top_bound = h
    bottom_bound = 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            if a > 30: # Pixel visível
                if x < left_bound: left_bound = x
                if x > right_bound: right_bound = x
                if y < top_bound: top_bound = y
                if y > bottom_bound: bottom_bound = y

    print(f"Estrutura visível ocupando:")
    print(f"  - X (Horizontal): de {left_bound}px até {right_bound}px (Largura útil: {right_bound - left_bound}px)")
    print(f"  - Y (Vertical): de {top_bound}px até {bottom_bound}px (Altura útil: {bottom_bound - top_bound}px)")
    
    # Proporções exatas em relação ao total
    px_left = (left_bound / w) * 100
    px_width = ((right_bound - left_bound) / w) * 100
    px_top = (top_bound / h) * 100
    px_height = ((bottom_bound - top_bound) / h) * 100

    print("\nValores calculados em % exatos da imagem:")
    print(f"left: {px_left:.2f}% | width: {px_width:.2f}%")
    print(f"top: {px_top:.2f}% | height: {px_height:.2f}%")

except Exception as e:
    print("Erro ao analisar imagem:", e)
