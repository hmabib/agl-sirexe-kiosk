"use client";
import { motion } from "framer-motion";

export function Orb({ state, size = 120 }: { state: "idle" | "listening" | "thinking" | "speaking"; size?: number }) {
  const colors =
    state === "listening"
      ? "from-emerald-400 via-teal-300 to-[#D6A84B]"
      : state === "thinking"
        ? "from-violet-400 via-[#003F73] to-[#D6A84B]"
        : state === "speaking"
          ? "from-[#F2D28B] via-[#D6A84B] to-[#003F73]"
          : "from-[#003F73] via-[#0a4d8c] to-[#D6A84B]";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 40, height: size + 40 }}>
      {[1.35, 1.18].map((s, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br ${colors} opacity-25 blur-xl`}
          style={{ width: size * s, height: size * s }}
          animate={state === "idle" ? { scale: [1, 1.08, 1] } : { scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: state === "idle" ? 4 : 1.6, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      <motion.div
        className={`relative rounded-full bg-gradient-to-br ${colors} shadow-[0_0_60px_rgba(214,168,75,.5)] flex items-center justify-center overflow-hidden`}
        style={{ width: size, height: size }}
        animate={
          state === "listening"
            ? { scale: [1, 1.12, 1] }
            : state === "speaking"
              ? { scale: [1, 1.06, 0.98, 1.06, 1] }
              : { scale: 1 }
        }
        transition={{ duration: 1.2, repeat: state === "idle" ? 0 : Infinity }}
      >
        {/* waveform bars when speaking */}
        {state === "speaking" ? (
          <div className="flex items-end gap-1.5 h-10">
            {[10, 22, 34, 26, 16, 30, 20].map((h, i) => (
              <motion.div
                key={i}
                className="w-1.5 rounded-full bg-white/90"
                animate={{ height: [8, h, 10] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl">◆</div>
            <div className="text-[10px] tracking-[0.3em] font-bold text-white/90 mt-1">
              {({ listening: "LISTENING", thinking: "THINKING", speaking: "SPEAKING", idle: "AGL AI" } as const)[state]}
            </div>
          </div>
        )}
        <div className="absolute inset-0 rounded-full border border-white/20" />
      </motion.div>
    </div>
  );
}

export function AglLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? 72 : size === "md" ? 52 : 36;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/agl-logo.svg"
        alt="AGL"
        style={{ height: h }}
        className="object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="leading-none">
        <div className="font-extrabold tracking-[0.25em] text-white" style={{ fontSize: h * 0.42 }}>
          AGL
        </div>
        <div className="text-[10px] tracking-[0.3em] text-[#D6A84B] font-semibold">AFRICA GLOBAL LOGISTICS</div>
      </div>
    </div>
  );
}
