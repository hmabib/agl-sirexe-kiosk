"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Environment, Html, Lightformer } from "@react-three/drei";
import { ACESFilmicToneMapping, Box3, Group, PCFShadowMap, Vector3 } from "three";
import { Layers, Play, Square, Boxes, Tags, Focus, RotateCcw, Rotate3D, Move } from "lucide-react";
import type { Model3DKind, Part3D } from "@/lib/actions";
import { playServerVoice, stopServerVoice } from "@/lib/live";
import { sfx } from "@/lib/sound";

import type { V3, PartDef } from "@/lib/model3d";
import { detailedModel } from "@/lib/model3d-detail";
import { Model3DMeshes, partBounds } from "./Model3DMeshes";
const STACK = ["#a43c2e", "#295977", "#c39a40", "#476b5b", "#e8e8e8", "#675368"];
type View = "perspective" | "side" | "top";
const NO_PARTS: Part3D[] = [];

// Assemblage personnalisé : chaque pièce s’écarte du centre de l’objet.
function customParts(parts: Part3D[]): PartDef[] {
  const pos = parts.map(p => p.position ?? [0, 0, 0] as V3);
  const c = [0, 1, 2].map(i => pos.reduce((a, p) => a + p[i], 0) / Math.max(1, pos.length));
  return parts.map((p, i) => {
    const d = [0, 1, 2].map(k => pos[i][k] - c[k]); const n = Math.hypot(...d) || 1;
    const dir = (Math.hypot(...d) < 0.01 ? [0, 1, 0] : d.map(v => v / n)) as V3;
    return { name: p.name, explanation: p.explanation, color: p.color ?? STACK[i % STACK.length], finish: "paint", explode: dir.map(v => v * 1.8) as V3, meshes: [{ shape: p.shape ?? "box", size: p.size ?? [1, 1, 1], pos: pos[i] }] };
  });
}

function Part({ part, bounds, index, target, active, dimmed, annotate, onSelect, labels }: { part: PartDef; bounds: Box3; index: number; target: number; active: boolean; dimmed: boolean; annotate: boolean; onSelect: () => void; labels: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<Group>(null);
  const progress = useRef(0);
  const invalidate = useThree(s => s.invalidate);
  const center = bounds.getCenter(new Vector3());
  useFrame((_, dt) => {
    if (!ref.current) return;
    progress.current += (target - progress.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 5));
    ref.current.position.set(...part.explode.map(v => v * progress.current) as V3);
    if (Math.abs(target - progress.current) > 0.0001) invalidate();
  });
  return <group ref={ref} onClick={e => { if (e.delta > 5) return; e.stopPropagation(); onSelect(); }}>
    <Model3DMeshes part={part} active={active} dimmed={dimmed} />
    {annotate && <Html position={[center.x, bounds.max.y + 0.45, center.z]} center zIndexRange={[20, 0]} portal={labels as React.RefObject<HTMLElement>}>
      <button className={`x3d-pin label ${active ? "on" : ""} ${dimmed ? "dim" : ""}`} onClick={onSelect} aria-label={`${index + 1}. ${part.name}`}><b>{index + 1}</b><span>{part.name}</span></button>
    </Html>}
  </group>;
}

function Camera({ bounds, focus, view, reset, rotate, onInteract }: { bounds: Box3; focus: Box3 | null; view: View; reset: number; rotate: boolean; onInteract: () => void }) {
  const ref = useRef<CameraControls>(null);
  const initialized = useRef(false);
  const { size, invalidate } = useThree();
  const radius = bounds.getSize(new Vector3()).length() / 2;
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    const target = focus ?? bounds;
    const center = target.getCenter(new Vector3());
    const direction = new Vector3(...(view === "top" ? [0, 1, 0.001] : view === "side" ? [0, 0.08, 1] : [0.9, 0.58, 1.3])).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
    const up = new Vector3().crossVectors(direction, right);
    const tangent = Math.tan(36 * Math.PI / 360), aspect = size.width / Math.max(size.height, 1);
    let distance = 1;
    // Fit all projected corners, including long convoys on portrait screens.
    for (const x of [target.min.x, target.max.x]) for (const y of [target.min.y, target.max.y]) for (const z of [target.min.z, target.max.z]) {
      const corner = new Vector3(x, y, z).sub(center);
      distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / (tangent * aspect), Math.abs(corner.dot(up)) / tangent));
    }
    const position = center.clone().addScaledVector(direction, distance * 1.28);
    void controls.setLookAt(...position.toArray(), ...center.toArray(), initialized.current);
    initialized.current = true;
  }, [bounds, focus, view, reset, size.width, size.height]);
  useFrame((_, dt) => { if (rotate && ref.current) { ref.current.azimuthAngle += Math.min(dt, 0.1) * 0.12; invalidate(); } });
  return <CameraControls ref={ref} makeDefault smoothTime={0.45} minDistance={Math.max(0.8, radius * 0.12)} maxDistance={radius * 12} minPolarAngle={0.001} maxPolarAngle={Math.PI * 0.49} onControlStart={onInteract} />;
}

