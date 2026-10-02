"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as ML from "maplibre-gl";
import { Anchor, Mountain, Globe2, Route as RouteIcon, RotateCcw } from "lucide-react";
import { CITIES, COUNTRY_PATH, ROUTES } from "./civData";
import { sfx } from "@/lib/sound";

// Repli 2D (Leaflet + OpenStreetMap, puis schéma vectoriel) si WebGL ou le réseau manquent.
const RealCivMap = dynamic(() => import("./RealMaps").then(m => m.RealCivMap), { ssr: false });

// Sources 100 % ouvertes et sans clé : OpenFreeMap (données OpenStreetMap / OpenMapTiles)
// et relief Terrarium (Mapzen / AWS Open Data).
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const NAVY = "#04122a", GOLD = "#EED58E";
const FULL_GRADIENT: ML.ExpressionSpecification = ["interpolate", ["linear"], ["line-progress"], 0, GOLD, 1, GOLD];

export type MapFocus =
  | { kind: "country" }
  | { kind: "route"; route: string }
  | { kind: "point"; lng: number; lat: number; zoom: number; pitch?: number; bearing?: number };
export const ABIDJAN_PORT: MapFocus = { kind: "point", lng: -4.012, lat: 5.287, zoom: 14.6, pitch: 66, bearing: -28 };
const COUNTRY_VIEW = { center: [-5.55, 7.55] as [number, number], zoom: 6.1, pitch: 42, bearing: -12 };

// Contour GADM de civData (repère SVG 480×480) reprojeté en longitude/latitude :
// projection linéaire calée sur les villes (Abidjan, San Pedro, Korhogo).
function countryRing(): [number, number][] {
  const pts = [...COUNTRY_PATH.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g)].map(m => [-4.02 + (+m[1] - 344.9) / 68.55, 5.32 - (+m[2] - 382.7) / 65.46] as [number, number]);
  return [...pts, pts[0]];
}
function routeCoords(id: string): [number, number][] {
  return (ROUTES[id] ?? []).map(n => CITIES.find(c => c.name === n)).filter(Boolean).map(c => [c!.lng, c!.lat]);
}
// Habillage aux couleurs Africa Global Logistics du style sombre OpenFreeMap.
function brandStyle(style: ML.StyleSpecification): ML.StyleSpecification {
  const label: ML.ExpressionSpecification = ["coalesce", ["get", "name:fr"], ["get", "name:latin"], ["get", "name"]];
  style.layers = style.layers.filter(l => l.id !== "building").map(l => {
    const layer = { ...l, paint: { ...(l as { paint?: object }).paint } } as ML.LayerSpecification & { paint: Record<string, unknown>; layout?: Record<string, unknown> };
    const id = l.id;
    if (id === "background") layer.paint["background-color"] = NAVY;
    else if (id === "water") layer.paint["fill-color"] = "#0b2d57";
    else if (id === "waterway") layer.paint["line-color"] = "#1b4c86";
    else if (id.startsWith("landcover") || id.startsWith("landuse")) { layer.paint["fill-color"] = "#0a2142"; delete layer.paint["fill-pattern"]; }
    else if (id.startsWith("aeroway")) layer.paint[l.type === "fill" ? "fill-color" : "line-color"] = "#173d6b";
    else if (id.includes("motorway") && l.type === "line") layer.paint["line-color"] = id.includes("casing") ? "#0d2950" : "#b8994f";
    else if (id.startsWith("highway") && l.type === "line") layer.paint["line-color"] = id.includes("casing") ? "#0d2950" : "#24548c";
    else if (id.startsWith("railway") && l.type === "line") layer.paint["line-color"] = id.includes("dashline") ? NAVY : "#c9a85a";
    else if (id.startsWith("boundary")) { layer.paint["line-color"] = id.startsWith("boundary_country") ? "#eed58e66" : "#24548c"; }
    else if (l.type === "symbol") {
      layer.paint["text-color"] = id.startsWith("place_country") || id === "place_city_large" ? "#dbe6f5" : "#8fb0d6";
      layer.paint["text-halo-color"] = NAVY;
      if (layer.layout?.["text-field"]) layer.layout = { ...layer.layout, "text-field": label };
      if (layer.layout?.["icon-image"]) { const { "icon-image": _icon, ...rest } = layer.layout; void _icon; layer.layout = rest; }
    }
    return layer;
  });
  return style;
}

