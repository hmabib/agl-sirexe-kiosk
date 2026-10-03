"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { Layers, Play, Square, Boxes } from "lucide-react";
import type { Model3DKind, Part3D, PartShape } from "@/lib/actions";
import { playServerVoice, stopServerVoice } from "@/lib/live";
import { sfx } from "@/lib/sound";

type V3 = [number, number, number];
interface Mesh { shape: PartShape; size: V3; pos: V3; rot?: V3; color?: string }
interface PartDef { name: string; explanation: string; color: string; explode: V3; meshes: Mesh[] }

const box = (size: V3, pos: V3, color?: string): Mesh => ({ shape: "box", size, pos, color });
const wheel = (pos: V3, r = 0.5, w = 0.4): Mesh => ({ shape: "cylinder", size: [r, w, r], pos, rot: [Math.PI / 2, 0, 0], color: "#151a22" });
const STACK = ["#b23a2a", "#1f5fa8", "#d9a400", "#2e7d5b", "#e8e8e8", "#7a3fa0"];

// Objets logistiques modélisés pièce par pièce ; « explode » = direction de décomposition.
const PRESETS: Record<Exclude<Model3DKind, "custom">, PartDef[]> = {
  container: [
    { name: "Plancher", explanation: "Plancher en bois dur posé sur des traverses en acier : il répartit la charge utile, jusqu’à environ 28 tonnes pour un 20 pieds.", color: "#6b4f2a", explode: [0, -1.4, 0], meshes: [box([6, 0.16, 2.4], [0, 0.08, 0])] },
    { name: "Marchandise", explanation: "Marchandise palettisée et arrimée : un bon calage évite les déplacements de charge pendant le transport maritime.", color: "#EED58E", explode: [0, 0.6, 0], meshes: [-1.9, 0, 1.9].map(x => box([1.5, 1.3, 1.1], [x, 0.81, 0])) },
    { name: "Parois latérales", explanation: "Parois en acier ondulé Corten : elles apportent la rigidité qui permet d’empiler les conteneurs sur plusieurs hauteurs.", color: "#b23a2a", explode: [0, 0, 1.8], meshes: [box([6, 2.4, 0.06], [0, 1.36, -1.2]), box([6, 2.4, 0.06], [0, 1.36, 1.2])] },
    { name: "Toit", explanation: "Toit en tôle d’acier étanche, protégeant la marchandise des intempéries et des embruns.", color: "#9c3022", explode: [0, 1.8, 0], meshes: [box([6, 0.08, 2.46], [0, 2.6, 0])] },
    { name: "Face avant", explanation: "Face avant fermée et renforcée, côté opposé aux portes.", color: "#a8352a", explode: [-1.8, 0, 0], meshes: [box([0.06, 2.4, 2.4], [-3, 1.36, 0])] },
    { name: "Portes et scellés", explanation: "Portes arrière à barres de verrouillage : le scellé posé après empotage garantit l’intégrité du chargement jusqu’au dédouanement.", color: "#c2442f", explode: [2, 0, 0], meshes: [box([0.06, 2.4, 1.18], [3, 1.36, -0.6]), box([0.06, 2.4, 1.18], [3, 1.36, 0.6])] },
    { name: "Pièces de coin", explanation: "Pièces de coin normalisées ISO : les portiques, cavaliers et verrous tournants s’y accrochent pour lever et arrimer le conteneur.", color: "#EED58E", explode: [0, -0.6, 0], meshes: [[-2.95, -1.15], [-2.95, 1.15], [2.95, -1.15], [2.95, 1.15]].flatMap(([x, z]) => [box([0.18, 0.14, 0.16], [x, 0.07, z]), box([0.18, 0.14, 0.16], [x, 2.66, z])]) },
  ],
  truck: [
    { name: "Cabine du tracteur", explanation: "Cabine du tracteur routier : le chauffeur y suit l’itinéraire validé par l’étude de route et reste en contact avec l’escorte.", color: "#f2f2f2", explode: [2.6, 1, 0], meshes: [box([2.2, 2.6, 2.5], [6.6, 2.1, 0])] },
    { name: "Châssis tracteur", explanation: "Châssis du tracteur, dimensionné pour la puissance de traction nécessaire aux convois lourds.", color: "#2a2f38", explode: [1.6, -1.2, 0], meshes: [box([4.4, 0.35, 1], [5.4, 0.95, 0])] },
    { name: "Sellette d’attelage", explanation: "Sellette d’attelage : le point de liaison entre le tracteur et la remorque, qui transmet une partie du poids.", color: "#EED58E", explode: [0, 1.6, 0], meshes: [{ shape: "cylinder", size: [0.55, 0.16, 0.55], pos: [4.4, 1.2, 0], color: "#EED58E" }] },
    { name: "Remorque surbaissée", explanation: "Remorque surbaissée : son plateau bas abaisse le centre de gravité et libère la hauteur sous les ponts et les lignes.", color: "#3b4250", explode: [-1.2, -1.2, 0], meshes: [box([11, 0.35, 2.6], [-2.2, 0.95, 0]), box([1.6, 0.6, 2.4], [3.6, 1.25, 0])] },
    { name: "Essieux et roues", explanation: "Essieux multiples : ils répartissent la charge pour respecter le poids autorisé par essieu et préserver la chaussée.", color: "#151a22", explode: [0, -1.8, 0], meshes: [7.2, 5.2, 4.2, -4, -5.2, -6.4, -7.6].flatMap(x => [wheel([x, 0.5, -1.1]), wheel([x, 0.5, 1.1])]) },
    { name: "Équipement minier", explanation: "La charge exceptionnelle : ici un équipement minier. Son gabarit et sa masse déterminent l’itinéraire, l’escorte et les autorisations.", color: "#d9a400", explode: [0, 2.6, 0], meshes: [box([6, 2.6, 2.6], [-2.4, 2.45, 0]), { shape: "cylinder", size: [0.9, 2.62, 0.9], pos: [-2.4, 3.9, 0], rot: [Math.PI / 2, 0, 0], color: "#b88a00" }] },
  ],
  crane: [
    { name: "Jambes côté mer", explanation: "Jambes côté mer : elles roulent sur des rails le long du quai pour positionner le portique face à chaque baie du navire.", color: "#2f6db5", explode: [2.5, 0, 0], meshes: [box([0.6, 14, 0.6], [4, 7, -5]), box([0.6, 14, 0.6], [4, 7, 5])] },
    { name: "Jambes côté terre", explanation: "Jambes côté terre, sous lesquelles circulent les camions et cavaliers qui évacuent les conteneurs.", color: "#2f6db5", explode: [-2.5, 0, 0], meshes: [box([0.6, 14, 0.6], [-6, 7, -5]), box([0.6, 14, 0.6], [-6, 7, 5])] },
    { name: "Portique", explanation: "Poutres du portique : la structure qui relie les jambes et porte la flèche.", color: "#3a7cc8", explode: [0, 1.8, 0], meshes: [box([10.6, 0.8, 0.8], [-1, 14.2, -5]), box([10.6, 0.8, 0.8], [-1, 14.2, 5]), box([0.8, 0.8, 10.8], [4, 14.2, 0]), box([0.8, 0.8, 10.8], [-6, 14.2, 0])] },
    { name: "Flèche", explanation: "Flèche : elle s’avance au-dessus du navire pour atteindre les rangées de conteneurs les plus éloignées du quai.", color: "#4a8ad6", explode: [3, 3, 0], meshes: [box([30, 1, 1.2], [9, 15.4, 0])] },
    { name: "Chariot", explanation: "Chariot : il se déplace le long de la flèche et porte le système de levage.", color: "#EED58E", explode: [0, 2.6, 2.4], meshes: [box([2, 1, 2], [14, 14.4, 0])] },
    { name: "Cabine du grutier", explanation: "Cabine du grutier, suspendue sous le chariot pour une vue directe sur le conteneur pendant la manœuvre.", color: "#f2f2f2", explode: [0, -2, -3.4], meshes: [box([1.8, 1.6, 1.8], [11.8, 13, 0])] },
    { name: "Spreader", explanation: "Spreader (palonnier) : il se verrouille sur les quatre pièces de coin du conteneur grâce à des verrous tournants.", color: "#EED58E", explode: [0, -1.4, 3.4], meshes: [box([6.2, 0.4, 2.5], [14, 10.6, 0]), { shape: "cylinder", size: [0.04, 3.6, 0.04], pos: [14, 12.5, -0.8], color: "#cfd6e0" }, { shape: "cylinder", size: [0.04, 3.6, 0.04], pos: [14, 12.5, 0.8], color: "#cfd6e0" }] },
    { name: "Conteneur levé", explanation: "Le conteneur en cours de levée : un portique moderne enchaîne plusieurs dizaines de mouvements par heure.", color: "#b23a2a", explode: [0, -3.2, 0], meshes: [box([6, 2.6, 2.4], [14, 9.1, 0])] },
  ],
  ship: [
    { name: "Coque", explanation: "Coque du porte-conteneurs : ses ballasts règlent l’assiette et la stabilité selon le chargement.", color: "#1b365f", explode: [0, -3.4, 0], meshes: [box([34, 5, 8], [-1, 2.5, 0]), { shape: "cone", size: [4, 6, 4], pos: [19, 2.5, 0], rot: [0, 0, -Math.PI / 2], color: "#1b365f" }] },
    { name: "Baies de conteneurs", explanation: "Baies de conteneurs : le plan de chargement place les plus lourds en bas et respecte l’ordre des escales de déchargement.", color: "#b23a2a", explode: [0, 4.4, 0], meshes: Array.from({ length: 7 }, (_, b) => [0, 1].flatMap(t => [-2.5, 0, 2.5].map((z, k) => box([3.6, 2.4, 2.3], [-8 + b * 4, 6.3 + t * 2.5, z], STACK[(b + t * 2 + k) % STACK.length])))).flat() },
    { name: "Château et passerelle", explanation: "Château : il abrite la passerelle de navigation et les logements de l’équipage.", color: "#eef1f5", explode: [-4.4, 3, 0], meshes: [box([5, 8, 7], [-14, 9, 0])] },
    { name: "Cheminée", explanation: "Cheminée : évacuation des gaz du moteur principal, aujourd’hui équipée de systèmes de traitement des émissions.", color: "#b23a2a", explode: [-2.4, 5, 0], meshes: [{ shape: "cylinder", size: [1, 3, 1], pos: [-15.5, 14.5, 0], color: "#b23a2a" }] },
    { name: "Hélice", explanation: "Hélice : entraînée par le moteur principal, elle propulse le navire ; sa vitesse est optimisée pour la consommation.", color: "#EED58E", explode: [-4.4, -1.2, 0], meshes: [{ shape: "cylinder", size: [1.6, 0.4, 1.6], pos: [-19, 1.6, 0], rot: [0, 0, Math.PI / 2], color: "#EED58E" }] },
    { name: "Gouvernail", explanation: "Gouvernail : il oriente le navire, notamment lors des manœuvres d’accostage assistées par les remorqueurs.", color: "#3b4250", explode: [-5.6, 0, 0], meshes: [box([0.3, 3, 1.6], [-19.9, 2.2, 0])] },
  ],
  wagon: [
    { name: "Bogies", explanation: "Bogies : chariots pivotants qui portent le wagon et lui permettent de suivre les courbes de la voie.", color: "#2a2f38", explode: [0, -1.5, 0], meshes: [box([2.6, 0.6, 2], [-5, 0.95, 0]), box([2.6, 0.6, 2], [5, 0.95, 0])] },
    { name: "Essieux montés", explanation: "Essieux montés : la charge par essieu admise par la voie fixe le tonnage que chaque wagon peut transporter.", color: "#151a22", explode: [0, -2.6, 0], meshes: [-5.9, -4.1, 4.1, 5.9].flatMap(x => [wheel([x, 0.45, -0.75], 0.45, 0.2), wheel([x, 0.45, 0.75], 0.45, 0.2)]) },
    { name: "Plateau porte-conteneurs", explanation: "Plateau du wagon porte-conteneurs : le rail massifie les volumes sur les longues distances, avec des ruptures de charge aux terminaux.", color: "#5a3d2b", explode: [0, 0.6, 0], meshes: [box([14, 0.4, 2.6], [0, 1.5, 0])] },
    { name: "Verrous tournants", explanation: "Verrous tournants : ils fixent les conteneurs au plateau par leurs pièces de coin.", color: "#EED58E", explode: [0, 1.4, 0], meshes: [[-6.1, -0.1, 0.1, 6.1].flatMap(x => [box([0.2, 0.12, 0.2], [x, 1.76, -1.1]), box([0.2, 0.12, 0.2], [x, 1.76, 1.1])])].flat() },
    { name: "Conteneurs", explanation: "Deux conteneurs 20 pieds chargés : ils passeront du rail au navire ou au camion sans manutention de la marchandise.", color: "#1f5fa8", explode: [0, 2.6, 0], meshes: [box([6, 2.6, 2.4], [-3.1, 3.1, 0], "#1f5fa8"), box([6, 2.6, 2.4], [3.1, 3.1, 0], "#b23a2a")] },
    { name: "Attelages", explanation: "Attelages : ils relient les wagons entre eux pour former le train.", color: "#8a8f99", explode: [1.6, 0, 0], meshes: [box([0.6, 0.3, 0.3], [-7.3, 1.3, 0]), box([0.6, 0.3, 0.3], [7.3, 1.3, 0])] },
  ],
};

