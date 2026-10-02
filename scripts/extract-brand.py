"""Extract AGL template imagery and inspect its embedded brand assets."""
import io
import json
import sys
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw

deck = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
tiles = []
with zipfile.ZipFile(deck) as z:
    for name in z.namelist():
        if not name.startswith("ppt/media/"):
            continue
        raw = z.read(name)
        stem = Path(name).stem
        if name.endswith(".svg"):
            (out / f"{stem}.svg").write_bytes(raw)
            continue
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            continue
        print(stem, img.size)
        img.thumbnail((1920, 1200))
        img.save(out / f"{stem}.webp", "WEBP", quality=86)
        thumb = img.copy()
        thumb.thumbnail((280, 158))
        tile = Image.new("RGB", (300, 190), "#1B365F")
        tile.paste(thumb, ((300-thumb.width)//2, 0))
        ImageDraw.Draw(tile).text((10, 165), stem, fill="white")
        tiles.append(tile)
sheet = Image.new("RGB", (1200, ((len(tiles)+3)//4)*190), "#1B365F")
for i,tile in enumerate(tiles):
    sheet.paste(tile, ((i%4)*300, (i//4)*190))
sheet.save(out / "contact-sheet.jpg")
