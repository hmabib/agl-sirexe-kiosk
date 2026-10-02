"use client";
import { motion } from "framer-motion";
import { Pickaxe, Factory, Truck, TrainFront, Anchor, Ship, Plane, Warehouse, ShieldCheck, Boxes, Store } from "lucide-react";
import { inferMode, type Flow, type FlowKind, type StepMode } from "@/lib/actions";

const ICON: Record<FlowKind, typeof Truck> = { mine: Pickaxe, plant: Factory, truck: Truck, rail: TrainFront, port: Anchor, ship: Ship, plane: Plane, warehouse: Warehouse, customs: ShieldCheck, hub: Boxes, market: Store };
// Chaque mode a sa signature visuelle : la route est pleine, le rail rythmé, la mer en pointillés, l’air léger.
const MODE: Record<string, { color: string; width: number; dash?: string; label: { fr: string; en: string } }> = {
  road: { color: "#EED58E", width: 3, label: { fr: "Route", en: "Road" } },
  heavy_lift: { color: "#EED58E", width: 5, label: { fr: "Convoi exceptionnel", en: "Heavy haul" } },
  rail: { color: "#d9b968", width: 4, dash: "12 6", label: { fr: "Rail", en: "Rail" } },
  sea: { color: "#6fa6e6", width: 3, dash: "1 9", label: { fr: "Maritime", en: "Sea" } },
  air: { color: "#b9d3f2", width: 2, dash: "5 8", label: { fr: "Aérien", en: "Air" } },
  customs: { color: "#c4b5fd", width: 2.5, dash: "6 5", label: { fr: "Douane", en: "Customs" } },
  digital: { color: "#7be2ac", width: 2, dash: "2 6", label: { fr: "Données", en: "Data" } },
};
const style = (m: StepMode) => MODE[m] ?? MODE.road;
const W = 1000, H = 470;

// Placement : une ligne jusqu’à 5 maillons, sinon un serpentin sur deux lignes.
function layout(n: number) {
  if (n <= 5) return Array.from({ length: n }, (_, i) => ({ x: 100 + (800 * i) / Math.max(1, n - 1), y: 250 }));
  const top = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => i < top
    ? { x: 110 + (780 * i) / Math.max(1, top - 1), y: 170 }
    : { x: 890 - (780 * (i - top)) / Math.max(1, n - top - 1), y: 380 });
}

