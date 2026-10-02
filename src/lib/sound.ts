"use client";
// Design sonore synthétisé (WebAudio) : aucun fichier à charger, latence quasi nulle.
export type SfxKind = "tap" | "tick" | "confirm" | "close" | "open" | "transition" | "materialize" | "live" | "select" | "pop" | "success" | "alert" | "whoosh";

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let ambientNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
const lastPlayed: Partial<Record<SfxKind, number>> = {};

export function isMuted() {
  try { return localStorage.getItem("agl_mute") === "1"; } catch { return false; }
}
export function setMuted(muted: boolean) {
  try { localStorage.setItem("agl_mute", muted ? "1" : "0"); } catch { /* silencieux */ }
  if (muted) stopAmbient(); else startAmbient();
}

function audio() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
  if (!actx) {
    actx = new AudioContext();
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master = actx.createGain(); master.gain.value = 0.9;
    master.connect(comp).connect(actx.destination);
    noiseBuffer = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === "suspended") actx.resume().catch(() => {});
  return actx;
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine", glideTo?: number) {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at); o.stop(at + dur + 0.02);
}

function noise(ac: AudioContext, at: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, sweepTo?: number) {
  if (!noiseBuffer) return;
  const src = ac.createBufferSource(); src.buffer = noiseBuffer;
  const f = ac.createBiquadFilter(); f.type = filter; f.Q.value = filter === "bandpass" ? 1.4 : 0.7;
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at); src.stop(at + dur + 0.02);
}

export function sfx(kind: SfxKind = "select") {
  try {
    if (isMuted()) return;
    // Pas de son avant le premier geste : le navigateur bloquerait l’AudioContext.
    if (!actx && typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    const ac = audio(); if (!ac || !master) return;
    const now = performance.now();
    if (now - (lastPlayed[kind] ?? 0) < 45) return;
    lastPlayed[kind] = now;
    const t = ac.currentTime + 0.005;
    switch (kind) {
      case "tap": noise(ac, t, 0.03, 0.05, "highpass", 2800); tone(ac, 1250, t, 0.05, 0.05, "sine", 880); break;
      case "tick": tone(ac, 1650, t, 0.035, 0.045, "triangle"); break;
      case "confirm": noise(ac, t, 0.03, 0.04, "highpass", 2800); tone(ac, 784, t, 0.12, 0.07, "triangle"); tone(ac, 1175, t + 0.07, 0.2, 0.06, "triangle"); break;
      case "close": tone(ac, 720, t, 0.13, 0.055, "sine", 400); break;
      case "open": noise(ac, t, 0.26, 0.045, "bandpass", 400, 2600); tone(ac, 523, t + 0.04, 0.18, 0.04, "sine", 784); break;
      case "transition": noise(ac, t, 0.38, 0.04, "bandpass", 260, 3200); tone(ac, 110, t, 0.36, 0.05, "sine", 220); break;
      case "materialize": noise(ac, t, 0.5, 0.025, "highpass", 4000, 9000); [1046, 1318, 1568, 2093].forEach((f, i) => tone(ac, f, t + i * 0.06, 0.32, 0.04, "triangle")); break;
      case "live": tone(ac, 659, t, 0.45, 0.06); tone(ac, 988, t + 0.12, 0.6, 0.05); break;
      case "pop": tone(ac, 520, t, 0.12, 0.08, "sine", 760); break;
      case "select": tone(ac, 660, t, 0.14, 0.07, "triangle"); tone(ac, 880, t + 0.08, 0.2, 0.06, "triangle"); break;
      case "success": [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, t + i * 0.1, 0.4, 0.07, "triangle")); break;
      case "alert": tone(ac, 330, t, 0.2, 0.06, "sawtooth"); tone(ac, 262, t + 0.14, 0.28, 0.06, "sawtooth"); break;
      case "whoosh": noise(ac, t, 0.45, 0.06, "bandpass", 300, 2400); tone(ac, 220, t, 0.4, 0.04, "sine", 660); break;
    }
  } catch { /* silencieux */ }
}

// Retour tactile : son adapté au rôle de l’élément touché + micro-vibration si disponible.
export function feedbackFor(el: Element) {
  const target = el.closest("button,a[href],[role=button],[role=tab],select,input[type=checkbox],input[type=radio]");
  if (!target || (target as HTMLButtonElement).disabled || target.getAttribute("aria-disabled") === "true") return;
  const explicit = target.getAttribute("data-sfx");
  if (explicit === "off") return;
  const label = `${target.getAttribute("aria-label") ?? ""} ${target.className}`;
  const kind: SfxKind = (explicit as SfxKind) || (/fermer|close|arrêter|stop/i.test(label) ? "close" : target.getAttribute("role") === "tab" || target.hasAttribute("aria-pressed") || target.matches("input,select") ? "tick" : target.classList.contains("brand-btn") || target.classList.contains("ai-launcher") ? "confirm" : "tap");
  sfx(kind);
  try { if (!isMuted()) navigator.vibrate?.(8); } catch { /* silencieux */ }
}

export function startAmbient() {
  try {
    const ac = audio();
    if (!ac || !master || ambientNodes || isMuted()) return;
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.035, ac.currentTime + 3);
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 420;
    const osc = [55, 82.5, 110.3].map((f) => {
      const o = ac.createOscillator();
      o.type = "sine"; o.frequency.value = f;
      o.connect(filter); o.start();
      return o;
    });
    filter.connect(gain).connect(master);
    ambientNodes = { osc, gain };
  } catch { /* silencieux */ }
}
export function stopAmbient() {
  try {
    const nodes = ambientNodes;
    ambientNodes = null;
    if (nodes && actx) {
      nodes.gain.gain.linearRampToValueAtTime(0.0001, actx.currentTime + 0.5);
      setTimeout(() => nodes.osc.forEach((o) => { try { o.stop(); } catch { /* déjà arrêté */ } }), 700);
    }
  } catch { ambientNodes = null; }
}