function Ground({ floor, radius }: { floor: number; radius: number }) {
  const ref = useRef<Group>(null);
  const invalidate = useThree(s => s.invalidate);
  useFrame((_, dt) => { if (ref.current) { ref.current.position.y += (floor - ref.current.position.y) * (1 - Math.exp(-Math.min(dt, 0.1) * 7)); if (Math.abs(floor - ref.current.position.y) > 0.0001) invalidate(); } });
  return <group ref={ref} position={[0, floor, 0]}><mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[radius * 200, radius * 200]} /><meshStandardMaterial color="#aeb8b8" roughness={0.95} /></mesh></group>;
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export function Exploded3D({ object, parts, intro, en, height }: { object: Model3DKind; parts: Part3D[]; intro?: string; en: boolean; height?: number }) {
  const supplied = parts.length ? parts : NO_PARTS;
  const defs = useMemo<PartDef[]>(() => object === "custom" ? customParts(supplied) : detailedModel(object).map((p, i) => supplied[i] ? { ...p, name: supplied[i].name || p.name, explanation: supplied[i].explanation || p.explanation } : p), [object, supplied]);
  const boxes = useMemo(() => defs.map(partBounds), [defs]);
  const [exploded, setExploded] = useState(false);
  const [spread, setSpread] = useState(1);
  const [active, setActive] = useState<number | null>(null);
  const [touring, setTouring] = useState(false);
  const [annotate, setAnnotate] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [rotate, setRotate] = useState(false);
  const [view, setView] = useState<View>("perspective");
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const labels = useRef<HTMLDivElement>(null);
  const amount = exploded ? spread : 0;
  const posed = useMemo(() => boxes.map((box, i) => box.clone().translate(new Vector3(...defs[i].explode).multiplyScalar(amount))), [boxes, defs, amount]);
  const bounds = useMemo(() => {
    const result = new Box3(); posed.forEach(b => result.union(b));
    return result.isEmpty() ? new Box3(new Vector3(-1, 0, -1), new Vector3(1, 2, 1)) : result;
  }, [posed]);
  const radius = Math.max(2, bounds.getSize(new Vector3()).length() / 2);
  const current = active === null ? null : defs[active];
  const focus = active !== null && focusMode ? posed[active] ?? null : null;
  const select = (i: number) => { setActive(i); setTouring(false); setRotate(false); sfx("tick"); };
  const resetView = () => { setActive(null); setTouring(false); setRotate(false); setExploded(false); setSpread(1); setView("perspective"); setReset(v => v + 1); };

  useEffect(() => {
    if (!touring) return;
    let i = 0, stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = async () => {
      if (stopped) return;
      if (i >= defs.length) { setTouring(false); setActive(null); return; }
      setActive(i); sfx("tick");
      const started = Date.now();
      try { await playServerVoice(`${defs[i].name}. ${defs[i].explanation}`, en ? "en" : "fr"); } catch { /* Written explanations remain available. */ }
      if (stopped) return;
      i++; timer = setTimeout(step, Math.max(0, 3800 - (Date.now() - started)));
    };
    void step();
    return () => { stopped = true; clearTimeout(timer); stopServerVoice(); };
  }, [touring, defs, en]);
  useEffect(() => () => stopServerVoice(), []);
  const onReady = useMemo(() => () => setReady(true), []);

  return <div className="x3d" data-model={object} data-ready={ready}>
    <div className="x3d-stage" style={height ? { height } : undefined}>
      <Canvas frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [radius * 2, radius, radius * 2], fov: 36, near: 0.05, far: radius * 250 }} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.08 }} onPointerMissed={() => setActive(null)} fallback={<div className="x3d-fallback">{en ? "3D is unavailable on this device. Explore the parts below." : "La 3D est indisponible sur cet appareil. Découvrez les pièces ci-dessous."}</div>}>
        <color attach="background" args={["#c6cecc"]} />
        <fog attach="fog" args={["#c6cecc", radius * 7, radius * 22]} />
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.8} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[12, 8, 1]} color="#fff9ec" />
          <Lightformer intensity={1.4} position={[-8, 4, 4]} rotation-y={Math.PI / 2} scale={[10, 5, 1]} color="#d8e7f0" />
          <Lightformer intensity={2} position={[8, 3, -4]} rotation-y={-Math.PI / 2} scale={[5, 8, 1]} color="#ffffff" />
        </Environment>
        <hemisphereLight args={["#f3f6f6", "#777c72", 1.15]} />
        <directionalLight castShadow position={[-radius * 0.7, radius * 2, radius * 1.4]} intensity={3.2} color="#fff3df" shadow-mapSize={[2048, 2048]} shadow-camera-left={-radius * 1.5} shadow-camera-right={radius * 1.5} shadow-camera-top={radius * 1.5} shadow-camera-bottom={-radius * 1.5} shadow-camera-near={0.1} shadow-camera-far={radius * 8} shadow-normalBias={0.035} shadow-bias={-0.00015} />
        <directionalLight position={[radius, radius, -radius]} intensity={0.8} color="#d2e5f5" />
        <Camera bounds={bounds} focus={focus} view={view} reset={reset} rotate={rotate} onInteract={() => setRotate(false)} />
        {defs.map((part, i) => <Part key={i} part={part} bounds={boxes[i]} index={i} target={amount} active={active === i} dimmed={focusMode && active !== null && active !== i} annotate={annotate} onSelect={() => select(i)} labels={labels} />)}
        <Ground floor={bounds.min.y - 0.035} radius={radius} />
        <SceneReady onReady={onReady} />
      </Canvas>
      <div ref={labels} className="x3d-labels" />
      <div className="x3d-scene-tag"><span />{en ? "EQUIPMENT EXPLORER" : "EXPLORATION DES ÉQUIPEMENTS"}<small>{exploded ? (en ? "Exploded view" : "Vue décomposée") : (en ? "Assembled view" : "Vue assemblée")}</small></div>
      <div className="x3d-camera-controls" aria-label={en ? "Camera views" : "Vues de la caméra"}>
        {(["perspective", "side", "top"] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => { setView(v); setRotate(false); setActive(null); setReset(n => n + 1); }}>{v === "perspective" ? "3/4" : v === "side" ? (en ? "Side" : "Profil") : (en ? "Top" : "Dessus")}</button>)}
        <button onClick={resetView} aria-label={en ? "Reset view" : "Réinitialiser la vue"}><RotateCcw size={15} /></button>
      </div>
      <div className="x3d-bottom"><p className="x3d-gesture"><Move size={14} />{en ? "Drag to orbit · Pinch to zoom" : "Glissez pour tourner · Pincez pour zoomer"}</p>
        <div className="x3d-controls">
          <button aria-pressed={exploded} onClick={() => { setExploded(v => !v); setActive(null); setTouring(false); sfx("whoosh"); }}>{exploded ? <Boxes size={16} /> : <Layers size={16} />}{exploded ? (en ? "Assemble" : "Assembler") : (en ? "Explode" : "Décomposer")}</button>
          <button aria-pressed={touring} onClick={() => { if (touring) { setTouring(false); stopServerVoice(); } else { setExploded(true); setRotate(false); setFocusMode(true); setTouring(true); } }}>{touring ? <Square size={16} /> : <Play size={16} />}{touring ? (en ? "Stop tour" : "Arrêter la visite") : (en ? "Guided tour" : "Visite guidée")}</button>
          <button aria-pressed={annotate} onClick={() => setAnnotate(v => !v)}><Tags size={16} />{en ? "Labels" : "Annotations"}</button>
          <button aria-pressed={rotate} onClick={() => setRotate(v => !v)} aria-label={en ? "Auto rotation" : "Rotation automatique"}><Rotate3D size={17} /></button>
        </div>
      </div>
    </div>
    <div className="x3d-side">
      <div className="x3d-section-title"><span className="eyebrow">{en ? "COMPONENTS" : "COMPOSANTS"}</span><span>{String(defs.length).padStart(2, "0")}</span></div>
      {intro && <p className="x3d-intro">{intro}</p>}
      <div className="x3d-inspect-controls"><button aria-pressed={focusMode} onClick={() => setFocusMode(v => !v)}><Focus size={15} />{en ? "Isolate selection" : "Isoler la sélection"}</button>{active !== null && <button onClick={() => { setActive(null); setTouring(false); }}>{en ? "Show all" : "Tout voir"}</button>}</div>
      {exploded && <label className="x3d-spread">{en ? "Part separation" : "Écartement des pièces"}<input aria-label={en ? "Part separation" : "Écartement des pièces"} type="range" min="0.15" max="1.5" step="0.05" value={spread} onChange={e => setSpread(Number(e.target.value))} /></label>}
      <ol className="x3d-list">{defs.map((p, i) => <li key={i}><button aria-pressed={active === i} className={active === i ? "on" : ""} onClick={() => select(i)}><i>{String(i + 1).padStart(2, "0")}</i><span>{p.name}</span></button></li>)}</ol>
      {current ? <div className="x3d-callout" aria-live="polite"><span className="eyebrow">{en ? "SELECTED COMPONENT" : "PIÈCE SÉLECTIONNÉE"}</span><h4>{current.name}</h4><p>{current.explanation}</p></div> : <p className="ai-status">{en ? "Select a component to inspect its details and purpose." : "Sélectionnez un composant pour observer ses détails et comprendre son rôle."}</p>}
      <p className="x3d-model-note">{en ? "Illustrative reconstruction, not a manufacturer’s technical model." : "Reconstitution illustrative, sans valeur de plan constructeur."}</p>
    </div>
  </div>;
}
