import type { Model3DKind } from "./actions";
import { PRESETS, type ModelMesh as Mesh, type PartDef, type V3, type Finish } from "./model3d";

const STEEL = "#68727b", DARK = "#252d32", GLASS = "#24434e", WHITE = "#e3e5df";
const each = (n: number, fn: (i: number) => Mesh | Mesh[]) => Array.from({ length: n }, (_, i) => fn(i)).flat();
const box = (size: V3, pos: V3, color?: string, finish: Finish = "paint", rot?: V3, bevel?: number): Mesh => ({ shape: "box", size, pos, color, finish, rot, bevel });
const cylinder = (r: number, h: number, pos: V3, color = STEEL, rot?: V3): Mesh => ({ shape: "cylinder", size: [r, h, r], pos, color, finish: "metal", rot });
const ring = (r: number, thickness: number, pos: V3, rot: V3 = [0, Math.PI / 2, 0], color = STEEL): Mesh => ({ shape: "torus", size: [r, thickness, r], pos, rot, color, finish: "metal" });
const beam = (a: V3, b: V3, width: number, color = STEEL): Mesh => {
  const d = b.map((v, i) => v - a[i]);
  const length = Math.hypot(...d);
  return box([width, length, width], a.map((v, i) => (v + b[i]) / 2) as V3, color, "metal", [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))]);
};

function tire(m: Mesh, railway = false): Mesh[] {
  const [r, w] = m.size, [x, y, z] = m.pos;
  const rot: V3 = [Math.PI / 2, 0, 0];
  const result: Mesh[] = [{ ...m, color: railway ? DARK : "#202326", finish: railway ? "metal" : "rubber" }];
  for (const side of [-1, 1]) {
    result.push(cylinder(r * 0.61, w * 0.045, [x, y, z + side * w * 0.51], STEEL, rot));
    result.push(cylinder(r * 0.26, w * 0.15, [x, y, z + side * w * 0.55], "#8c969c", rot));
    result.push(ring(r * 0.77, r * 0.023, [x, y, z + side * w * 0.505], [0, 0, 0], railway ? STEEL : "#34383b"));
    result.push(...each(8, i => {
      const angle = i * Math.PI / 4;
      return [cylinder(r * 0.045, w * 0.065, [x + Math.sin(angle) * r * 0.4, y + Math.cos(angle) * r * 0.4, z + side * w * 0.55], "#bac0c1", rot)];
    }));
  }
  if (!railway) result.push(...each(28, i => {
    const angle = i * Math.PI / 14;
    return [box([r * 0.115, r * 0.055, w * 0.92], [x + Math.sin(angle) * r, y + Math.cos(angle) * r, z], "#292c2e", "rubber", [0, 0, -angle])];
  }));
  return result;
}

function corrugated(m: Mesh): Mesh[] {
  const [l, h, w] = m.size, [x, y, z] = m.pos;
  const result: Mesh[] = [{ ...m, bevel: 0.015 }];
  const ribs = Math.max(5, Math.round(l / 0.23));
  for (const side of [-1, 1]) {
    result.push(...each(ribs, i => [box([0.075, h * 0.89, 0.065], [x - l / 2 + (i + 0.5) * l / ribs, y, z + side * w / 2], m.color)]));
    result.push(box([l, 0.07, 0.09], [x, y + h / 2 - 0.045, z + side * w / 2], m.color));
    result.push(box([l, 0.07, 0.09], [x, y - h / 2 + 0.045, z + side * w / 2], m.color));
  }
  // Door seals, hinges, and the four locking rods.
  result.push(box([0.025, h * 0.94, 0.026], [x + l / 2 + 0.02, y, z], DARK, "rubber"));
  for (const side of [-1, 1]) for (const offset of [0.2, 0.72]) {
    result.push(cylinder(0.024, h * 0.86, [x + l / 2 + 0.045, y, z + side * w * offset / 2]));
  }
  return result;
}