export function CinematicMap({ route, focus, intro = true, height = 460, onSelectRoute, controls = true }: {
  route?: string | null;
  focus?: MapFocus;
  intro?: boolean;
  height?: number;
  onSelectRoute?: (id: string) => void;
  controls?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ML.Map | null>(null);
  const routeRef = useRef(route);
  const cb = useRef(onSelectRoute);
  const interacted = useRef(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { cb.current = onSelectRoute; }, [onSelectRoute]);

  const target: MapFocus = focus ?? (route ? { kind: "route", route } : { kind: "country" });
  const targetKey = JSON.stringify(target);

  function fly(map: ML.Map, f: MapFocus, duration = 2600) {
    if (f.kind === "country") map.flyTo({ ...COUNTRY_VIEW, duration, curve: 1.5, essential: true });
    else if (f.kind === "point") map.flyTo({ center: [f.lng, f.lat], zoom: f.zoom, pitch: f.pitch ?? 55, bearing: f.bearing ?? -15, duration: duration + 600, curve: 1.6, essential: true });
    else {
      const coords = routeCoords(f.route);
      if (coords.length < 2) return;
      const lng = coords.map(c => c[0]), lat = coords.map(c => c[1]);
      map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: { top: 70, bottom: 70, left: 70, right: 70 }, pitch: 52, bearing: -18, duration, essential: true });
    }
  }

  // Tracé lumineux qui se dessine le long du corridor sélectionné, puis un convoi qui le parcourt.
  const anim = useRef(0);
  function animateRoute(map: ML.Map, id: string | null | undefined) {
    cancelAnimationFrame(anim.current);
    const src = map.getSource("runner") as ML.GeoJSONSource | undefined;
    if (!id || !map.getLayer("route-active")) { src?.setData({ type: "FeatureCollection", features: [] }); return; }
    map.setFilter("route-active", ["==", ["get", "id"], id]);
    map.setFilter("route-glow", ["==", ["get", "id"], id]);
    const coords = routeCoords(id);
    const segs = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    const at = (p: number): [number, number] => {
      let d = p * total;
      for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = d / segs[i]; return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]; } d -= segs[i]; }
      return coords[coords.length - 1];
    };
    const t0 = performance.now();
    const frame = (t: number) => {
      if (!mapRef.current) return;
      const draw = Math.min(1, (t - t0) / 2400);
      const e = Math.min(0.998, Math.max(0.001, 1 - Math.pow(1 - draw, 3)));
      map.setPaintProperty("route-active", "line-gradient", draw >= 1 ? FULL_GRADIENT : ["interpolate", ["linear"], ["line-progress"], 0, GOLD, e, GOLD, e + 0.001, "rgba(238,213,142,0)"]);
      if (draw >= 1) src?.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: at(((t - t0 - 2400) % 7000) / 7000) } });
      anim.current = requestAnimationFrame(frame);
    };
    anim.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    let alive = true;
    let map: ML.Map | null = null;
    let loadedOnce = false;
    const timeout = setTimeout(() => { if (alive && !loadedOnce) setFailed(true); }, 15000);
    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const style = brandStyle(await (await fetch(STYLE_URL)).json());
        if (!alive || !box.current) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const start = intro && !reduce ? { center: [-2, 9] as [number, number], zoom: 2.4, pitch: 0, bearing: 0 } : COUNTRY_VIEW;
        const created = new maplibre.Map({ container: box.current, style, ...start, maxPitch: 75, attributionControl: { compact: true }, cooperativeGestures: false, dragRotate: true });
        map = created;
        mapRef.current = created;
        created.on("error", e => { if (alive && !loadedOnce) { console.warn("Carte cinématique indisponible", e.error?.message); setFailed(true); } });
        for (const ev of ["mousedown", "touchstart", "wheel"] as const) created.on(ev, () => { interacted.current = performance.now(); });
        // Dès que le style est prêt (sans attendre toutes les tuiles) : la scène démarre plus vite.
        created.once("style.load", () => {
          loadedOnce = true;
          if (!alive) return;
          const m = created;
          m.addSource("terrain", { type: "raster-dem", tiles: [TERRAIN_TILES], tileSize: 256, encoding: "terrarium", maxzoom: 12 });
          m.addSource("terrain-shade", { type: "raster-dem", tiles: [TERRAIN_TILES], tileSize: 256, encoding: "terrarium", maxzoom: 12 });
          m.addLayer({ id: "hillshade", type: "hillshade", source: "terrain-shade", paint: { "hillshade-shadow-color": "#020a18", "hillshade-highlight-color": "#2b5a92", "hillshade-accent-color": "#0b2d57", "hillshade-exaggeration": 0.45 } }, "water");
          // Relief 3D seulement au zoom rapproché (Man, port) : à l’échelle du pays il masquerait les corridors.
          let terrainOn = false;
          const syncTerrain = () => { const want = m.getZoom() >= 8.5; if (want !== terrainOn) { terrainOn = want; m.setTerrain(want ? { source: "terrain", exaggeration: 1.6 } : null); } };
          m.on("zoom", syncTerrain);
          m.setSky({ "sky-color": "#0b2a52", "horizon-color": "#1b365f", "fog-color": NAVY, "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.4, "atmosphere-blend": 0.6 });
          // Bâtiments en 3D (port et ville d’Abidjan au zoom rapproché).
          m.addLayer({ id: "buildings-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 13, paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#16396a", 30, "#3a6ea5", 80, GOLD], "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.2, ["coalesce", ["get", "render_height"], 6]], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.88 } });
          // Côte d’Ivoire mise en lumière : voile sur le reste du monde, contour doré.
          const ring = countryRing();
          m.addSource("civ", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } });
          m.addSource("civ-mask", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], [...ring].reverse()] } } });
          m.addLayer({ id: "civ-mask", type: "fill", source: "civ-mask", paint: { "fill-color": "#000814", "fill-opacity": 0.5 } });
          m.addLayer({ id: "civ-glow", type: "line", source: "civ", paint: { "line-color": GOLD, "line-width": 10, "line-blur": 8, "line-opacity": 0.35 } });
          m.addLayer({ id: "civ-line", type: "line", source: "civ", paint: { "line-color": GOLD, "line-width": 2 } });
          // Corridors illustratifs entre les villes réelles.
          m.addSource("routes", { type: "geojson", lineMetrics: true, data: { type: "FeatureCollection", features: Object.keys(ROUTES).map(id => ({ type: "Feature", properties: { id }, geometry: { type: "LineString", coordinates: routeCoords(id) } })) } });
          m.addLayer({ id: "routes-base", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#7fb3e8", "line-width": 4, "line-opacity": 0.75, "line-dasharray": [2, 1.5] } });
          m.addLayer({ id: "route-glow", type: "line", source: "routes", filter: ["==", ["get", "id"], ""], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": GOLD, "line-width": 24, "line-blur": 14, "line-opacity": 0.5 } });
          m.addLayer({ id: "route-active", type: "line", source: "routes", filter: ["==", ["get", "id"], ""], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": 8, "line-gradient": FULL_GRADIENT } });
          m.addLayer({ id: "routes-hit", type: "line", source: "routes", paint: { "line-color": "#000", "line-opacity": 0, "line-width": 28 } });
          m.on("click", "routes-hit", e => { const id = e.features?.[0]?.properties?.id; if (id && cb.current) { sfx("select"); cb.current(String(id)); } });
          m.on("mouseenter", "routes-hit", () => { m.getCanvas().style.cursor = cb.current ? "pointer" : ""; });
          m.on("mouseleave", "routes-hit", () => { m.getCanvas().style.cursor = ""; });
          m.addSource("runner", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addLayer({ id: "runner-halo", type: "circle", source: "runner", paint: { "circle-radius": 18, "circle-color": GOLD, "circle-opacity": 0.25, "circle-blur": 0.8 } });
          m.addLayer({ id: "runner", type: "circle", source: "runner", paint: { "circle-radius": 7, "circle-color": "#fff6d8", "circle-stroke-color": GOLD, "circle-stroke-width": 3 } });
          // Repères Africa Global Logistics : ports, hub et villes du réseau.
          for (const c of CITIES) {
            const el = document.createElement("div");
            const major = c.kind !== "city";
            el.className = `cine-mark ${c.kind}`;
            el.innerHTML = `${major ? '<i class="cine-pulse"></i>' : ""}<span>${c.kind === "port" ? "⚓" : c.kind === "hub" ? "◆" : ""}</span><label>${c.kind === "hub" ? `HUB ${c.name}` : c.name}</label>`;
            new maplibre.Marker({ element: el, anchor: "center" }).setLngLat([c.lng, c.lat]).addTo(m);
          }
          setReady(true);
          sfx("transition");
          fly(m, JSON.parse(targetKey) as MapFocus, intro && !reduce ? 4200 : 0);
          m.once("moveend", () => animateRoute(m, routeRef.current));
        });
      } catch (e) {
        console.warn("Carte cinématique indisponible", e instanceof Error ? e.message : e);
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; clearTimeout(timeout); cancelAnimationFrame(anim.current); map?.remove(); mapRef.current = null; };
    // La carte est créée une seule fois ; les changements de cible passent par flyTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de cible : vol de caméra, puis redessin du corridor.
  const lastKey = useRef(targetKey);
  useEffect(() => {
    routeRef.current = route;
    const map = mapRef.current;
    if (!ready || !map) return;
    if (lastKey.current !== targetKey) { lastKey.current = targetKey; sfx("whoosh"); fly(map, JSON.parse(targetKey) as MapFocus); }
    animateRoute(map, route);
  }, [ready, route, targetKey]);

  // Orbite lente quand personne ne touche la carte : la borne reste vivante.
  useEffect(() => {
    if (!ready || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      const map = mapRef.current;
      if (map && !map.isMoving() && performance.now() - interacted.current > 8000 && document.visibilityState === "visible") map.setBearing(map.getBearing() + 0.025);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  if (failed) return <RealCivMap selectedRoute={route} onSelectRoute={onSelectRoute} />;
  const go = (f: MapFocus) => { const map = mapRef.current; if (!map) return; interacted.current = performance.now(); fly(map, f); };
  return (
    <div className="cine-map" style={{ height }}>
      <div ref={box} className="cine-canvas" role="img" aria-label="Carte 3D de la Côte d’Ivoire" />
      {!ready && <div className="cine-loading"><Globe2 size={22} />Envol vers la Côte d’Ivoire…</div>}
      {controls && ready && <div className="cine-controls">
        <button data-sfx="whoosh" onClick={() => go({ kind: "country" })}><Globe2 size={16} />Côte d’Ivoire</button>
        <button data-sfx="whoosh" onClick={() => go(ABIDJAN_PORT)}><Anchor size={16} />Port d’Abidjan 3D</button>
        <button data-sfx="whoosh" onClick={() => go({ kind: "point", lng: -7.55, lat: 7.41, zoom: 10.2, pitch: 70, bearing: 35 })}><Mountain size={16} />Relief de Man</button>
        {route && <button data-sfx="whoosh" onClick={() => go({ kind: "route", route })}><RouteIcon size={16} />Corridor</button>}
        <button data-sfx="whoosh" aria-label="Rejouer le vol" onClick={() => { const map = mapRef.current; if (!map) return; map.jumpTo({ center: [-2, 9], zoom: 2.4, pitch: 0, bearing: 0 }); fly(map, target, 4200); map.once("moveend", () => animateRoute(map, route)); }}><RotateCcw size={16} /></button>
      </div>}
      {onSelectRoute && ready && <div className="cine-routes">{Object.keys(ROUTES).map(id => <button key={id} aria-pressed={id === route} className={id === route ? "active" : ""} onClick={() => onSelectRoute(id)}>{id.replace("route-", "")} · {ROUTES[id][0]} → {ROUTES[id][ROUTES[id].length - 1]}</button>)}</div>}
    </div>
  );
}
