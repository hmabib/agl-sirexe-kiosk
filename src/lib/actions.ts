// Actions de matérialisation "Jarvis" : l'IA ne parle plus seulement, elle FAIT.
export type MaterialAction =
  | { type: "show_route"; route: "route-A" | "route-B" | "route-C"; note?: string }
  | { type: "visual"; image: string; prompt: string; model: string }
  | { type: "sheet"; title: string; body: string; items: string[] }
  | { type: "go"; screen: "home" | "mission" | "explore" | "build" | "vision" | "finale" };

export interface ActionSheet {
  id: number;
  action: MaterialAction;
}