// Assemblage personnalisé : chaque pièce s’écarte du centre de l’objet.
function customParts(parts: Part3D[]): PartDef[] {
  const pos = parts.map(p => p.position ?? [0, 0, 0] as V3);
  const c = [0, 1, 2].map(i => pos.reduce((a, p) => a + p[i], 0) / pos.length);
  return parts.map((p, i) => {
    const d = [0, 1, 2].map(k => pos[i][k] - c[k]); const n = Math.hypot(...d) || 1;
    const dir = (Math.hypot(...d) < 0.01 ? [0, 1, 0] : d.map(v => v / n)) as V3;
    return { name: p.name, explanation: p.explanation, color: p.color ?? STACK[i % STACK.length], explode: dir.map(v => v * 1.8) as V3, meshes: [{ shape: p.shape ?? "box", size: p.size ?? [1, 1, 1], pos: pos[i] }] };
  });
}

function Geometry({ m }: { m: Mesh }) {
  if (m.shape === "cylinder") return <cylinderGeometry args={[m.size[0], m.size[2] ?? m.size[0], m.size[1], 32]} />;
  if (m.shape === "sphere") return <sphereGeometry args={[m.size[0], 32, 16]} />;
  if (m.shape === "cone") return <coneGeometry args={[m.size[0], m.size[1], 32]} />;
  return <boxGeometry args={m.size} />;
}

