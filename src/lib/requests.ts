"use client";
export type RequestKind = "appointment" | "careers";
export interface LocalRequest {
  id: string; kind: RequestKind; createdAt: string; fields: Record<string, string>;
}
const KEY = "agl_requests_v2";

export function listRequests(): LocalRequest[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function saveRequest(kind: RequestKind, fields: Record<string, string>): LocalRequest {
  const record = { id: crypto.randomUUID(), kind, createdAt: new Date().toISOString(), fields };
  localStorage.setItem(KEY, JSON.stringify([...listRequests(), record]));
  downloadFile(`AGL-${kind}-${record.id.slice(0,8)}.json`, JSON.stringify(record, null, 2), "application/json");
  return record;
}
export function downloadFile(name: string, data: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportRequestsCSV() {
  const fields = ["id", "kind", "createdAt", "name", "company", "email", "phone", "sector", "topic", "date", "time", "role", "profile", "message"];
  const safe = (v: string) => `"${(/^[=+\-@]/.test(v) ? "'"+v : v).replaceAll('"','""')}"`;
  const rows = listRequests().map(r => fields.map(k => safe(String(k in r ? r[k as keyof LocalRequest] : r.fields[k] ?? ""))).join(";"));
  downloadFile("AGL-SIREXE-demandes.csv", "\uFEFF"+fields.join(";")+"\n"+rows.join("\n"), "text/csv;charset=utf-8");
}