export function FlowDiagram({ flow, en }: { flow: Flow; en: boolean }) {
  const pts = layout(flow.nodes.length);
  const appear = (i: number) => 0.2 + i * 0.32;
  const links = flow.links.length ? flow.links : flow.nodes.slice(1).map((n, i) => ({ from: i, to: i + 1, mode: inferMode(flow.nodes[i].kind, n.kind), label: undefined }));
  const edges = links.map((l, i) => {
    const a = pts[l.from], b = pts[l.to];
    const sameRow = Math.abs(a.y - b.y) < 10;
    const bend = sameRow ? (i % 2 ? 46 : -46) : 0;
    const d = sameRow
      ? `M${a.x},${a.y} Q${(a.x + b.x) / 2},${a.y + bend} ${b.x},${b.y}`
      : `M${a.x},${a.y} C${a.x + 90},${a.y} ${b.x + 90},${b.y} ${b.x},${b.y}`;
    const mid = sameRow ? { x: (a.x + b.x) / 2, y: a.y + bend / 2 } : { x: Math.max(a.x, b.x) + 64, y: (a.y + b.y) / 2 + 8 };
    return { ...l, d, mid, delay: Math.max(appear(l.from), appear(l.to)) + 0.1 };
  });
  const modes = [...new Set(links.map(l => l.mode))];
  return (
    <div className="flow-diagram">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={flow.title}>
        <defs>
          <radialGradient id="flow-node" cx="50%" cy="35%" r="70%"><stop offset="0%" stopColor="#1f4a82" /><stop offset="100%" stopColor="#071a36" /></radialGradient>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>

        {flow.info.length > 0 && <g>
          <text x={40} y={44} fill="#7be2ac" fontSize={11} fontWeight={700} letterSpacing="2.5">{en ? "INFORMATION FLOW" : "FLUX D’INFORMATION"}</text>
          <motion.path id="flow-info" d={`M40,70 L${W - 40},70`} stroke="#7be2ac" strokeWidth={1.5} strokeDasharray="2 7" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.3 }} />
          {flow.info.map((t, i) => { const x = 40 + ((W - 80) * (i + 0.5)) / flow.info.length; return (
            <motion.g key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.15 }}>
              <rect x={x - 70} y={82} width={140} height={26} rx={13} fill="#7be2ac14" stroke="#7be2ac55" />
              <text x={x} y={99} textAnchor="middle" fill="#bff3d8" fontSize={11.5} fontWeight={600}>{t.slice(0, 22)}</text>
            </motion.g>); })}
          <circle r={4} fill="#7be2ac"><animateMotion dur="2.2s" repeatCount="indefinite" begin="1s"><mpath href="#flow-info" /></animateMotion></circle>
        </g>}

        {edges.map((e, i) => { const s = style(e.mode); return (
          <g key={i}>
            <motion.path d={e.d} stroke={s.color} strokeWidth={s.width + 8} opacity={0.12} fill="none" filter="url(#flow-glow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: e.delay }} />
            <motion.path id={`flow-edge-${i}`} d={e.d} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.9, delay: e.delay, ease: "easeInOut" }} />
            {[0, 1].map(k => (
              <circle key={k} r={e.mode === "heavy_lift" ? 7 : 5.5} fill="#fff6d8" stroke={s.color} strokeWidth={2} opacity={0}>
                <animate attributeName="opacity" from="0" to="1" begin={`${e.delay + 1 + k * 1.3}s`} dur="0.3s" fill="freeze" />
                <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${e.delay + 1 + k * 1.3}s`} rotate="auto"><mpath href={`#flow-edge-${i}`} /></animateMotion>
              </circle>))}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: e.delay + 0.6 }}>
              <rect x={e.mid.x - 52} y={e.mid.y - 13} width={104} height={24} rx={12} fill="#04122ad9" stroke={`${s.color}66`} />
              <text x={e.mid.x} y={e.mid.y + 4} textAnchor="middle" fill={s.color} fontSize={11} fontWeight={700}>{(e.label || s.label[en ? "en" : "fr"]).slice(0, 16)}</text>
            </motion.g>
          </g>); })}

        {flow.nodes.map((n, i) => { const p = pts[i]; const Icon = ICON[n.kind]; const edge = i === 0 || i === flow.nodes.length - 1; return (
          <motion.g key={i} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: appear(i), type: "spring", stiffness: 260, damping: 18 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            {edge && <circle cx={p.x} cy={p.y} r={44} fill="none" stroke="#EED58E" strokeOpacity={0.5}><animate attributeName="r" values="38;52;38" dur="2.8s" repeatCount="indefinite" /><animate attributeName="stroke-opacity" values=".55;0;.55" dur="2.8s" repeatCount="indefinite" /></circle>}
            <circle cx={p.x} cy={p.y} r={36} fill="url(#flow-node)" stroke={edge ? "#EED58E" : "#7fb3e8"} strokeWidth={edge ? 2.5 : 1.5} />
            <Icon x={p.x - 15} y={p.y - 15} width={30} height={30} color={edge ? "#EED58E" : "#cfe0f5"} strokeWidth={1.8} />
            <text x={p.x} y={p.y + 62} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={700}>{n.label.slice(0, 22)}</text>
            {n.detail && <text x={p.x} y={p.y + 80} textAnchor="middle" fill="#9dc0e8" fontSize={11}>{n.detail.slice(0, 30)}</text>}
          </motion.g>); })}
      </svg>
      <div className="flow-legend">{modes.map(m => { const s = style(m); return <span key={m}><svg width="34" height="8"><line x1="2" y1="4" x2="32" y2="4" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" /></svg>{s.label[en ? "en" : "fr"]}</span>; })}{flow.info.length > 0 && <span><svg width="34" height="8"><line x1="2" y1="4" x2="32" y2="4" stroke="#7be2ac" strokeWidth={1.5} strokeDasharray="2 7" /></svg>{en ? "Information" : "Information"}</span>}</div>
    </div>
  );
}
