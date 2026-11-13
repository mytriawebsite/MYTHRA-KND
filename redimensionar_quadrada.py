from PIL import Image
import os

input_path = "Maquina-padrao-1-slot.gif"
output_path = "miner_1slot_quadrada.png"

if not os.path.exists(input_path):
    print(f"Erro: Arquivo '{input_path}' não encontrado na pasta!")
    exit()

# Abre a imagem da máquina quadrada
img = Image.open(input_path).convert("RGBA")

# Dimensão exata para 1 slot (metade da largura da retangular: 292px por 228px de altura)
target_width = 292
target_height = 228

resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

# Remove o fundo escuro/preto transformando-o em transparente (Alpha = 0)
datas = resized_img.getdata()
new_data = []
for item in datas:
    if item[0] < 15 and item[1] < 15 and item[2] < 15:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append(item)

resized_img.putdata(new_data)
resized_img.save(output_path, "PNG")
print(f"[SUCESSO] Máquina de 1 slot redimensionada e salva como: {output_path}")
