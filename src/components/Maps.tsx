"use client";
// Stylised Africa + Côte d'Ivoire SVG maps with glowing corridors

export function AfricaCorridors({ active = true }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 500 520" className="w-full h-full" role="img" aria-label="Africa corridors">
      <defs>
        <radialGradient id="afGlow" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#0a4d8c" stopOpacity=".9" />
          <stop offset="100%" stopColor="#000a18" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2D28B" />
          <stop offset="50%" stopColor="#D6A84B" />
          <stop offset="100%" stopColor="#8a6420" />
        </linearGradient>
        <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="250" cy="230" rx="220" ry="200" fill="url(#afGlow)" />
      {/* Simplified Africa silhouette */}
      <path
        d="M250 30 L310 45 L350 90 L365 150 L340 210 L355 280 L320 360 L285 430 L250 480 L215 430 L170 360 L140 280 L155 200 L130 130 L170 70 Z"
        fill="#061c38"
        stroke="#1d4e89"
        strokeWidth="2"
      />
      {/* Ivory Coast highlight */}
      <ellipse cx="168" cy="238" rx="16" ry="12" fill="#D6A84B" opacity=".9" filter="url(#glowF)" />
      <text x="168" y="242" textAnchor="middle" fontSize="8" fill="#001D3D" fontWeight="800">CI</text>
      {/* corridors */}
      {active && (
        <g filter="url(#glowF)" stroke="url(#goldLine)" strokeWidth="2.5" fill="none">
          <path className="flow-line" d="M168 238 C 200 220, 240 200, 300 170" />
          <path className="flow-line" d="M168 238 C 190 280, 230 320, 285 380" />
          <path className="flow-line" d="M300 170 C 330 150, 350 120, 355 95" />
          <path className="flow-line" d="M168 238 C 150 260, 145 300, 160 340" />
          <path className="flow-line" d="M250 250 C 260 280, 270 320, 280 360" />
        </g>
      )}
      {/* nodes: mines, ports, cities */}
      {[
        [300, 170], [285, 380], [355, 95], [160, 340], [250, 250], [168, 238],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#0a2242" stroke="#D6A84B" strokeWidth="2" />
          <circle cx={x} cy={y} r="9" fill="none" stroke="#D6A84B" strokeOpacity=".4">
            <animate attributeName="r" values="6;12;6" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      {/* moving particles */}
      {active && [0, 1, 2].map((i) => (
        <circle key={i} r="3" fill="#F2D28B">
          <animateMotion dur={`${4 + i}s`} repeatCount="indefinite" path="M168 238 C 200 220, 240 200, 300 170" />
        </circle>
      ))}
    </svg>
  );
}

export interface CivRouteDef {
  id: string;
  label: string;
  d: string;
  modes: string[];
}

// Stylised Côte d'Ivoire with cities, ports, rail, roads
export function CivMap({
  selectedRoute,
  onSelectRoute,
  incidentZone,
  corridorNodes = [],
  zoom = 1,
}: {
  selectedRoute?: string | null;
  onSelectRoute?: (id: string) => void;
  incidentZone?: string | null;
  corridorNodes?: string[];
  zoom?: number;
}) {
  const routes: CivRouteDef[] = [
    { id: "route-A", label: "Corridor Route A — Abidjan → Nord (Road)", d: "M360 400 C 340 330, 300 280, 260 210 C 230 160, 210 120, 195 80", modes: ["road"] },
    { id: "route-B", label: "Corridor Multimodal B — Abidjan → Rail → Nord", d: "M360 400 C 320 350, 280 300, 250 240 C 225 190, 205 130, 195 80", modes: ["road", "rail"] },
    { id: "route-C", label: "Corridor Ouest C — San Pedro → Mine", d: "M120 380 C 150 300, 175 220, 195 140", modes: ["road", "port"] },
  ];
  return (
    <svg viewBox="0 0 480 480" className="w-full h-full transition-transform duration-500" style={{ transform: `scale(${zoom})` }}>
      <defs>
        <linearGradient id="civFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a2f5c" />
          <stop offset="100%" stopColor="#04142b" />
        </linearGradient>
        <filter id="civGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* CI shape (stylised) */}
      <path
        d="M80 300 L110 180 L170 120 L300 90 L400 130 L420 260 L380 400 L220 430 L100 380 Z"
        fill="url(#civFill)"
        stroke="#2f6cb0"
        strokeWidth="2.5"
      />
      {/* rail line */}
      <path d="M360 400 L330 300 L290 200 L250 120" stroke="#7fb3e8" strokeWidth="2" strokeDasharray="8 6" opacity=".7" />
      {/* routes */}
      {routes.map((r) => {
        const active = selectedRoute === r.id;
        return (
          <g key={r.id} onClick={() => onSelectRoute?.(r.id)} style={{ cursor: "pointer" }} filter={active ? "url(#civGlow)" : undefined}>
            <path
              d={r.d}
              fill="none"
              stroke={active ? "#F2D28B" : "#3a6ea5"}
              strokeWidth={active ? 6 : 4}
              opacity={active ? 1 : 0.55}
              className={active ? "flow-line route-active" : undefined}
              strokeLinecap="round"
            />
            {/* invisible hit area */}
            <path d={r.d} fill="none" stroke="transparent" strokeWidth="26" />
          </g>
        );
      })}
      {/* cities & ports */}
      <City x={360} y={400} label="ABIDJAN ⚓" hub />
      <City x={120} y={380} label="SAN PEDRO ⚓" hub />
      <City x={195} y={80} label="MINE NORD ⛏️" gold={corridorNodes.includes("MINE")} />
      <City x={250} y={240} label="HUB BOUAKÉ" gold={corridorNodes.includes("LOGISTICS HUB")} />
      <City x={290} y={300} label="YAMOUSSOUKRO" />
      {incidentZone && (
        <g>
          <circle cx={260} cy={210} r="22" fill="rgba(255,60,60,.25)" stroke="#ff5a5a" strokeWidth="2" strokeDasharray="6 4" />
          <text x={260} y={215} textAnchor="middle" fontSize="20">⚠️</text>
        </g>
      )}
      {corridorNodes.length > 0 && (
        <text x={240} y={460} textAnchor="middle" fill="#F2D28B" fontSize="13" fontWeight="700">
          {corridorNodes.join("  →  ")}
        </text>
      )}
    </svg>
  );
}

function City({ x, y, label, hub, gold }: { x: number; y: number; label: string; hub?: boolean; gold?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={hub ? 11 : 7} fill={gold ? "#D6A84B" : "#0a2242"} stroke={gold || hub ? "#F2D28B" : "#7fb3e8"} strokeWidth="2.5" />
      <text x={x} y={y - 16} textAnchor="middle" fill={gold || hub ? "#F2D28B" : "#cfe4ff"} fontSize="11" fontWeight="800">
        {label}
      </text>
    </g>
  );
}

export function WestAfricaMap({
  placed,
  onPlace,
}: {
  placed: { id: string; x: number; y: number }[];
  onPlace: (x: number, y: number) => void;
}) {
  return (
    <svg
      viewBox="0 0 640 420"
      className="w-full h-full"
      onClick={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 640;
        const y = ((e.clientY - rect.top) / rect.height) * 420;
        onPlace(Math.round(x), Math.round(y));
      }}
    >
      <rect x="0" y="0" width="640" height="420" rx="24" fill="#04142b" stroke="#1d4e89" strokeWidth="2" />
      {/* stylised coast */}
      <path d="M60 260 C 150 240, 250 250, 340 230 C 430 210, 520 220, 600 180" stroke="#2f6cb0" strokeWidth="3" fill="none" opacity=".8" />
      <text x="70" y="300" fill="#7fb3e8" fontSize="13" fontWeight="700">ABIDJAN ⚓</text>
      <text x="420" y="260" fill="#7fb3e8" fontSize="13" fontWeight="700">ACCRA • LOMÉ • COTONOU</text>
      <text x="180" y="120" fill="#7fb3e8" fontSize="13" fontWeight="700">BURKINA • MALI — HINTERLAND</text>
      {/* corridor line through placed nodes */}
      {placed.length > 1 && (
        <path
          d={`M${placed.map((p) => `${p.x} ${p.y}`).join(" L")}`}
          fill="none"
          stroke="#D6A84B"
          strokeWidth="5"
          strokeLinecap="round"
          className="flow-line"
          filter="url(#civGlow)"
          opacity=".95"
        />
      )}
      {placed.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="18" fill="#0a2f5c" stroke="#F2D28B" strokeWidth="3" />
          <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="18">{iconFor(p.id)}</text>
          <text x={p.x} y={p.y + 34} textAnchor="middle" fill="#F2D28B" fontSize="10" fontWeight="800">{p.id}</text>
        </g>
      ))}
      {placed.length === 0 && (
        <text x="320" y="210" textAnchor="middle" fill="#5b87b8" fontSize="15">
          Touchez la carte pour placer l’élément sélectionné…
        </text>
      )}
    </svg>
  );
}

export function iconFor(id: string) {
  const m: Record<string, string> = {
    MINE: "⛏️", ENERGY: "⚡", INDUSTRY: "🏭", "LOGISTICS HUB": "🚚",
    RAIL: "🚆", ROAD: "🛣️", PORT: "⚓", "MARITIME ROUTE": "🚢", WAREHOUSE: "📦",
  };
  return m[id] ?? "◆";
}