function Part({ part, index, target, active, onSelect }: { part: PartDef; index: number; target: number; active: boolean; onSelect: () => void }) {
  const ref = useRef<Group>(null);
  const progress = useRef(0);
  const center = useMemo(() => [0, 1, 2].map(k => part.meshes.reduce((a, m) => a + m.pos[k], 0) / part.meshes.length) as V3, [part]);
  // Chaque pièce glisse vers sa position éclatée (ou assemblée) avec un amorti.
  useFrame((_, dt) => { const g = ref.current; if (!g) return; progress.current += (target - progress.current) * Math.min(1, dt * 3.2); const t = progress.current; g.position.set(part.explode[0] * t, part.explode[1] * t, part.explode[2] * t); });
  return (
    <group ref={ref} onClick={e => { e.stopPropagation(); onSelect(); }}>
      {part.meshes.map((m, i) => (
        <mesh key={i} position={m.pos} rotation={m.rot ?? [0, 0, 0]}>
          <Geometry m={m} />
          <meshStandardMaterial color={m.color ?? part.color} metalness={0.35} roughness={0.55} emissive={active ? "#EED58E" : "#000000"} emissiveIntensity={active ? 0.35 : 0} />
        </mesh>
      ))}
      <Html position={center} center zIndexRange={[20, 0]}>
        <button className={`x3d-pin ${active ? "on" : ""}`} onClick={onSelect} aria-label={`${index + 1}. ${part.name}`}>{index + 1}</button>
      </Html>
    </group>
  );
}


