// Lecture d’une page web pour la borne : mode lecture épuré + indication si la page accepte l’intégration.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface PageView { url: string; title: string; site: string; description?: string; image?: string; paragraphs: string[]; embeddable: boolean }

// Protection : seules les adresses publiques en http(s) sont lues (pas de réseau interne).
function privateIp(ip: string) {
  if (isIP(ip) === 6) return /^(::1|fc|fd|fe80|::ffff:(10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\.)/i.test(ip) || ip === "::";
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL; try { u = new URL(raw); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol) || (u.port && !["80", "443"].includes(u.port)) || u.username || u.password) return null;
  try { const addrs = await lookup(u.hostname, { all: true }); if (!addrs.length || addrs.some(a => privateIp(a.address))) return null; } catch { return null; }
  return u;
}
const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;|&rsquo;|&#8217;/g, "’").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
const meta = (html: string, name: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)`, "i"))?.[1] ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"))?.[1];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

// Essaie l’adresse demandée puis sa variante avec/sans « www » ; à défaut, une fiche minimale
// permet encore d’ouvrir la page sur téléphone via le QR code.
export async function readPage(raw: string): Promise<PageView | null> {
  const url = await safeUrl(raw); if (!url) return null;
  const alt = new URL(url); alt.hostname = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
  for (const candidate of [url, alt]) {
    const page = await fetchPage(candidate);
    if (page) return page;
  }
  return { url: url.toString(), title: url.hostname.replace(/^www\./, ""), site: url.hostname.replace(/^www\./, ""), description: "Aperçu indisponible depuis la borne : scannez le QR code pour ouvrir la page sur votre téléphone.", paragraphs: [], embeddable: false };
}

async function fetchPage(start: URL): Promise<PageView | null> {
  let url = await safeUrl(start.toString()); if (!url) return null;
  try {
    let r: Response | null = null;
    // Redirections suivies une à une pour revalider chaque destination.
    for (let hop = 0; hop < 4; hop++) {
      r = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7" }, signal: AbortSignal.timeout(10000) });
      const next = r.status >= 300 && r.status < 400 ? r.headers.get("location") : null;
      if (!next) break;
      const target = await safeUrl(new URL(next, url).toString()); if (!target) return null; url = target;
    }
    if (!r || !r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    const reader = r.body?.getReader(); if (!reader) return null;
    let html = ""; const dec = new TextDecoder();
    while (html.length < 1_500_000) { const { done, value } = await reader.read(); if (done) break; html += dec.decode(value, { stream: true }); }
    reader.cancel().catch(() => {});
    const xfo = (r.headers.get("x-frame-options") ?? "").toLowerCase();
    const csp = (r.headers.get("content-security-policy") ?? "").toLowerCase();
    const embeddable = !xfo && !/frame-ancestors\s+('none'|'self')/.test(csp);
    const body = (html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html).replace(/<(script|style|nav|footer|header|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ");
    const paragraphs = [...body.matchAll(/<(p|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => text(m[2])).filter(p => p.length > 50).filter((p, i, all) => all.indexOf(p) === i).slice(0, 14);
    const title = text(meta(html, "og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url.hostname).slice(0, 200);
    const image = meta(html, "og:image"); const description = meta(html, "og:description") ?? meta(html, "description");
    return { url: url.toString(), title, site: (meta(html, "og:site_name") ?? url.hostname.replace(/^www\./, "")).slice(0, 80), description: description ? text(description).slice(0, 400) : undefined, image: image ? new URL(image, url).toString() : undefined, paragraphs, embeddable };
  } catch (e) { console.warn("Lara page unavailable", e instanceof Error ? e.message : "unknown"); return null; }
}
