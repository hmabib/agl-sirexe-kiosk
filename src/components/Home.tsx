"use client";
import { motion } from "framer-motion";
import { useKiosk } from "@/lib/store";
import { t } from "@/lib/i18n";
import { TopBar } from "./Chrome";
import { ParticleField, CountUp, sfx } from "./Fx";

const CARDS = [
  { id: "mission", num: "01", icon: "🗺️", grad: "from-[#0a4d8c] to-[#04142b]" },
  { id: "explore", num: "02", icon: "🌍", grad: "from-[#123a6b] to-[#04142b]" },
  { id: "build", num: "03", icon: "🏗️", grad: "from-[#3a2f10] to-[#0a1a33]" },
];

export function HomeScreen() {
  const k = useKiosk();
  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll" style={{ background: "radial-gradient(1000px 700px at 50% 0%, #003F73 0%, #001a38 60%, #00060f 100%)" }}>
      <div className="absolute inset-0 pointer-events-none"><ParticleField density={60} /></div>
      <div className="relative">
      <TopBar title={t("welcome", k.lang)} subtitle={t("welcome_sub", k.lang)} />
      {/* bandeau KPI temps réel */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 mt-4">
        <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto text-center">
          {[
            ["EVP / AN", <CountUp key="a" to={12400} />],
            ["KM CORRIDOR", <CountUp key="b" to={620} />],
            ["PORTS CONNECTÉS", <CountUp key="c" to={12} />],
            ["CO₂ MULTIMODAL", <span key="d" className="text-emerald-300">−28 %</span>],
          ].map(([l, v]) => (
            <div key={l as string} className="shrink-0">
              <div className="text-2xl font-extrabold text-[#F2D28B]">{v}</div>
              <div className="text-[10px] tracking-[0.25em] text-white/55 font-bold">{l}</div>
            </div>
          ))}
          <div className="shrink-0 text-[10px] text-white/35">● LIVE • illustratif</div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-28 pt-6 grid md:grid-cols-3 gap-5">
        {CARDS.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { k.touch(); sfx("whoosh"); k.go(c.id as any); }}
            className={`glass rounded-3xl p-8 text-left min-h-[420px] flex flex-col justify-between bg-gradient-to-b ${c.grad} hover:border-[#D6A84B] transition-colors`}
          >
            <div>
              <div className="text-sm tracking-[0.3em] text-[#D6A84B] font-bold">EXPÉRIENCE {c.num}</div>
              <div className="text-7xl my-6 floaty">{c.icon}</div>
              <h2 className="text-3xl font-extrabold">{c.id === "mission" ? t("mission", k.lang) : c.id === "explore" ? t("explore", k.lang) : t("build", k.lang)}</h2>
              <p className="text-white/65 mt-2 text-lg">{c.id === "mission" ? t("mission_sub", k.lang) : c.id === "explore" ? t("explore_sub", k.lang) : t("build_sub", k.lang)}</p>
            </div>
            <div className="mt-8 h-16 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold flex items-center justify-center text-lg">
              ▶ EXPLORER →
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-center text-white/40 text-sm pb-10">Ressource → Infrastructure → Logistique → Port → Marché → Développement • <span className="text-[#D6A84B]">Simulation illustrative</span></p>
      </div>
    </div>
  );
}
