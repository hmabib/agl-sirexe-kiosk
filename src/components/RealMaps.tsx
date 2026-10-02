"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { CITIES, ROUTES } from "./civData";
import { CivMap, WestAfricaMap, iconFor } from "./Maps";

// Tuiles OpenStreetMap (libres, sans clé), teintées aux couleurs de la marque en CSS (.realmap).
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  const citiesRef = useRef<Leaflet.Marker[]>([]);
  const incidentRef = useRef<Leaflet.LayerGroup | null>(null);
  const cbRef = useRef(onSelectRoute);
  useEffect(()=>{cbRef.current = onSelectRoute;},[onSelectRoute]);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  void _zoom;

  const cityByName = Object.fromEntries(CITIES.map((c) => [c.name, c]));
  const selRef = useRef(selectedRoute);
  useEffect(()=>{selRef.current = selectedRoute;},[selectedRoute]);

  function styleRoutes() {
    for (const [id, line] of Object.entries(layersRef.current.routes)) {
      const active = id === selRef.current;
      try {
        line.setStyle(
          active
            ? { color: "#EED58E", weight: 6, opacity: 1 }
            : { color: "#3a6ea5", weight: 3, opacity: 0.7 }
        );
        line.getElement()?.classList.toggle("flow-line", active);
      } catch {}
    }
  }

  useEffect(() => {
    if (failed) return;
    let alive = true;
    let map: Leaflet.Map | null = null;
    const layers = layersRef.current;
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
        let errs = 0, loaded = 0;
        L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 })
          .on("tileerror", () => {
            if (++errs > 12 && alive) setFailed(true);
          })
          .on("tileload", () => { loaded++; })
          .on("load", () => { if (alive && errs > 0 && loaded === 0) setFailed(true); })
          .addTo(map);

        // villes réelles
        for (const c of CITIES) {
          const marker = L.marker([c.lat, c.lng], {
            icon: cityIcon(L, c, { big: c.kind !== "city" }),
            keyboard: false,
          }).addTo(map);
          citiesRef.current.push(marker);
        }
        // Liaisons de principe entre des villes réelles.
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
          layers.routes[id] = line;
        }
        incidentRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        styleRoutes();
        setMapReady(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      layers.routes = {};
      citiesRef.current = [];
      incidentRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || failed || !map) return;
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || mapRef.current !== map) return;
      citiesRef.current.forEach((marker, index) => {
        const city = CITIES[index];
        marker.setIcon(cityIcon(L, city, { gold: city.kind === "hub" && corridorNodes.includes("LOGISTICS HUB"), big: city.kind !== "city" }));
      });
      const layer = incidentRef.current;
      layer?.clearLayers();
      if (incidentZone && layer) {
        const city = CITIES.find(c => c.name === "Bouaké")!;
        const position: [number, number] = [city.lat + 0.35, city.lng];
        L.circle(position, { radius: 22000, color: "#ff5a5a", dashArray: "8 6", fillOpacity: 0.15, className: "incident-zone" }).addTo(layer);
        L.marker(position, { icon: L.divIcon({ className: "rmark-wrap", html: '<div class="rmark alert"><span>⚠️</span></div>', iconSize: [0, 0] }), keyboard: false }).addTo(layer);
      }
    });
    return () => { cancelled = true; };
  }, [mapReady, failed, incidentZone, corridorNodes]);

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
        Fond © OpenStreetMap — touchez une route pour la sélectionner
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
  useEffect(()=>{cbRef.current = onPlace;},[onPlace]);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (failed) return;
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
        let errs = 0, loaded = 0;
        L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 })
          .on("tileerror", () => {
            if (++errs > 12 && alive) setFailed(true);
          })
          .on("tileload", () => { loaded++; })
          .on("load", () => { if (alive && errs > 0 && loaded === 0) setFailed(true); })
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
        setMapReady(true);
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
  }, [failed]);

  // resync marqueurs + corridor
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed || !mapReady) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || mapRef.current !== map) return;
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
    return () => { cancelled = true; };
  }, [placed, failed, mapReady]);

  if (failed) {
    return (
      <div className="h-[420px]">
        <WestAfricaMap
          placed={placed.map((p) => ({ id: p.id, x: 24 + (p.lng + 22) / 30 * 592, y: 24 + (20 - p.lat) / 18 * 372 }))}
          onPlace={(x, y) => onPlace(Math.max(2, Math.min(20, 20 - (y - 24) / 372 * 18)), Math.max(-22, Math.min(8, (x - 24) / 592 * 30 - 22)))}
        />
        <p className="ai-status">Mode hors ligne · schéma de simulation, placements indicatifs.</p>
      </div>
    );
  }
  return (
    <div className="relative">
      <div ref={divRef} className="realmap w-full h-[420px] md:h-[460px] rounded-2xl overflow-hidden" />
      <div className="absolute bottom-2 left-2 text-[10px] text-white/50 bg-black/50 rounded px-2 py-0.5">
        Fond © OpenStreetMap — touchez la carte pour placer l’élément
      </div>
    </div>
  );
}
