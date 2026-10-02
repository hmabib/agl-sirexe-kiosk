"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Image as ImageIcon, Network, Clapperboard, FileText, Download, Play, Square, ArrowUpRight, Sparkles, Volume2 } from "lucide-react";
import { useKiosk } from "@/lib/store";
import { logEvent } from "@/lib/store";
import type { MaterialAction } from "@/lib/actions";
import { publishAction } from "@/lib/actions";
import { aglLogo, drawBrand, generateStudioImage, splitScenes, splitSteps, STUDIO_LINKS, type StudioTab } from "@/lib/studio";
import { playServerVoice, stopServerVoice } from "@/lib/live";
import { downloadFile } from "@/lib/requests";

export interface StudioDoc { tab: StudioTab; title: string; body: string }

export function openStudio(tab: StudioTab, title: string, body: string) {
  publishAction({ type: "open_studio", tab, title, body });
}

export function StudioHost() {
  const [doc, setDoc] = useState<StudioDoc | null>(null);
  useEffect(() => {
    const handle = (e: Event) => {
      const a = (e as CustomEvent<MaterialAction>).detail;
      if (a.type === "open_studio") { setDoc({ tab: a.tab, title: a.title, body: a.body }); logEvent("studio_opened", { tab: a.tab }); }
    };
    window.addEventListener("agl-action", handle);
    return () => window.removeEventListener("agl-action", handle);
  }, []);
  if (!doc) return null;
  return <StudioPanel key={`${doc.tab}-${doc.title}-${doc.body.slice(0, 24)}`} doc={doc} onClose={() => setDoc(null)} />;
}

export const TABS: { id: StudioTab; fr: string; en: string }[] = [
  { id: "image", fr: "Image", en: "Image" },
  { id: "schema", fr: "Schéma", en: "Diagram" },
  { id: "storyboard", fr: "Storyboard", en: "Storyboard" },
  { id: "doc", fr: "Document", en: "Document" },
];

