"""Prepare offline geographic boundaries from Natural Earth, public domain."""
import json
import urllib.request
from pathlib import Path

url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
data = json.load(urllib.request.urlopen(url, timeout=45))
africa = []
for f in data["features"]:
    p = f["properties"]
    if p.get("CONTINENT") != "Africa":
        continue
    g = f["geometry"]
    polygons = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    def project(pt):
        lon,lat = pt
        return [round(28+(lon+19)/71*490,2), round(20+(38-lat)/74*510,2)]
    paths = []
    for poly in polygons:
        ring = [project(pt) for pt in poly[0]]
        paths.append("M"+"L".join(f"{x},{y}" for x,y in ring)+"Z")
    africa.append({"name":p["NAME"],"iso":p["ADM0_A3"],"path":" ".join(paths)})
out = Path("src/lib/geography.json")
out.write_text(json.dumps({"source":url,"license":"Natural Earth public domain","countries":africa},separators=(",",":")))
print(len(africa), "geographic outlines", out.stat().st_size, "bytes")
