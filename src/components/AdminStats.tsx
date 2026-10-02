"use client";
import { useState } from "react";
import { readEvents, computeStats, analyticsCSV } from "@/lib/analytics";
import { downloadFile } from "@/lib/requests";

export function AdminStats() {
  const [stats, setStats] = useState(() => computeStats(readEvents()));
  const max = Math.max(1, ...stats.byName.map(b => b.count));
  const funnel: [string, number][] = [["Arrivées", stats.funnel.started], ["Mining", stats.funnel.mining], ["RDV / Candidatures", stats.funnel.appointment], ["Enquête", stats.funnel.satisfaction]];
  const fmax = Math.max(1, ...funnel.map(f => f[1]));
  const hours = stats.perHour;
  const hmax = Math.max(1, ...hours.map(h => h.count));
  const W = 560, H = 140;
  const x = (i: number) => (hours.length > 1 ? (i / (hours.length - 1)) * (W - 20) + 10 : W / 2);
  const y = (c: number) => H - 12 - (c / hmax) * (H - 40);
  const pts = hours.length > 1 ? hours.map((h, i) => `${x(i)},${y(h.count)}`).join(" ") : "";
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-[#EED58E]">ANALYTICS AVANCÉES · {stats.sessions} SESSIONS</h2>
        <div className="flex gap-2">
          <button className="h-11 px-4 rounded-xl bg-white/10 font-bold text-sm" onClick={() => setStats(computeStats(readEvents()))}>↻ Actualiser</button>
          <button className="h-11 px-4 rounded-xl bg-white/10 font-bold text-sm" onClick={() => downloadFile("Africa Global Logistics-analytics.csv", analyticsCSV(readEvents()), "text/csv;charset=utf-8")}>Exporter CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {[["Événements", stats.totalEvents], ["Voix", stats.voice], ["Images", stats.images], ["Cartes lues", stats.scans]].map(([l, v]) => (
          <div key={String(l)} className="glass rounded-2xl p-4"><div className="text-[11px] text-white/50 font-bold">{String(l)}</div><div className="text-3xl font-extrabold text-[#F2D28B]">{String(v)}</div></div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-bold text-white/60 mb-3">ENTONNOIR DE VISITE</div>
          {funnel.map(([l, v]) => (
            <div key={l} className="mb-2">
              <div className="flex justify-between text-xs"><span>{l}</span><span className="font-bold">{v}</span></div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#D6A84B] to-[#F2D28B]" style={{ width: `${(v / fmax) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-bold text-white/60 mb-3">TOP ÉVÉNEMENTS</div>
          {stats.byName.map(b => (
            <div key={b.name} className="mb-2">
              <div className="flex justify-between text-xs font-mono"><span>{b.name}</span><span className="font-bold">{b.count}</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#7fb3e8]" style={{ width: `${(b.count / max) * 100}%` }} /></div>
            </div>
          ))}
          {stats.byName.length === 0 && <div className="text-white/40 text-sm">Aucun événement pour l’instant.</div>}
        </div>
      </div>
      <div className="glass rounded-2xl p-4 mt-4">
        <div className="text-xs font-bold text-white/60 mb-2">ACTIVITÉ PAR HEURE</div>
        {hours.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Activité par heure">
            <polyline points={pts} fill="none" stroke="#EED58E" strokeWidth="3" />
            {hours.map((h, i) => (
              <g key={h.hour}>
                <circle cx={x(i)} cy={y(h.count)} r="4" fill="#EED58E" />
                <text x={x(i)} y={H - 1} fill="#aabbd2" fontSize="9" textAnchor="middle">{h.hour}</text>
              </g>
            ))}
          </svg>
        ) : hours.length === 1 ? (
          <div className="text-white/70 text-sm">{hours[0].hour} · {hours[0].count} événements.</div>
        ) : (
          <div className="text-white/40 text-sm">Pas encore de données horaires.</div>
        )}
      </div>
    </section>
  );
}
