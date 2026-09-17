# Turn a 1600x1000 raw capture into the /platform pair: <name>.webp (1600x913,
# the raw trimmed at the content bottom) and <name>-crop.webp (the uniform
# 1344x858 rect (256,55)-(1600,913) with the sidebar and top bar removed), plus
# shots/raw/<name>.png. WEBP q85 as before.
import sys
from PIL import Image
raw, shots_dir, name = sys.argv[1], sys.argv[2], sys.argv[3]
crop_too = len(sys.argv) < 5 or sys.argv[4] != "nocrop"
im = Image.open(raw).convert("RGB")
assert im.size[0] == 1600 and im.size[1] >= 913, im.size
full = im.crop((0, 0, 1600, 913))
full.save(f"{shots_dir}/{name}.webp", "WEBP", quality=85, method=6)
im.crop((0, 0, 1600, 913)).save(f"{shots_dir}/raw/{name}.png")
if crop_too:
    im.crop((256, 55, 1600, 913)).save(f"{shots_dir}/{name}-crop.webp", "WEBP", quality=85, method=6)
print("wrote", name, full.size, "crop" if crop_too else "")
