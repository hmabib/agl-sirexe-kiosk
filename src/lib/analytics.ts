"use client";

export interface AnalyticsEvent { ts: string; name: string; data: Record<string, unknown> }
export interface KioskStats {
  totalEvents: number;
  sessions: number;
  byName: { name: string; count: number }[];
  funnel: { started: number; mining: number; appointment: number; satisfaction: number };
  voice: number;
  images: number;
  scans: number;
  docs: number;
  perHour: { hour: string; count: number }[];
}

const KEY = "agl_analytics";

export function readEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(KEY) ?? "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function sessionId(): string {
  try {
    let sid = sessionStorage.getItem("agl_sid");
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("agl_sid", sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

export function computeStats(events: AnalyticsEvent[]): KioskStats {
  const byName = new Map<string, number>();
  const sessions = new Set<string>();
  const perHour = new Map<string, number>();
  let voice = 0, images = 0, scans = 0, docs = 0;
  let started = 0, mining = 0, appointment = 0, satisfaction = 0;
  const seenScreens = new Map<string, Set<string>>();
  for (const e of events) {
    byName.set(e.name, (byName.get(e.name) ?? 0) + 1);
    const sid = typeof e.data.sid === "string" ? e.data.sid : "legacy";
    sessions.add(sid);
    const hour = String(e.ts).slice(0, 13);
    perHour.set(hour, (perHour.get(hour) ?? 0) + 1);
    if (e.name === "voice_used") voice++;
    if (e.name === "image_generated") images++;
    if (e.name === "cardscan_done") scans++;
    if (e.name === "studio_opened") docs++;
    if (e.name === "session_started") started++;
    if (e.name === "experience_selected" && typeof e.data.screen === "string") {
      const s = e.data.screen;
      let set = seenScreens.get(sid);
      if (!set) { set = new Set(); seenScreens.set(sid, set); }
      if (s === "mining") set.add("mining");
      if (s === "appointment" || s === "careers") set.add("appointment");
      if (s === "satisfaction") set.add("satisfaction");
    }
  }
  for (const set of seenScreens.values()) {
    if (set.has("mining")) mining++;
    if (set.has("appointment")) appointment++;
    if (set.has("satisfaction")) satisfaction++;
  }
  return {
    totalEvents: events.length,
    sessions: sessions.size,
    byName: [...byName.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    funnel: { started, mining, appointment, satisfaction },
    voice, images, scans, docs,
    perHour: [...perHour.entries()].map(([hour, count]) => ({ hour: hour.slice(11) + "h", count })).sort((a, b) => a.hour.localeCompare(b.hour)).slice(-12),
  };
}

export function analyticsCSV(events: AnalyticsEvent[]): string {
  const safe = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const rows = events.map(e => [e.ts, e.name, JSON.stringify(e.data)].map(safe).join(";"));
  return "﻿ts;event;data\n" + rows.join("\n");
}
