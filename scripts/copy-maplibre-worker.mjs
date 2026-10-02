// Copie le worker MapLibre (module ES + chunk partagé) dans public/ : le bundler ne le résout pas seul.
import { cpSync, mkdirSync } from "node:fs";
const src = "node_modules/maplibre-gl/dist", out = "public/maplibre";
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(`${src}/${f}`, `${out}/${f}`);