function cabin(m: Mesh): Mesh[] {
  const [l, h, w] = m.size, [x, y, z] = m.pos;
  return [{ ...m, bevel: Math.min(l, h, w) * 0.07 },
    box([0.025, h * 0.32, w * 0.82], [x + l / 2 + 0.008, y + h * 0.17, z], GLASS, "glass", undefined, 0.035),
    box([0.045, h * 0.35, 0.045], [x + l / 2 + 0.035, y + h * 0.17, z], DARK),
    box([0.045, h * 0.22, w * 0.65], [x + l / 2 + 0.01, y - h * 0.26, z], DARK, "metal"),
    ...each(5, i => [box([0.025, 0.025, w * 0.62], [x + l / 2 + 0.04, y - h * 0.18 - i * h * 0.038, z], STEEL, "metal")]),
    ...[-1, 1].flatMap(side => [
      box([l * 0.55, h * 0.31, 0.024], [x + l * 0.12, y + h * 0.17, z + side * (w / 2 + 0.008)], GLASS, "glass"),
      box([l * 0.18, 0.04, 0.045], [x - l * 0.16, y - h * 0.08, z + side * (w / 2 + 0.035)], DARK, "metal"),
      box([0.08, h * 0.25, 0.09], [x + l * 0.42, y + h * 0.22, z + side * w * 0.57], DARK),
      box([0.16, h * 0.18, 0.09], [x + l * 0.4, y + h * 0.25, z + side * w * 0.64], STEEL, "metal"),
      box([0.055, h * 0.08, w * 0.19], [x + l / 2 + 0.025, y - h * 0.36, z + side * w * 0.32], "#fff1c6", "glass"),
      box([l * 0.5, 0.1, 0.2], [x + l * 0.1, y - h * 0.55, z + side * w * 0.46], STEEL, "metal"),
    ]),
    box([l * 1.015, 0.085, w * 1.025], [x, y + h / 2, z], m.color),
  ];
}

function vents(m: Mesh): Mesh[] {
  const [l, h, w] = m.size, [x, y, z] = m.pos;
  return [-1, 1].flatMap(side => [
    box([l * 0.72, h * 0.6, 0.024], [x, y + h * 0.06, z + side * (w / 2 + 0.012)], DARK, "metal"),
    ...each(24, i => [box([0.045, h * 0.58, 0.04], [x - l * 0.34 + i * l * 0.68 / 23, y + h * 0.06, z + side * (w / 2 + 0.035)], STEEL, "metal")]),
  ]);
}

function railing(x: number, length: number, y: number, z: number): Mesh[] {
  return [box([length, 0.045, 0.045], [x, y + 0.72, z], WHITE, "metal"), ...each(Math.max(3, Math.ceil(length)), i => {
    const count = Math.max(3, Math.ceil(length));
    return [box([0.045, 0.72, 0.045], [x - length / 2 + i * length / (count - 1), y + 0.36, z], WHITE, "metal")];
  })];
}

