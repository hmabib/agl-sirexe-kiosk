import type { Screen } from "./store";
export type RouteId = "route-A" | "route-B" | "route-C";
export type MiningStage = "exploration" | "construction" | "production" | "export" | "closure";
export type StepMode = "road" | "rail" | "sea" | "air" | "port" | "warehouse" | "customs" | "heavy_lift" | "mining" | "digital" | "people";
export interface SolutionStep { label: string; detail: string; mode?: StepMode }
export interface SolutionPoint { label: string; text: string }
export interface Solution { title: string; summary: string; steps: SolutionStep[]; considerations: SolutionPoint[]; route?: RouteId; miningStage?: MiningStage; imagePrompt?: string; next: Screen[] }
export type MaterialAction =
  | { type: "show_route"; route: RouteId }
  | { type: "show_mining"; stage: MiningStage }
  | { type: "sheet"; title: string; body: string }
  | { type: "open_studio"; tab: "image" | "schema" | "storyboard" | "doc"; title: string; body: string }
  | { type: "show_image"; title: string; image: string; text: string }
  | { type: "render_image"; title: string; prompt: string }
  | { type: "solution"; solution: Solution }
  | { type: "go"; screen: Screen };
export const ALLOWED_SCREENS = ["home", "games", "mission", "explore", "build", "vision", "mining", "corporate", "appointment", "careers", "quotation", "satisfaction", "market", "canvas"];
export const ROUTES: RouteId[] = ["route-A", "route-B", "route-C"];
export const MINING_STAGES: MiningStage[] = ["exploration", "construction", "production", "export", "closure"];
export const STEP_MODES: StepMode[] = ["road", "rail", "sea", "air", "port", "warehouse", "customs", "heavy_lift", "mining", "digital", "people"];
const STYLE_HINT: Record<string, string> = { photorealiste: "photorealistic", schema: "clean technical diagram", aquarelle: "watercolor", infographie: "flat infographic illustration" };
const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const list = (v: unknown, max: number) => Array.isArray(v) ? v.slice(0, max).filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
function parseSolution(args: Record<string, unknown>): Solution | null {
  const title = str(args.title, 150), summary = str(args.summary, 900);
  if (!title || !summary) return null;
  const steps = list(args.steps, 8).map(s => ({ label: str(s.label, 80), detail: str(s.detail, 300), mode: STEP_MODES.includes(s.mode as StepMode) ? s.mode as StepMode : undefined })).filter(s => s.label);
  const considerations = list(args.considerations, 6).map(c => ({ label: str(c.label, 80), text: str(c.text, 300) })).filter(c => c.label && c.text);
  const next = (Array.isArray(args.next) ? args.next : []).filter((s): s is Screen => ALLOWED_SCREENS.includes(String(s))).slice(0, 4);
  return { title, summary, steps, considerations, next, route: ROUTES.includes(args.route as RouteId) ? args.route as RouteId : undefined, miningStage: MINING_STAGES.includes(args.mining_stage as MiningStage) ? args.mining_stage as MiningStage : undefined, imagePrompt: str(args.image_prompt, 800) || undefined };
}
export function parseToolAction(name?:string, args:Record<string,unknown>={ }):MaterialAction|null {
  if(name==="navigate"&&ALLOWED_SCREENS.includes(String(args.screen)))return {type:"go",screen:args.screen as Screen};
  if(name==="show_route"&&ROUTES.includes(args.route as RouteId))return {type:"show_route",route:args.route as RouteId};
  if(name==="show_mining"&&MINING_STAGES.includes(args.stage as MiningStage))return {type:"show_mining",stage:args.stage as MiningStage};
  if(name==="show_solution"){const solution=parseSolution(args);return solution?{type:"solution",solution}:null;}
  if(name==="open_brief"&&typeof args.title==="string"&&typeof args.body==="string")return {type:"sheet",title:args.title.slice(0,150),body:args.body.slice(0,2000)};
  if(name==="generate_image"&&typeof args.prompt==="string"&&args.prompt.trim()){const style=typeof args.style==="string"?args.style:"";return {type:"render_image",title:style?`Illustration · ${style}`:"Illustration",prompt:`${args.prompt.slice(0,700)}${STYLE_HINT[style]?` (${STYLE_HINT[style]})`:""}`};}
  if(name==="open_studio"&&["image","schema","storyboard","doc"].includes(String(args.tab))&&typeof args.title==="string"&&typeof args.body==="string")return {type:"open_studio",tab:args.tab as "image"|"schema"|"storyboard"|"doc",title:args.title.slice(0,150),body:args.body.slice(0,4000)};
  if(name==="show_image"&&typeof args.title==="string"&&typeof args.image==="string"&&args.image.startsWith("data:image/")&&args.image.length<6000000)return {type:"show_image",title:args.title.slice(0,150),image:args.image,text:typeof args.text==="string"?args.text.slice(0,600):""};
  return null;
}
// Résumé court renvoyé au modèle Live : il sait ce qui est réellement affiché.
export function describeAction(a: MaterialAction): string {
  switch (a.type) {
    case "solution": return `Vue solution « ${a.solution.title} » affichée : ${a.solution.steps.length} étapes${a.solution.route ? `, carte ${a.solution.route}` : ""}${a.solution.imagePrompt ? ", visuel en cours de création" : ""}.`;
    case "render_image": return "Illustration en cours de création, elle s’affiche dans la vue dans quelques secondes.";
    case "show_route": return `Carte du corridor ${a.route} affichée.`;
    case "show_mining": return `Parcours Mining ouvert sur l’étape ${a.stage}.`;
    case "sheet": return `Fiche « ${a.title} » affichée.`;
    case "go": return `Écran ${a.screen} ouvert.`;
    case "open_studio": return `Studio créatif ouvert sur l’onglet ${a.tab}.`;
    case "show_image": return "Image affichée.";
  }
}
export function publishAction(action:MaterialAction) { if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("agl-action",{detail:action})); }
