"use client";
/* R3F intentionally mutates Three.js objects in the render loop. */
/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function latLongToVec3(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const PORTS = [
  { name: "Abidjan", lat: 5.3, lon: -4.0, gold: true },
  { name: "San Pedro", lat: 4.75, lon: -6.6, gold: true },
  { name: "Mine Nord", lat: 9.6, lon: -5.4, gold: true },
  { name: "Rotterdam", lat: 51.9, lon: 4.5, gold: false },
  { name: "Singapour", lat: 1.35, lon: 103.8, gold: false },
  { name: "Santos", lat: -23.9, lon: -46.3, gold: false },
  { name: "Dakar", lat: 14.7, lon: -17.4, gold: false },
];

function Arcs({ group }: { group: React.RefObject<THREE.Group | null> }) {
  const curves = useMemo(() => {
    const abi = latLongToVec3(5.3, -4.0, 1.6);
    const dests: [number, number][] = [[51.9, 4.5], [1.35, 103.8], [-23.9, -46.3], [14.7, -17.4], [9.6, -5.4]];
    return dests.map(([la, lo]) => {
      const end = latLongToVec3(la, lo, 1.6);
      const mid = abi.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(2.15);
      return new THREE.QuadraticBezierCurve3(abi, mid, end);
    });
  }, []);
  const dots = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.12) % 1;
    curves.forEach((c, i) => {
      const m = dots.current[i];
      if (m) m.position.copy(c.getPoint((t + i / curves.length) % 1));
    });
    if (group.current) group.current.rotation.y += 0.0016;
  });
  return (
    <group>
      {curves.map((c, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array(c.getPoints(48).flatMap((p) => [p.x, p.y, p.z])), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#D6A84B" transparent opacity={0.55} />
        </line>
      ))}
      {curves.map((_, i) => (
        <mesh key={`d${i}`} ref={(m) => { if (m) dots.current[i] = m; }}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#F2D28B" />
        </mesh>
      ))}
    </group>
  );
}

function Markers({ onSelectCI }: { onSelectCI?: () => void }) {
  const ciRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ciRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.25;
      ciRef.current.scale.setScalar(s);
    }
  });
  return (
    <group>
      {PORTS.map((p) => {
        const v = latLongToVec3(p.lat, p.lon, 1.62);
        const isCI = p.name === "Abidjan";
        return (
          <mesh
            key={p.name}
            position={v}
            ref={isCI ? ciRef : undefined}
            onClick={isCI ? (e) => { e.stopPropagation(); onSelectCI?.(); } : undefined}
            onPointerOver={isCI ? () => { document.body.style.cursor = "pointer"; } : undefined}
            onPointerOut={isCI ? () => { document.body.style.cursor = "auto"; } : undefined}
          >
            <sphereGeometry args={[isCI ? 0.07 : 0.04, 12, 12]} />
            <meshBasicMaterial color={p.gold ? "#F2D28B" : "#7fb3e8"} />
          </mesh>
        );
      })}
    </group>
  );
}

function GlobeInner({ onSelectCI }: { onSelectCI?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const dots = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 420; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1.605);
      arr.push(v.x, v.y, v.z);
    }
    return new Float32Array(arr);
  }, []);
  return (
    <group ref={group}>
      {/* terre */}
      <mesh>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial color="#0a2f5c" roughness={0.65} metalness={0.35} transparent opacity={0.96} />
      </mesh>
      {/* wireframe premium */}
      <mesh scale={1.004}>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color="#2f6cb0" wireframe transparent opacity={0.22} />
      </mesh>
      {/* halo */}
      <mesh scale={1.18}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#D6A84B" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dots, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#D6A84B" size={0.014} transparent opacity={0.8} />
      </points>
      <Markers onSelectCI={onSelectCI} />
      <Arcs group={group} />
    </group>
  );
}

export function Globe3D({ onSelectCI, height = 340 }: { onSelectCI?: () => void; height?: number }) {
  return (
    <div style={{ height, width: "100%" }}>
      <Canvas camera={{ position: [0, 0.4, 4.4], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 3, 5]} intensity={1.4} />
        <pointLight position={[-4, -2, -3]} color="#D6A84B" intensity={2} />
        <GlobeInner onSelectCI={onSelectCI} />
      </Canvas>
    </div>
  );
}
