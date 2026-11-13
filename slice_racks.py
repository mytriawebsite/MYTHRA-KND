from PIL import Image

# Caminho e nome exatos da imagem indicados por você
sheet_path = "/storage/emulated/0/Pictures/file_0000000040e8820eadc04814bdd848c4.png"

print(f"Lendo a sprite sheet em: {sheet_path}")
sheet = Image.open(sheet_path).convert("RGBA")
width, height = sheet.size

# Como a grade é de 3 colunas por 2 linhas
col_width = width // 3
row_height = height // 2

racks_map = [
    ("rack_1001.png", 0, 0), # Ciano (Linha 0, Coluna 0)
    ("rack_1002.png", 1, 0), # Azul (Linha 0, Coluna 1)
    ("rack_1003.png", 2, 0), # Roxo (Linha 0, Coluna 2)
    ("rack_1004.png", 0, 1), # Verde (Linha 1, Coluna 0)
    ("rack_1005.png", 1, 1), # Dourado (Linha 1, Coluna 1)
    ("rack_1006.png", 2, 1)  # Vermelho (Linha 1, Coluna 2)
]

for filename, col, row in racks_map:
    left = col * col_width
    upper = row * row_height
    right = (col + 1) * col_width
    lower = (row + 1) * row_height
    
    rack_img = sheet.crop((left, upper, right, lower))
    rack_img.save(filename)
    print(f"Gerado e salvo com sucesso: {filename}")

print("Fatiamento concluído com sucesso!")