function details(kind: Exclude<Model3DKind, "custom">, index: number, part: PartDef): Mesh[] {
  let result: Mesh[] = part.meshes.flatMap((m, mi) => {
    const wheel = m.shape === "cylinder" && m.finish === "rubber";
    if (wheel) return tire(m, kind === "locomotive" || kind === "wagon");
    const cargo = (kind === "ship" && index === 1) || (kind === "wagon" && index === 4) || (kind === "crane" && index === 7) || (kind === "terminal" && (index === 4 || (index === 1 && mi > 0) || (index === 5 && mi % 3 === 2)));
    if (cargo) return corrugated({ ...m, color: m.color ?? part.color });
    const cab = m.shape === "box" && ((kind === "truck" && index === 0) || (kind === "locomotive" && index === 0 && mi === 0) || (kind === "haul_truck" && index === 2 && mi === 0) || (kind === "locomotive_convoy" && index === 3 && mi === 1) || (/Tracteur/.test(part.name) && mi === 0) || (kind === "terminal" && index === 5 && mi % 3 === 0));
    if (cab) return cabin({ ...m, color: m.color ?? part.color });
    return [m];
  });

  if (kind === "container") {
    if (index === 0) result = [box([6, 0.12, 2.4], [0, 0.06, 0], DARK, "metal"), ...each(12, i => [box([0.485, 0.055, 2.3], [-2.75 + i * 0.5, 0.15, 0], i % 2 ? "#8c704b" : "#9c8057", "wood")]), ...each(10, i => [box([0.09, 0.14, 2.3], [-2.7 + i * 0.6, -0.03, 0], STEEL, "metal")])];
    if (index === 1) result = part.meshes.flatMap(m => [
      box([1.55, 0.14, 1.15], [m.pos[0], 0.26, 0], "#8c704b", "wood"),
      ...each(3, row => each(2, col => [box([0.72, 0.39, 1.08], [m.pos[0] - 0.38 + col * 0.76, 0.54 + row * 0.4, 0], "#b99a70", "wood")])),
      ...[-0.48, 0.48].map(z => box([1.5, 0.02, 0.035], [m.pos[0], 1.545, z], "#dfcaa5", "rubber")),
    ]);
    if (index === 2) result = part.meshes.flatMap(m => corrugated({ ...m, color: part.color }));
    if (index === 3) result.push(...each(25, i => [box([0.055, 0.025, 2.32], [-2.88 + i * 0.24, 2.65, 0], part.color)]));
    if (index === 4) result.push(...each(10, i => [box([0.065, 2.2, 0.075], [-3.04, 1.36, -1.08 + i * 0.24], part.color)]));
    if (index === 5) result.push(...[-0.96, -0.28, 0.28, 0.96].flatMap(z => [cylinder(0.028, 2.25, [3.065, 1.36, z]), box([0.08, 0.04, 0.25], [3.1, 0.94, z + 0.08], STEEL, "metal")]), ...[-1.18, 1.18].flatMap(z => each(3, i => [box([0.11, 0.12, 0.14], [3.07, 0.55 + i * 0.78, z], STEEL, "metal")])), box([0.02, 2.4, 0.03], [3.05, 1.36, 0], DARK, "rubber"));
    if (index === 6) result = result.map(m => ({ ...m, color: STEEL }));
  }

  if (kind === "ship" && index === 0) result = [
    { shape: "hull", size: [40, 5, 8], pos: [1, 2.5, 0], color: "#263e50", finish: "paint" },
    { shape: "hull", size: [39.6, 1.5, 7.7], pos: [1, 0.8, 0], color: "#773e33", finish: "paint" },
    box([33, 0.12, 7.8], [-1.5, 5.06, 0], "#6d7776"),
    ...[-3.8, 3.8].flatMap(z => railing(-1.5, 32, 5.1, z)),
  ];
  if (kind === "ship" && index === 1) result = part.meshes.slice(0, 36).flatMap((m, i) => corrugated({ ...m, pos: [-8 + Math.floor(i / 6) * 3.65, m.pos[1], m.pos[2]], color: m.color ?? part.color }));
  if (kind === "ship" && index === 2) result.push(
    box([5.5, 1.2, 7.5], [-14, 12.6, 0], WHITE),
    ...each(7, i => [box([0.025, 0.65, 0.7], [-11.23, 12.65, -3 + i], GLASS, "glass")]),
    ...[-1, 1].flatMap(side => each(4, row => each(4, col => [box([0.55, 0.42, 0.025], [-15.6 + col * 1.05, 7.4 + row * 1.35, side * 3.51], GLASS, "glass")]))),
    cylinder(0.07, 3.5, [-12.5, 15, 0]), box([0.12, 0.12, 3], [-12.5, 16, 0], WHITE),
  );
  if (kind === "ship" && index === 4) result = [cylinder(0.38, 1.1, [-19, 1.6, 0], "#ab8850", [0, 0, Math.PI / 2]), ...each(5, i => {
    const a = i * Math.PI * 2 / 5;
    return [box([0.18, 1.25, 0.6], [-19, 1.6 + Math.cos(a) * 0.85, Math.sin(a) * 0.85], "#ab8850", "metal", [a, 0.25, 0.2], 0.16)];
  })];
  if (kind === "terminal" && index === 1) result[0] = { shape: "hull", size: [42, 4, 8], pos: [0, 0.4, 9], color: "#263e50", finish: "paint" };
  if (kind === "terminal" && index === 0) {
    result[0] = { ...result[0], color: "#858880", finish: "concrete" };
    result.push(...each(18, i => [box([0.07, 0.015, 11], [-21.5 + i * 2.5, 1.208, -4], "#676e68", "concrete")]), ...each(13, i => [box([1.5, 0.025, 0.09], [-21 + i * 3.5, 1.23, 2.5], "#e2dabe"), cylinder(0.18, 0.35, [-21 + i * 3.5, 1.39, 2.9], DARK)]));
  }

  if (kind === "locomotive" && index === 1) result.push(...vents(part.meshes[0]), ...[-1.49, 1.49].flatMap(z => railing(-0.8, 12, 1.95, z)), cylinder(0.16, 0.7, [-1.8, 4.6, 0], DARK));
  if (kind === "locomotive_convoy" && index === 3) result.push(...vents(part.meshes[0]), box([14.5, 0.3, 3], [5, 1.83, 0], DARK, "metal"), ...[-1.48, 1.48].flatMap(z => railing(4, 11, 2, z)));
  if (kind === "truck" && index === 5) result.push(...vents(part.meshes[0]), ...[-1.15, 1.15].flatMap(z => each(5, i => [box([0.12, 2.4, 0.09], [-4.9 + i * 1.25, 2.45, z], "#b88a2e")])));
  if ((kind === "locomotive" && index === 7) || (kind === "wagon" && index === 0)) result.push(...part.meshes.filter(m => m.shape === "box").flatMap(m => [-1, 1].flatMap(side => each(3, i => [cylinder(0.18, 0.32, [m.pos[0] - m.size[0] * 0.3 + i * m.size[0] * 0.3, m.pos[1] + 0.16, m.pos[2] + side * m.size[2] / 2], "#9a9b91")]))));

  if (kind === "tank_convoy" && index === 0) {
    result = [part.meshes[0], { shape: "ellipsoid", size: [0.8, 2.3, 2.3], pos: [5, 3.9, 0], finish: "metal" }, { shape: "ellipsoid", size: [0.8, 2.3, 2.3], pos: [-7, 3.9, 0], finish: "metal" },
      ...[-6.8, -4, -1, 2, 4.8].map(x => ring(2.307, 0.027, [x, 3.9, 0], undefined, "#909da4")),
      cylinder(0.48, 0.16, [-1, 6.24, 0]), cylinder(0.21, 0.6, [3.4, 6.35, 0]),
      ...each(9, i => [box([0.5, 0.04, 0.065], [0.1, 2.2 + i * 0.45, 2.25], STEEL, "metal")]),
      ...[-0.18, 0.38].map(x => box([0.055, 4.1, 0.055], [x, 4.1, 2.25], STEEL, "metal")),
    ];
  }
  if (kind === "tank_convoy" && index === 4) result = [box([4.2, 0.8, 2], [21, 0.85, 0], "#d3a44d"), ...cabin(box([2.1, 1.3, 1.85], [20.8, 1.8, 0], WHITE)), box([1.2, 0.16, 0.26], [20.8, 2.54, 0], "#df9d28", "glass"), ...result.filter(m => m.shape !== "box")];

  if (kind === "mri") {
    if (index <= 3) {
      const radius = [1.35, 1.16, 0.88, 0.64][index];
      const inner = [1.16, 0.89, 0.65, 0.57][index];
      result = [{ shape: "tube", size: [radius, [1.8, 1.55, 1.43, 1.4][index], inner], pos: [0, 1.65, 0], rot: [0, 0, Math.PI / 2], color: [WHITE, "#969ea4", "#b47a4d", WHITE][index], finish: index === 0 || index === 3 ? "paint" : "metal" }];
      if (index === 0) result.push(box([1.7, 0.45, 2.3], [0, 0.55, 0], WHITE, "paint", undefined, 0.12), box([0.035, 0.22, 0.32], [0.92, 2.2, 0.85], GLASS, "glass"));
      if (index === 2) result.push(...each(22, i => ring(0.858, 0.026, [-0.68 + i * 0.064, 1.65, 0], undefined, "#b57c55")));
    }
    if (index === 5) result.push(box([3.2, 0.07, 0.62], [2.5, 1.17, 0], "#829295", "rubber", undefined, 0.035));
    if (index === 6) result = each(7, i => [box([0.38, 0.2, 2.8], [-1.2 + i * 0.4, 0.14, 0], "#99815b", "wood")]);
  }

  if (kind === "haul_truck" && index === 0) result = [box([8, 0.28, 5.6], [-1.6, 4, 0], "#ae802b"), box([0.22, 2.6, 5.6], [2.3, 5.2, 0], "#c39330"), box([2.6, 0.2, 5.6], [3.6, 6.4, 0], "#c39330"), ...[-1, 1].flatMap(side => [box([8, 2.6, 0.2], [-1.6, 5.2, side * 2.7], "#c39330", "paint", [side * 0.1, 0, 0]), ...each(7, i => [box([0.15, 2.45, 0.18], [-5.2 + i * 1.16, 5.1, side * 2.85], "#a77827")])])];
  if (kind === "haul_truck" && index === 3) result.push(...each(13, i => [box([0.05, 0.055, 2.85], [6.015, 2 + i * 0.15, 0], STEEL, "metal")]), ...each(7, i => [box([0.65, 0.065, 0.24], [5.7, 0.6 + i * 0.56, -2.1], STEEL, "metal")]), ...railing(4.4, 2.3, 4.35, 2.2));

  if (kind === "xmas_tree" && index === 0) result = [cylinder(0.6, 2.5, [0, 4.65, 0], "#b59a52"), ...each(3, i => [cylinder(0.85, 0.18, [0, 3.6 + i * 1.1, 0], "#9ca7a9"), cylinder(0.25, 2.8, [0, 3.9 + i * 0.85, 0], "#a3aaab", [0, 0, Math.PI / 2]), box([0.48, 0.52, 0.62], [1.45, 3.9 + i * 0.85, 0], "#b39646"), ring(0.3, 0.045, [-1.5, 3.9 + i * 0.85, 0], undefined, "#9e3e30")]), cylinder(0.5, 1.4, [0, 6.5, 0], "#aaa182")];
  if (kind === "xmas_tree" && index === 3) result.push(...each(6, i => [cylinder(0.095, 0.13, [2.1, 4.05 + Math.floor(i / 3) * 0.55, -0.55 + i % 3 * 0.55], i % 2 ? "#b48c39" : "#bac0bd", [0, 0, Math.PI / 2])]));
  if (kind === "xmas_tree" && index === 5) result.push(...each(28, i => ring(1.42, 0.046, [9.5, 3.4, -1.14 + i * 0.084], [0, 0, 0], DARK)));

  if (kind === "crane") {
    if (index <= 1) result.push(...[-5, 5].flatMap(z => [box([3, 0.5, 1.1], [index === 0 ? 4 : -6, 0.35, z], DARK, "metal"), ...each(4, i => [cylinder(0.3, 1.15, [(index === 0 ? 4 : -6) - 1.1 + i * 0.72, 0.3, z], STEEL, [Math.PI / 2, 0, 0])])]), beam([index === 0 ? 4 : -6, 3, -5], [index === 0 ? 4 : -6, 12, 5], 0.18, "#49718c"));
    if (index === 3) result = [...[-0.8, 0.8].flatMap(z => [box([30, 0.18, 0.2], [9, 16.6, z], "#517991"), box([30, 0.18, 0.2], [9, 15.2, z], "#517991"), ...each(15, i => [beam([-6 + i * 2, 15.2, z], [-4 + i * 2, 16.6, z], 0.1), beam([-6 + i * 2, 16.6, z], [-4 + i * 2, 15.2, z], 0.1)])]), ...[-0.8, 0.8].flatMap(z => [beam([-3, 16.6, z], [-1, 23, z], 0.3, "#517991"), beam([-1, 23, z], [21, 16.6, z], 0.045), beam([-1, 23, z], [-6, 16.6, z], 0.045)])];
    if (index === 5) result = cabin(box([1.8, 1.6, 1.8], [11.8, 13, 0], WHITE));
  }
  if (kind === "terminal" && (index === 2 || index === 3)) {
    const cranes = index === 2 ? [-10, 8] : [-14, 2, 16];
    result.push(...cranes.flatMap(x => index === 2 ? [beam([x - 3, 3, -1], [x + 3, 14, -1], 0.12), beam([x - 3, 3, 5], [x + 3, 14, 5], 0.12), beam([x, 14, -3], [x, 21, 0], 0.3, "#3a6a89"), beam([x, 21, 0], [x, 14.8, 15], 0.045), box([6.5, 0.4, 0.4], [x, 13.5, 5], "#3a6a89"), ...[-0.7, 0.7].map(dx => cylinder(0.035, 5.4, [x + dx, 10.5, 9]))] : [beam([x - 3, 2, -6.5], [x + 3, 8, -6.5], 0.1), box([0.4, 0.4, 6.5], [x - 3, 8, -3.5]), box([0.4, 0.4, 6.5], [x + 3, 8, -3.5])]));
  }
  if (kind === "locomotive_convoy" && index === 1) {
    result.push(...each(4, i => [box([5, 1.14 - i * 0.15, 1.14 - i * 0.15], [-12.3 + i * 4.2, 6.05 + i * 3, 0], i % 2 ? "#9c9f98" : "#c2a244", "metal", [0, 0, 0.62])]), ...cabin(box([1.8, 1.6, 1.4], [-12.5, 3.5, 1.5], WHITE)));
  }
  if (kind === "locomotive_convoy" && index === 0) result.push(...[-17, -11].flatMap(x => [-1, 1].flatMap(side => [box([0.35, 0.32, 4], [x, 0.9, side * 2], STEEL, "metal"), cylinder(0.15, 0.9, [x, 0.45, side * 3.8]), cylinder(0.45, 0.1, [x, 0.05, side * 3.8], DARK)])));
  return result;
}

// Index-based refinement preserves the public part names, explanations, and AI overrides.
export function detailedModel(kind: Exclude<Model3DKind, "custom">): PartDef[] {
  return PRESETS[kind].map((part, index) => ({ ...part, meshes: details(kind, index, part) }));
}
