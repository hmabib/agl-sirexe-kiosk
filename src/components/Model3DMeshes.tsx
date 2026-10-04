"use client";
/* Three.js resources are owned by the scene and animated in useFrame. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, BoxGeometry, BufferGeometry, CylinderGeometry, DataTexture, Euler, ExtrudeGeometry, Float32BufferAttribute, Matrix4, MeshPhysicalMaterial, Path, Quaternion, RepeatWrapping, RGBAFormat, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Finish, ModelMesh, PartDef } from "@/lib/model3d";

export const FINISH: Record<Finish, { metalness: number; roughness: number; clearcoat: number }> = {
  paint: { metalness: 0.18, roughness: 0.43, clearcoat: 0.25 },
  metal: { metalness: 0.82, roughness: 0.32, clearcoat: 0.08 },
  rubber: { metalness: 0, roughness: 0.94, clearcoat: 0 },
  glass: { metalness: 0.35, roughness: 0.12, clearcoat: 1 },
  wood: { metalness: 0, roughness: 0.88, clearcoat: 0 },
  concrete: { metalness: 0, roughness: 0.96, clearcoat: 0 },
};

function hullGeometry([length, height, width]: number[]) {
  // Cross sections taper towards the keel, the rounded stern and the sharp bow.
  const sections = [[-0.5, 0.55], [-0.46, 0.86], [-0.36, 1], [0.23, 1], [0.37, 0.82], [0.45, 0.48], [0.5, 0.025]];
  const vertices: number[] = [];
  for (const [x, breadth] of sections) {
    for (const [y, scale] of [[-0.5, 0.45], [-0.28, 0.8], [0.25, 0.98], [0.5, 1]]) {
      vertices.push(x * length, y * height, -breadth * width * scale / 2, x * length, y * height, breadth * width * scale / 2);
    }
  }
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d);
  for (let s = 0; s < sections.length - 1; s++) {
    const a = s * 8, b = a + 8;
    for (let j = 0; j < 3; j++) {
      quad(a + j * 2, a + j * 2 + 2, b + j * 2 + 2, b + j * 2);
      quad(a + j * 2 + 1, b + j * 2 + 1, b + j * 2 + 3, a + j * 2 + 3);
    }
    quad(a, b, b + 1, a + 1);
    quad(a + 6, a + 7, b + 7, b + 6);
  }
  for (let j = 0; j < 3; j++) {
    quad(j * 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
    const e = (sections.length - 1) * 8 + j * 2;
    quad(e, e + 2, e + 3, e + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(vertices.flatMap((_, i) => i % 3 === 0 ? [vertices[i] / length + 0.5, vertices[i + 1] / height + 0.5] : []), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function meshGeometry(m: ModelMesh): BufferGeometry {
  let geometry: BufferGeometry;
  const [x, y, z] = m.size;
  if (m.shape === "cylinder") geometry = new CylinderGeometry(x, z, y, x < 0.12 ? 8 : 24);
  else if (m.shape === "cone") geometry = new CylinderGeometry(0, x, y, 40);
  else if (m.shape === "sphere") geometry = new SphereGeometry(x, 32, 20);
  else if (m.shape === "ellipsoid") { geometry = new SphereGeometry(1, 32, 20); geometry.scale(x, y, z); }
  else if (m.shape === "torus") geometry = new TorusGeometry(x, y, 6, 32);
  else if (m.shape === "hull") geometry = hullGeometry(m.size);
  else if (m.shape === "tube") {
    const outline = new Shape(); outline.absarc(0, 0, x, 0, Math.PI * 2, false);
    const hole = new Path(); hole.absarc(0, 0, z, 0, Math.PI * 2, true); outline.holes.push(hole);
    geometry = new ExtrudeGeometry(outline, { depth: y, bevelEnabled: false, curveSegments: 48, steps: 1 });
    geometry.translate(0, 0, -y / 2); geometry.rotateX(-Math.PI / 2);
  } else {
    const radius = m.bevel ?? Math.min(0.045, Math.min(x, y, z) * 0.12);
    geometry = Math.min(x, y, z) > 0.12 ? new RoundedBoxGeometry(x, y, z, 1, radius) : new BoxGeometry(x, y, z);
  }
  const transform = new Matrix4().compose(new Vector3(...m.pos), new Quaternion().setFromEuler(new Euler(...(m.rot ?? [0, 0, 0]))), new Vector3(1, 1, 1));
  geometry.applyMatrix4(transform);
  return geometry;
}

export function partBounds(part: PartDef): Box3 {
  const bounds = new Box3();
  for (const mesh of part.meshes) {
    const [x, y, z] = mesh.size;
    const half = mesh.shape === "sphere" ? [x, x, x] : mesh.shape === "ellipsoid" ? [x, y, z] : mesh.shape === "torus" ? [x + y, x + y, y] : ["cylinder", "cone", "tube"].includes(mesh.shape) ? [Math.max(x, mesh.shape === "cylinder" ? z : x), y / 2, Math.max(x, mesh.shape === "cylinder" ? z : x)] : [x / 2, y / 2, z / 2];
    const extent = new Vector3(...half);
    const local = new Box3(extent.clone().negate(), extent);
    local.applyMatrix4(new Matrix4().compose(new Vector3(...mesh.pos), new Quaternion().setFromEuler(new Euler(...(mesh.rot ?? [0, 0, 0]))), new Vector3(1, 1, 1)));
    bounds.union(local);
  }
  return bounds;
}

function surfaceTexture(finish: Finish) {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  let seed = 19;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = finish === "wood" ? Math.sin(x * 0.8 + Math.sin(y * 0.15) * 0.5) * 32 : finish === "metal" ? Math.sin(y * 2.9) * 8 : 0;
    const value = Math.round(170 + grain + (seed / 4294967296 - 0.5) * (finish === "concrete" ? 75 : 28));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4); texture.needsUpdate = true;
  return texture;
}

export function Model3DMeshes({ part, active, dimmed }: { part: PartDef; active: boolean; dimmed: boolean }) {
  const materials = useRef<(MeshPhysicalMaterial | null)[]>([]);
  const invalidate = useThree(s => s.invalidate);
  const batches = useMemo(() => {
    const groups = new Map<string, { color: string; finish: Finish; geometries: BufferGeometry[] }>();
    for (const m of part.meshes) {
      const finish = m.finish ?? part.finish ?? "paint", color = m.color ?? part.color;
      const key = `${finish}:${color}`;
      if (!groups.has(key)) groups.set(key, { color, finish, geometries: [] });
      let geometry = meshGeometry(m);
      if (geometry.index) { const expanded = geometry.toNonIndexed(); geometry.dispose(); geometry = expanded; }
      geometry.clearGroups();
      groups.get(key)!.geometries.push(geometry);
    }
    return [...groups.values()].map(group => {
      const geometry = mergeGeometries(group.geometries)!;
      group.geometries.forEach(g => g.dispose());
      return { geometry, color: group.color, finish: group.finish, texture: surfaceTexture(group.finish) };
    });
  }, [part]);
  useEffect(() => () => batches.forEach(b => { b.geometry.dispose(); b.texture.dispose(); }), [batches]);
  useFrame((_, delta) => {
    let animating = false;
    for (const material of materials.current) if (material) {
      material.opacity += ((dimmed ? 0.12 : 1) - material.opacity) * (1 - Math.exp(-delta * 7));
      material.transparent = material.opacity < 0.99;
      material.depthWrite = material.opacity > 0.5;
      material.emissiveIntensity += ((active ? 0.12 : 0) - material.emissiveIntensity) * (1 - Math.exp(-delta * 7));
      if (Math.abs(material.opacity - (dimmed ? 0.12 : 1)) > 0.001 || Math.abs(material.emissiveIntensity - (active ? 0.12 : 0)) > 0.001) animating = true;
    }
    if (animating) invalidate();
  });
  return <group>{batches.map((batch, i) => <mesh key={i} geometry={batch.geometry} castShadow={!dimmed} receiveShadow>
    <meshPhysicalMaterial ref={m => { materials.current[i] = m; }} color={batch.color} {...FINISH[batch.finish]} bumpMap={batch.finish === "glass" ? undefined : batch.texture} bumpScale={batch.finish === "wood" || batch.finish === "concrete" ? 0.014 : 0.002} envMapIntensity={0.8} clearcoatRoughness={0.25} emissive="#eed58e" emissiveIntensity={0} />
  </mesh>)}</group>;
}
