"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { CITIES, ROUTES } from "./civData";
import { CivMap, WestAfricaMap, iconFor } from "./Maps";

const TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function cityIcon(L: typeof Leaflet, c: { name: string; kind: string }, opts?: { gold?: boolean; big?: boolean }) {
  const emoji = c.kind === "port" ? "⚓" : c.kind === "mine" ? "⛏️" : c.kind === "hub" ? "🏬" : "•";
  const label =
    c.kind === "port" ? `${c.name.toUpperCase()} ⚓` : c.kind === "mine" ? `${c.name.toUpperCase()} ⛏️` : c.kind === "hub" ? `HUB ${c.name.toUpperCase()}` : c.name;
  return L.divIcon({
    className: "rmark-wrap",
    html: `<div class="rmark ${c.kind} ${opts?.gold ? "gold" : ""} ${opts?.big === false ? "minor" : ""}"><span>${emoji}</span><label>${label}</label></div>`,
    iconSize: [0, 0],
  });
}

// ---------- Vraie carte Côte d'Ivoire (tuiles CARTO/OSM) ----------
export function RealCivMap({
  selectedRoute,
  onSelectRoute,
  incidentZone,
  corridorNodes = [],
  zoom: _zoom = 1,
}: {
  selectedRoute?: string | null;
  onSelectRoute?: (id: string) => void;
  incidentZone?: string | null;
  corridorNodes?: string[];
  zoom?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layersRef = useRef<{ routes: Record<string, Leaflet.Polyline> }>({ routes: {} });
  const cbRef = useRef(onSelectRoute);
  cbRef.current = onSelectRoute;
  const [failed, setFailed] = useState(false);
  void _zoom;

  const cityByName = Object.fromEntries(CITIES.map((c) => [c.name, c]));
  const selRef = useRef(selectedRoute);
  selRef.current = selectedRoute;

  function styleRoutes() {
    for (const [id, line] of Object.entries(layersRef.current.routes)) {
      const active = id === selRef.current;
      try {
        line.setStyle(
          active
            ? { color: "#F2D28B", weight: 6, opacity: 1, className: "rroute flow-line" }
            : { color: "#3a6ea5", weight: 3, opacity: 0.7, className: "rroute" }
        );
      } catch {}
    }
  }

  useEffect(() => {
    let alive = true;
    let map: Leaflet.Map | null = null;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (!alive || !divRef.current || mapRef.current) return;
        map = L.map(divRef.current, {
          zoomControl: false,
          minZoom: 6,
          maxZoom: 13,
          scrollWheelZoom: false,
          tapTolerance: 30,
          attributionControl: true,
        });
        map.setView([7.55, -5.6], 7);
        L.control.zoom({ position: "topright" }).addTo(map);
        let errs = 0;
        L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 })
          .on("tileerror", () => {
            if (++errs > 12 && alive) setFailed(true);
          })
          .addTo(map);

        // villes réelles
        for (const c of CITIES) {
          const gold =
            (c.kind === "mine" && corridorNodes.includes("MINE")) ||
            (c.kind === "hub" && corridorNodes.includes("LOGISTICS HUB"));
          L.marker([c.lat, c.lng], {
            icon: cityIcon(L, c, { gold, big: c.kind !== "city" }),
            keyboard: false,
          }).addTo(map);
        }
        // 3 corridors réels
        for (const id of Object.keys(ROUTES)) {
          const latlngs = (ROUTES[id] ?? [])
            .map((n) => cityByName[n])
            .filter(Boolean)
            .map((c) => [c.lat, c.lng] as [number, number]);
          const line = L.polyline(latlngs, {
            color: "#3a6ea5",
            weight: 3,
            opacity: 0.7,
            className: "rroute",
          }).addTo(map);
          line.on("click", () => cbRef.current?.(id));
          layersRef.current.routes[id] = line;
        }
        // incident
        if (incidentZone) {
          const b = cityByName["Bouaké"];
          L.circle([b.lat + 0.35, b.lng], { radius: 22000, color: "#ff5a5a", dashArray: "8 6", fillOpacity: 0.15 }).addTo(map);
          L.marker([b.lat + 0.35, b.lng], {
            icon: L.divIcon({ className: "rmark-wrap", html: `<div class="rmark alert"><span>⚠️</span></div>`, iconSize: [0, 0] }),
            keyboard: false,
          }).addTo(map);
        }
        mapRef.current = map;
        styleRoutes();
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      layersRef.current.routes = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // met à jour le surlignage quand la sélection change
  useEffect(() => {
    styleRoutes();
  }, [selectedRoute]);

  if (failed) {
    // repli hors-ligne : schéma vectoriel
    return <CivMap selectedRoute={selectedRoute} onSelectRoute={onSelectRoute} incidentZone={incidentZone} corridorNodes={corridorNodes} />;
  }
  return (
    <div className="relative">
      <div ref={divRef} className="realmap w-full h-[420px] md:h-[480px] rounded-2xl overflow-hidden" />
      <div className="absolute bottom-2 left-2 text-[10px] text-white/50 bg-black/50 rounded px-2 py-0.5">
        Fond © OpenStreetMap · © CARTO — touchez une route pour la sélectionner
      </div>
    </div>
  );
}

// ---------- Vraie carte Afrique de l'Ouest (Build Africa) ----------
export interface PlacedPoint { id: string; lat: number; lng: number }

export function RealWestAfrica({
  placed,
  onPlace,
}: {
  placed: PlacedPoint[];
  onPlace: (lat: number, lng: number) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.Marker[]>([]);
  const lineRef = useRef<Leaflet.Polyline | null>(null);
  const cbRef = useRef(onPlace);
  cbRef.current = onPlace;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let map: Leaflet.Map | null = null;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (!alive || !divRef.current || mapRef.current) return;
        map = L.map(divRef.current, {
          zoomControl: false,
          minZoom: 4,
          maxZoom: 12,
          scrollWheelZoom: false,
          tapTolerance: 30,
        });
        map.setView([10.5, -7.5], 5);
        map.setMaxBounds([
          [2, -22],
          [20, 8],
        ]);
        L.control.zoom({ position: "topright" }).addTo(map);
        let errs = 0;
        L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 })
          .on("tileerror", () => {
            if (++errs > 12 && alive) setFailed(true);
          })
          .addTo(map);
        // repères ports régionaux
        const refs: [string, number, number][] = [
          ["ABIDJAN ⚓", 5.32, -4.02],
          ["SAN PEDRO ⚓", 4.75, -6.64],
          ["DAKAR", 14.7, -17.44],
          ["TEMA", 5.63, -0.0],
          ["LOMÉ", 6.13, 1.22],
        ];
        for (const [n, la, lo] of refs) {
          L.marker([la, lo], {
            icon: L.divIcon({ className: "rmark-wrap", html: `<div class="rmark ref"><span>•</span><label>${n}</label></div>`, iconSize: [0, 0] }),
            keyboard: false,
            interactive: false,
          }).addTo(map);
        }
        map.on("click", (e: Leaflet.LeafletMouseEvent) => cbRef.current(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      markersRef.current = [];
      lineRef.current = null;
    };
  }, []);

  // resync marqueurs + corridor
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed) return;
    (async () => {
      const L = (await import("leaflet")).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      lineRef.current?.remove();
      lineRef.current = null;
      placed.forEach((p) => {
        const mk = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "rmark-wrap",
            html: `<div class="rmark gold"><span>${iconFor(p.id)}</span><label>${p.id}</label></div>`,
            iconSize: [0, 0],
          }),
          keyboard: false,
        }).addTo(map);
        markersRef.current.push(mk);
      });
      if (placed.length > 1) {
        lineRef.current = L.polyline(
          placed.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#F2D28B", weight: 5, opacity: 0.95, className: "rroute flow-line" }
        ).addTo(map);
      }
    })();
  }, [placed, failed]);

  if (failed) {
    return (
      <WestAfricaMap
        placed={placed.map((p) => ({ id: p.id, x: 320 + p.lng * 20, y: 210 - p.lat * 10 }))}
        onPlace={(_x, _y) => {}}
      />
    );
  }
  return (
    <div className="relative">
      <div ref={divRef} className="realmap w-full h-[420px] md:h-[460px] rounded-2xl overflow-hidden" />
      <div className="absolute bottom-2 left-2 text-[10px] text-white/50 bg-black/50 rounded px-2 py-0.5">
        Fond © OpenStreetMap · © CARTO — touchez la carte pour placer l’élément
      </div>
    </div>
  );
}