export function Exploded3D({ object, parts, intro, en }: { object: Model3DKind; parts: Part3D[]; intro?: string; en: boolean }) {
  const defs = useMemo<PartDef[]>(() => {
    if (object === "custom") return customParts(parts);
    // Les explications de Lara remplacent celles par défaut, dans l’ordre de visite.
    return PRESETS[object].map((p, i) => parts[i] ? { ...p, name: parts[i].name || p.name, explanation: parts[i].explanation || p.explanation } : p);
  }, [object, parts]);
  // Cadrage sur la boîte englobante réelle de l’objet (et non sur l’origine).
  const { center, radius } = useMemo(() => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    // Les positions éclatées comptent aussi : l’objet décomposé reste entièrement dans le cadre.
    for (const d of defs) for (const m of d.meshes) for (let k = 0; k < 3; k++) { const half = (m.shape === "box" ? m.size[k] : m.size[k === 1 ? 1 : 0] * (k === 1 ? 1 : 2)) / 2; for (const off of [0, d.explode[k]]) { lo[k] = Math.min(lo[k], m.pos[k] + off - half); hi[k] = Math.max(hi[k], m.pos[k] + off + half); } }
    return { center: [0, 1, 2].map(k => (lo[k] + hi[k]) / 2) as V3, radius: Math.max(2.5, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2) };
  }, [defs]);
  const [exploded, setExploded] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [touring, setTouring] = useState(false);
  const [moved, setMoved] = useState(false);

  // Décomposition automatique à l’apparition : l’objet se « déplie » seul.
  useEffect(() => { const id = setTimeout(() => { setExploded(true); sfx("whoosh"); }, 1400); return () => clearTimeout(id); }, []);
  // Visite guidée : chaque pièce s’illumine et son explication est lue par Lara.
  useEffect(() => {
    if (!touring) return;
    let i = 0; let stop = false;
    const step = async () => {
      if (stop) return;
      if (i >= defs.length) { setTouring(false); setActive(null); return; }
      setActive(i); sfx("tick");
      const started = Date.now();
      await playServerVoice(`${defs[i].name}. ${defs[i].explanation}`, en ? "en" : "fr");
      const wait = Math.max(0, 3500 - (Date.now() - started));
      i++; setTimeout(step, wait);
    };
    void step();
    return () => { stop = true; stopServerVoice(); };
  }, [touring, defs, en]);
  useEffect(() => () => stopServerVoice(), []);

  const current = active === null ? null : defs[active];
  return (
    <div className="x3d">
      <div className="x3d-stage">
        <Canvas camera={{ position: [radius * 1.7, center[1] + radius * 0.85, radius * 1.7], fov: 36 }} dpr={[1, 2]} onPointerDown={() => setMoved(true)} onPointerMissed={() => setActive(null)}>
          <color attach="background" args={["#061430"]} />
          <fog attach="fog" args={["#061430", radius * 2.5, radius * 5]} />
          <hemisphereLight args={["#cfe0ff", "#1b365f", 0.7]} />
          <directionalLight position={[radius, radius * 1.6, radius * 0.6]} intensity={1.6} />
          <directionalLight position={[-radius, radius * 0.4, -radius]} intensity={0.5} color="#EED58E" />
          <group position={[-center[0], -Math.min(0, center[1] - radius * 0.2) * 0, -center[2]]}>
            {defs.map((p, i) => <Part key={i} part={p} index={i} target={exploded ? 1 : 0} active={active === i} onSelect={() => { setActive(i); setTouring(false); sfx("tick"); }} />)}
          </group>
          <ContactShadows position={[0, -0.02, 0]} opacity={0.45} scale={radius * 3} blur={2.4} far={radius} color="#000814" />
          <gridHelper args={[radius * 3.2, 16, "#eed58e", "#3a6ea5"]} position={[0, -0.03, 0]} material-transparent material-opacity={0.18} />
          <OrbitControls makeDefault enablePan={false} autoRotate={!moved && !touring} autoRotateSpeed={0.7} target={[0, center[1], 0]} minDistance={radius * 0.6} maxDistance={radius * 3} />
        </Canvas>
        <div className="x3d-controls">
          <button aria-pressed={exploded} onClick={() => { setExploded(v => !v); sfx("whoosh"); }}>{exploded ? <Boxes size={16} /> : <Layers size={16} />}{exploded ? (en ? "Assemble" : "Assembler") : (en ? "Explode" : "Décomposer")}</button>
          <button aria-pressed={touring} onClick={() => { if (touring) { setTouring(false); stopServerVoice(); } else { setExploded(true); setTouring(true); } }}>{touring ? <Square size={16} /> : <Play size={16} />}{touring ? (en ? "Stop tour" : "Arrêter la visite") : (en ? "Guided tour" : "Visite guidée")}</button>
        </div>
      </div>
      <div className="x3d-side">
        {intro && !current && <p className="x3d-intro">{intro}</p>}
        {current ? <div className="x3d-card" aria-live="polite"><span className="eyebrow">{String((active ?? 0) + 1).padStart(2, "0")} · {en ? "PART" : "PIÈCE"}</span><h4>{current.name}</h4><p>{current.explanation}</p></div>
          : <p className="ai-status">{en ? "Touch a numbered part, or start the guided tour." : "Touchez une pièce numérotée, ou lancez la visite guidée."}</p>}
        <ol className="x3d-list">{defs.map((p, i) => <li key={i}><button className={active === i ? "on" : ""} onClick={() => { setActive(i); setTouring(false); sfx("tick"); }}><i>{i + 1}</i>{p.name}</button></li>)}</ol>
      </div>
    </div>
  );
}
