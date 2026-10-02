import type { Screen } from "./store";
export type MaterialAction =
  | { type: "show_route"; route: "route-A" | "route-B" | "route-C" }
  | { type: "show_mining"; stage: "exploration" | "construction" | "production" | "export" | "closure" }
  | { type: "sheet"; title: string; body: string }
  | { type: "open_studio"; tab: "image" | "schema" | "storyboard" | "doc"; title: string; body: string }
  | { type: "go"; screen: Screen };
export const ALLOWED_SCREENS = ["home", "games", "mission", "explore", "build", "vision", "mining", "corporate", "appointment", "careers", "quotation", "satisfaction", "market"];
export function parseToolAction(name?:string, args:Record<string,unknown>={ }):MaterialAction|null {
  if(name==="navigate"&&ALLOWED_SCREENS.includes(String(args.screen)))return {type:"go",screen:args.screen as Screen};
  if(name==="show_route"&&["route-A","route-B","route-C"].includes(String(args.route)))return {type:"show_route",route:args.route as "route-A"|"route-B"|"route-C"};
  if(name==="show_mining"&&["exploration","construction","production","export","closure"].includes(String(args.stage)))return {type:"show_mining",stage:args.stage as "exploration"|"construction"|"production"|"export"|"closure"};
  if(name==="open_brief"&&typeof args.title==="string"&&typeof args.body==="string")return {type:"sheet",title:args.title.slice(0,150),body:args.body.slice(0,2000)};
  if(name==="generate_image"&&typeof args.prompt==="string"&&args.prompt.trim())return {type:"open_studio",tab:"image",title:typeof args.style==="string"?`Illustration · ${args.style}`:"Illustration",body:args.prompt.slice(0,800)};
  if(name==="open_studio"&&["image","schema","storyboard","doc"].includes(String(args.tab))&&typeof args.title==="string"&&typeof args.body==="string")return {type:"open_studio",tab:args.tab as "image"|"schema"|"storyboard"|"doc",title:args.title.slice(0,150),body:args.body.slice(0,4000)};
  return null;
}
export function publishAction(action:MaterialAction) { if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("agl-action",{detail:action})); }
