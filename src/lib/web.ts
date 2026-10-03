// Accès internet de Lara : recherche web sourcée et flux d’actualités (serveur uniquement).
export interface WebItem { title: string; url: string; source?: string; date?: string }
export interface WebResult { ok: boolean; kind: "search" | "news"; query: string; summary?: string; items: WebItem[] }

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").trim();
const clean = (u: string) => { try { const url = new URL(u); url.searchParams.delete("utm_source"); return url.toString(); } catch { return u; } };

// Flux d’actualités : Google News RSS (gratuit, sans clé), les plus récents d’abord.
export async function newsFeed(query: string, lang = "fr"): Promise<WebResult> {
  const q = encodeURIComponent(query.slice(0, 200));
  const url = lang === "en" ? `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en` : `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AGL-Kiosk/1.0)" }, signal: AbortSignal.timeout(8000) });
    const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
      const it = m[1];
      const get = (tag: string) => decode(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
      const source = get("source");
      const title = get("title").replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
      return { title, url: get("link"), source, date: get("pubDate") };
    }).filter(i => i.title && i.url)
      .sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0))
      .slice(0, 8);
    return { ok: items.length > 0, kind: "news", query, items };
  } catch (e) {
    console.warn("Lara news unavailable", e instanceof Error ? e.message : "unknown");
    return { ok: false, kind: "news", query, items: [] };
  }
}

// Recherche web : synthèse sourcée via la recherche intégrée d’OpenAI ; repli sur les actualités.
export async function webSearch(query: string, lang = "fr"): Promise<WebResult> {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (key) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini", tools: [{ type: "web_search" }], input: `${query.slice(0, 500)}\n\nRéponds en ${lang === "en" ? "anglais" : "français"}, en 3 à 5 phrases factuelles et datées, sans liste ni markdown. Cite tes sources.` }),
      });
      const j = await r.json();
      if (r.ok) {
        let summary = ""; const items: WebItem[] = [];
        for (const o of j.output ?? []) if (o.type === "message") for (const c of o.content ?? []) {
          summary += c.text ?? "";
          for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url && !items.some(i => clean(i.url) === clean(a.url))) items.push({ title: a.title || new URL(a.url).hostname, url: clean(a.url), source: new URL(a.url).hostname.replace(/^www\./, "") });
        }
        summary = summary.replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
        if (summary) return { ok: true, kind: "search", query, summary: summary.slice(0, 1500), items: items.slice(0, 6) };
      } else console.warn("Lara web search unavailable", r.status, String(j?.error?.message ?? "").slice(0, 160));
    } catch (e) { console.warn("Lara web search unavailable", e instanceof Error ? e.message : "unknown"); }
  }
  const news = await newsFeed(query, lang);
  return { ...news, kind: "search" };
}