function StudioPanel({ doc, onClose }: { doc: StudioDoc; onClose: () => void }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const [tab, setTab] = useState<StudioTab>(doc.tab);
  return (
    <div className="glass-backdrop" style={{ position: "fixed", inset: 0, zIndex: 75, display: "grid", placeItems: "center", padding: 24 }}>
      <div className="panel glass-surface" role="dialog" aria-modal="true" aria-label={doc.title || (en ? "Creative studio" : "Studio créatif")} style={{ width: "min(980px,100%)", maxHeight: "92dvh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div><span className="eyebrow">Lara · {en ? "CREATIVE STUDIO" : "STUDIO CRÉATIF"}</span><h3 style={{ margin: 0 }}>{doc.title || (en ? "Creative studio" : "Studio créatif")}</h3></div>
          <button className="ai-icon-btn" aria-label={en ? "Close studio" : "Fermer le studio"} onClick={onClose}><X /></button>
        </div>
        <div className="stage-tabs" role="tablist" aria-label={en ? "Studio tabs" : "Onglets du studio"}>
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => { setTab(t.id); k.touch(); }}>
              {t.id === "image" ? <ImageIcon size={18} /> : t.id === "schema" ? <Network size={18} /> : t.id === "storyboard" ? <Clapperboard size={18} /> : <FileText size={18} />}
              {en ? t.en : t.fr}
            </button>
          ))}
        </div>
        {tab === "image" && <ImageTab initialPrompt={doc.body} />}
        {tab === "schema" && <SchemaTab initialBody={doc.body} />}
        {tab === "storyboard" && <StoryboardTab initialBody={doc.body} />}
        {tab === "doc" && <DocTab initialBody={doc.body} goSchema={(body) => setTab("schema")} />}
        <div style={{ marginTop: 18 }}>
          <span className="eyebrow">{en ? "SEE ALSO ON THE KIOSK" : "VOIR AUSSI SUR LA BORNE"}</span>
          <div className="pill-row" style={{ marginTop: 10 }}>
            {STUDIO_LINKS.map(l => (
              <button key={l.screen} className="pill" style={{ cursor: "pointer" }} onClick={() => { onClose(); k.go(l.screen); }}>
                {en ? l.en : l.fr} <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageTab({ initialPrompt }: { initialPrompt: string }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState("photorealiste");
  const [imgUrl, setImgUrl] = useState("");
  const [imgText, setImgText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [animate, setAnimate] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function generate() {
    if (busy || !prompt.trim()) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true); setErr(""); k.touch();
    try {
      const styled = `${prompt.trim()} (${style === "photorealiste" ? "photorealistic" : style === "schema" ? "clean technical diagram" : style === "aquarelle" ? "watercolor" : "flat infographic illustration"})`;
      const r = await generateStudioImage(styled, k.lang, abort.signal);
      if (abort.signal.aborted) return;
      setImgUrl(r.raw); setImgText(r.text); logEvent("image_generated", {});
    } catch {
      if (!abort.signal.aborted) setErr(en ? "Image generation temporarily unavailable." : "Génération d’image momentanément indisponible.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  // Génération immédiate à l’ouverture quand un sujet est déjà fourni.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (initialPrompt.trim()) void generate(); }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !imgUrl) return;
    let raf = 0; let cancelled = false;
    const el = new Image();
    let logo: HTMLImageElement | null = null;
    void aglLogo().then(l => { logo = l; });
    el.onload = () => {
      if (cancelled) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const W = (cv.width = 960), H = (cv.height = 600);
      const cover = (s: number, dx: number, dy: number) => {
        const sc = Math.max(W / el.width, H / el.height) * s;
        const w = el.width * sc, h = el.height * sc;
        ctx.drawImage(el, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h);
      };
      // Le logo et la charte AGL restent fixes pendant le mouvement de caméra.
      if (!animate) { cover(1, 0, 0); drawBrand(ctx, W, H, logo); void aglLogo().then(l => { if (!cancelled) { cover(1, 0, 0); drawBrand(ctx, W, H, l); } }); return; }
      const t0 = performance.now();
      const frame = (t: number) => {
        if (cancelled) return;
        const p = ((t - t0) % 12000) / 12000;
        cover(1 + p * 0.18, (p - 0.5) * 60, (p - 0.5) * 30);
        drawBrand(ctx, W, H, logo);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    el.src = imgUrl;
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [imgUrl, animate]);

  function download() {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "Africa Global Logistics-studio-image.png";
    a.click();
  }

  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#d4dfef" }}>
        {en ? "Image subject" : "Sujet de l’image"}
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} maxLength={800} style={{ border: "1px solid #ffffff2b", background: "#0f203a", minHeight: 60, borderRadius: 12, padding: 14, color: "white", fontSize: 16 }} />
      </label>
      <div className="button-row" style={{ alignItems: "center" }}>
        <select value={style} onChange={e => setStyle(e.target.value)} aria-label={en ? "Visual style" : "Style visuel"} style={{ minHeight: 60, borderRadius: 12, background: "#0f203a", border: "1px solid #ffffff2b", color: "white", padding: "0 14px", fontSize: 15 }}>
          <option value="photorealiste">{en ? "Photorealistic" : "Photoréaliste"}</option>
          <option value="schema">{en ? "Technical diagram" : "Schéma technique"}</option>
          <option value="aquarelle">{en ? "Watercolor" : "Aquarelle"}</option>
          <option value="infographie">{en ? "Infographic" : "Infographie"}</option>
        </select>
        <button className="brand-btn" disabled={busy || !prompt.trim()} onClick={generate}><Sparkles size={18} />{busy ? (en ? "Creating…" : "Création…") : (en ? "Generate image" : "Générer l’image")}</button>
        {imgUrl && <button className="text-action" onClick={() => setAnimate(!animate)}>{animate ? (en ? "Pause motion" : "Suspendre l’animation") : (en ? "Animate" : "Animer")}</button>}
      </div>
      {err && <p className="ai-status" role="alert">{err}</p>}
      {imgUrl && (
        <div style={{ marginTop: 16 }}>
          <canvas ref={canvasRef} role="img" aria-label={en ? "Generated visual" : "Visuel généré"} style={{ width: "100%", borderRadius: 16 }} />
          {imgText && <p className="ai-status" style={{ marginTop: 8 }}>{imgText}</p>}
          <div className="button-row"><button className="outline-btn" onClick={download}><Download size={18} />PNG</button></div>
        </div>
      )}
      <p className="ai-status" style={{ marginTop: 12 }}>{en ? "Illustration generated on demand — indicative visual, not a contractual photo." : "Illustration générée à la demande — visuel indicatif, pas une photo contractuelle."}</p>
    </div>
  );
}

export function SchemaTab({ initialBody }: { initialBody: string }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const [body, setBody] = useState(initialBody);
  const steps = useMemo(() => splitSteps(body), [body]);
  const W = Math.max(640, steps.length * 220);
  function download() {
    const svg = document.getElementById("agl-schema-svg")?.outerHTML;
    if (!svg) return;
    downloadFile("Africa Global Logistics-schema.svg", `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, "image/svg+xml");
  }
  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#d4dfef" }}>
        {en ? "Chain steps (one per line, or separated by arrows)" : "Étapes de la chaîne (une par ligne, ou séparées par des flèches)"}
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={4000} style={{ border: "1px solid #ffffff2b", background: "#0f203a", minHeight: 70, borderRadius: 12, padding: 14, color: "white", fontSize: 16 }} />
      </label>
      {steps.length > 0 ? (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <svg id="agl-schema-svg" viewBox={`0 0 ${W} 150`} width={W} height={150} role="img" aria-label={en ? "Logistics diagram" : "Schéma logistique"}>
            {steps.map((s, i) => (
              <g key={i}>
                <rect x={20 + i * 220} y={35} width={170} height={80} rx={16} fill="#0f203a" stroke={i === 0 || i === steps.length - 1 ? "#EED58E" : "#3a6ea5"} strokeWidth={i === 0 || i === steps.length - 1 ? 3 : 2} />
                <text x={105 + i * 220} y={72} textAnchor="middle" fill="#EED58E" fontSize={13} fontWeight={800}>{s.slice(0, 24)}</text>
                <text x={105 + i * 220} y={94} textAnchor="middle" fill="#9dc0e8" fontSize={11}>{s.length > 24 ? `${s.slice(24, 44)}…` : `${i + 1} / ${steps.length}`}</text>
                {i < steps.length - 1 && <text x={205 + i * 220} y={80} textAnchor="middle" fill="#EED58E" fontSize={26} fontWeight={800}>→</text>}
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <p className="ai-status" style={{ marginTop: 16 }}>{en ? "Describe the chain steps above to draw the diagram." : "Décrivez les étapes ci-dessus pour dessiner le schéma."}</p>
      )}
      <div className="button-row"><button className="outline-btn" disabled={!steps.length} onClick={() => { download(); k.touch(); }}><Download size={18} />SVG</button></div>
      <p className="ai-status" style={{ marginTop: 12 }}>{en ? "Diagram assembled on the kiosk from your description — working illustration." : "Schéma assemblé sur la borne depuis votre description — illustration de travail."}</p>
    </div>
  );
}

export function StoryboardTab({ initialBody }: { initialBody: string }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const lang = k.lang;
  const scenes = useMemo(() => splitScenes(initialBody), [initialBody]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [busyScene, setBusyScene] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [cover, setCover] = useState("");
  // Visuel de couverture généré aussitôt : le montage est prêt sans attendre.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { const first = scenes[0]; if (!first) return; let stop = false; void generateStudioImage(`cinematic keyframe, ${first.slice(0, 300)}`, lang).then(r => { if (!stop) { setCover(r.image); logEvent("image_generated", {}); } }).catch(() => {}); return () => { stop = true; }; }, []);
  useEffect(() => {
    if (!playing || !scenes.length) return;
    const sc = scenes[sceneIdx % scenes.length];
    stopServerVoice();
    if (sc) void playServerVoice(sc.slice(0, 400), lang);
    const id = setInterval(() => setSceneIdx(i => (i + 1) % scenes.length), 7000);
    return () => { clearInterval(id); stopServerVoice(); };
  }, [playing, sceneIdx, scenes, lang]);

  async function illustrate(i: number) {
    const sc = scenes[i];
    if (busyScene !== null || !sc) return;
    setBusyScene(i); k.touch();
    try {
      const r = await generateStudioImage(`cinematic keyframe, ${sc.slice(0, 300)}`, lang);
      setImages(m => ({ ...m, [i]: r.image }));
    } catch { /* error shown inline below */ setImages(m => ({ ...m, [i]: "error" })); }
    finally { setBusyScene(null); }
  }

  if (!scenes.length) return <p className="ai-status">{en ? "Describe a cinematic scene to build the storyboard." : "Décrivez une scène cinématique pour construire le storyboard."}</p>;
  const current = sceneIdx % scenes.length;
  return (
    <div>
      <div className="button-row" style={{ marginTop: 0 }}>
        <button className={`brand-btn ${playing ? "live-on" : ""}`} onClick={() => { k.touch(); if (playing) { setPlaying(false); } else { setSceneIdx(0); setPlaying(true); logEvent("storyboard_played", { scenes: scenes.length }); } }} aria-live="polite">
          {playing ? <><Square size={18} /> {en ? "Stop montage" : "Arrêter le montage"}</> : <><Play size={18} /> {en ? "Play montage" : "Lancer le montage"}</>}
        </button>
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {scenes.map((s, i) => (
          <div key={i} className="panel" style={{ padding: 18, borderColor: playing && i === current ? "#EED58E" : undefined }}>
            <span className="eyebrow">{en ? `SCENE ${i + 1}` : `SCÈNE ${i + 1}`}</span>
            <p style={{ lineHeight: 1.6, marginTop: 8 }}>{s}</p>
            {images[i] && images[i] !== "error" && <img src={images[i]} alt={en ? `Scene ${i + 1} visual` : `Visuel scène ${i + 1}`} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginTop: 10 }} />}
            {images[i] === "error" && <p className="ai-status" role="alert">{en ? "Illustration unavailable for this scene." : "Illustration indisponible pour cette scène."}</p>}
            <div className="button-row">
              <button className="text-action" disabled={busyScene !== null} onClick={() => void illustrate(i)}><ImageIcon size={16} />{busyScene === i ? (en ? "Creating…" : "Création…") : (en ? "Illustrate" : "Illustrer")}</button>
              <button className="text-action" onClick={() => { stopServerVoice(); void playServerVoice(s.slice(0, 400), lang); }}><Volume2 size={16} />{en ? "Narrate" : "Raconter"}</button>
            </div>
          </div>
        ))}
      </div>
      {playing && (
        <div style={{ position: "fixed", inset: 0, background: "#000f", zIndex: 90, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }} role="dialog" aria-modal="true" aria-label={en ? "Montage player" : "Lecteur du montage"}>
          <img key={current} src={images[current] && images[current] !== "error" ? images[current] : cover || "/assets/template/image26.webp"} alt="" className="kb-zoom" style={{ width: "min(960px,100%)", maxHeight: "56dvh", objectFit: "cover", borderRadius: 20 }} />
          <p style={{ maxWidth: 760, fontSize: 20, lineHeight: 1.6, marginTop: 22 }}>{scenes[current]}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>{scenes.map((_, i) => <span key={i} style={{ width: i === current ? 28 : 10, height: 10, borderRadius: 99, background: i === current ? "#EED58E" : "#ffffff33" }} />)}</div>
          <button className="brand-btn" style={{ marginTop: 24 }} onClick={() => setPlaying(false)}><Square size={18} />{en ? "Stop" : "Arrêter"}</button>
          <p className="ai-status" style={{ marginTop: 12 }}>{en ? "Montage assembled on the kiosk (images, motion, narration) — not an external video render." : "Montage assemblé sur la borne (images, mouvements, narration) — pas un rendu vidéo externe."}</p>
        </div>
      )}
    </div>
  );
}

export function DocTab({ initialBody, goSchema }: { initialBody: string; goSchema: (body: string) => void }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const [body, setBody] = useState(initialBody);
  const [reading, setReading] = useState(false);
  useEffect(() => () => stopServerVoice(), []);
  function toggleRead() {
    if (reading) { stopServerVoice(); setReading(false); return; }
    if (!body.trim()) return;
    setReading(true); k.touch();
    void playServerVoice(body.slice(0, 1200), k.lang).then(() => setReading(false));
  }
  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#d4dfef" }}>
        {en ? "Working document" : "Document de travail"}
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} maxLength={4000} style={{ border: "1px solid #ffffff2b", background: "#0f203a", minHeight: 180, borderRadius: 12, padding: 14, color: "white", fontSize: 16, lineHeight: 1.6 }} />
      </label>
      <div className="button-row">
        <button className="outline-btn" disabled={!body.trim()} onClick={() => { downloadFile("Africa Global Logistics-studio-document.txt", body); k.touch(); }}><Download size={18} />TXT</button>
        <button className="brand-btn" disabled={!body.trim()} onClick={() => goSchema(body)}><Network size={18} />{en ? "Turn into diagram" : "Transformer en schéma"}</button>
        <button className="text-action" disabled={!body.trim()} onClick={toggleRead}><Volume2 size={16} />{reading ? (en ? "Stop narration" : "Arrêter la lecture") : (en ? "Read aloud" : "Lire à voix haute")}</button>
      </div>
    </div>
  );
}
