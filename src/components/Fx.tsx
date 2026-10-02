"use client";
import { useEffect, useRef, useState } from "react";

import { sfx } from "@/lib/sound";
export { sfx, startAmbient, stopAmbient } from "@/lib/sound";

// ---------- Compteur animé ----------
export function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    (function tick(t: number) {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    })(t0);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{v.toLocaleString("fr-FR")}{suffix}</span>;
}

// ---------- Champ de particules dorées ----------
export function ParticleField({ density = 70, className = "" }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const P = Array.from({ length: density }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0009, vy: (Math.random() - 0.5) * 0.0009,
      r: 1 + Math.random() * 2.2, gold: Math.random() > 0.45,
    }));
    function resize() {
      const box = cv.parentElement!.getBoundingClientRect();
      w = cv.width = box.width; h = cv.height = box.height;
    }
    resize();
    window.addEventListener("resize", resize);
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of P) {
        p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 7);
        ctx.fillStyle = p.gold ? "rgba(214,168,75,.75)" : "rgba(127,179,232,.5)";
        ctx.fill();
      }
      // liaisons
      ctx.lineWidth = 1;
      for (let i = 0; i < P.length; i++) {
        for (let j = i + 1; j < P.length; j++) {
          const dx = (P[i].x - P[j].x) * w, dy = (P[i].y - P[j].y) * h;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.strokeStyle = `rgba(214,168,75,${(0.14 * (1 - d / 110)).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(P[i].x * w, P[i].y * h); ctx.lineTo(P[j].x * w, P[j].y * h); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [density]);
  return <canvas ref={ref} className={`w-full h-full ${className}`} />;
}

// ---------- Confettis dorés ----------
export function ConfettiBurst({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const cols = ["#D6A84B", "#F2D28B", "#ffffff", "#7fb3e8"];
    const parts = Array.from({ length: 180 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 11, vy: -4 - Math.random() * 8,
      s: 4 + Math.random() * 7, c: cols[Math.floor(Math.random() * cols.length)],
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    }));
    let frames = 0;
    let raf = 0;
    sfx("success");
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (++frames < 160) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  if (!fire) return null;
  return <canvas ref={ref} className="fixed inset-0 z-[60] pointer-events-none" />;
}

// ---------- Anneau de score ----------
export function ScoreRing({ score, label }: { score: number; label: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setV((x) => (x >= score ? score : x + 2)), 30);
    return () => clearInterval(id);
  }, [score]);
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-4">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
        <circle cx="65" cy="65" r={R} fill="none" stroke="url(#goldGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * Math.min(v, 100)) / 100}
          transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset .2s" }} />
        <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2D28B" /><stop offset="100%" stopColor="#D6A84B" />
        </linearGradient></defs>
        <text x="65" y="72" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800">{v}</text>
      </svg>
      <div>
        <div className="font-extrabold text-lg">{label}</div>
        <div className="text-xs text-white/50">Score corridor • indicatif</div>
      </div>
    </div>
  );
}

// ---------- Badge modèle branché ----------
export function ModelBadge() {
  const [info, setInfo] = useState<{configured:boolean;provider:string;textModel:string;liveModel:string}|null>(null);
  useEffect(() => {
    fetch("/api/gemini").then((r) => r.json()).then(setInfo).catch(() => {});
  }, []);
  if (!info) return <span className="text-[11px] text-white/40">● IA…</span>;
  const label = !info.configured ? "● IA · HORS LIGNE" : "● Lara · EN LIGNE";
  return (
    <span title={info.configured ? "Lara configurée" : "IA non configurée"} className={`text-[11px] font-bold px-3 h-9 hidden md:flex items-center rounded-full border ${info.configured ? "text-[#5df2c8] border-[#5df2c8]/30 bg-[#5df2c8]/10" : "text-white/40 border-white/15 bg-white/5"}`}>
      {label}
    </span>
  );
}
