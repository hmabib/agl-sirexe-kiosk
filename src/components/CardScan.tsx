"use client";
import { useEffect, useRef, useState } from "react";
import { ScanLine, Download, ArrowRight, X, RotateCcw } from "lucide-react";
import { useKiosk, logEvent } from "@/lib/store";
import { extractCard, saveCardPrefill, EMPTY_CARD, type CardData } from "@/lib/cardscan";
import { downloadFile } from "@/lib/requests";

export function CardScan({ getVideo, onClose }: { getVideo: () => HTMLVideoElement | null; onClose: () => void }) {
  const k = useKiosk();
  const en = k.lang === "en";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState<CardData>(EMPTY_CARD);
  const [done, setDone] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  function snapshot(): string | undefined {
    const v = getVideo();
    if (!v || v.readyState < 2) return undefined;
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = Math.round((960 * v.videoHeight) / v.videoWidth);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }

  async function capture() {
    if (busy) return;
    const image = snapshot();
    if (!image) {
      setErr(en ? "Point the camera at the card." : "Pointez la caméra vers la carte.");
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true); setErr(""); k.touch();
    logEvent("cardscan_started", {});
    try {
      const data = await extractCard(image, k.lang, abort.signal);
      if (abort.signal.aborted) return;
      setPhoto(image); setForm(data); setDone(true);
      logEvent("cardscan_done", { hasEmail: !!data.email, hasPhone: !!data.phone });
    } catch {
      if (!abort.signal.aborted) setErr(en ? "Card unreadable. Try again with better light." : "Carte illisible. Réessayez avec une meilleure lumière.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  function retry() {
    controller.current?.abort();
    setPhoto(""); setForm(EMPTY_CARD); setDone(false); setErr("");
  }

  function useForAppointment() {
    saveCardPrefill(form);
    logEvent("cardscan_prefill", {});
    onClose();
    k.go("appointment");
  }

  const set = (key: keyof CardData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="panel" style={{ marginTop: 14 }} role="region" aria-label={en ? "Business card scanner" : "Scan de carte de visite"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="eyebrow">{en ? "BUSINESS CARD · FILM & READ" : "CARTE DE VISITE · FILMER & LIRE"}</span>
        <button className="ai-icon-btn" style={{ minWidth: 44, minHeight: 44 }} aria-label={en ? "Close scanner" : "Fermer le scan"} onClick={onClose}><X size={18} /></button>
      </div>
      {!done && (
        <>
          <p style={{ color: "#d4dfef", lineHeight: 1.6, marginTop: 8 }}>{en ? "Frame the card in the video, then capture. Lara reads the contact details." : "Cadrez la carte dans la vidéo, puis capturez. Lara lit les coordonnées."}</p>
          <div className="button-row">
            <button className="brand-btn" disabled={busy} onClick={capture}><ScanLine size={20} />{busy ? (en ? "Reading…" : "Lecture…") : (en ? "Capture & read" : "Capturer & lire")}</button>
          </div>
        </>
      )}
      {err && <p className="ai-status" role="alert">{err}</p>}
      {done && (
        <>
          {photo && <img src={photo} alt={en ? "Scanned card" : "Carte scannée"} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, marginTop: 12, border: "2px dashed #EED58E88" }} />}
          <div className="kiosk-form" style={{ marginTop: 14 }}>
            <label>{en ? "Name" : "Nom"}<input value={form.name} onChange={set("name")} maxLength={120} /></label>
            <label>{en ? "Company" : "Société"}<input value={form.company} onChange={set("company")} maxLength={120} /></label>
            <label>{en ? "Role" : "Fonction"}<input value={form.role} onChange={set("role")} maxLength={120} /></label>
            <label>Email<input type="email" value={form.email} onChange={set("email")} maxLength={150} /></label>
            <label className="full">{en ? "Phone" : "Téléphone"}<input type="tel" value={form.phone} onChange={set("phone")} maxLength={40} /></label>
          </div>
          <div className="button-row">
            <button className="text-action" onClick={retry}><RotateCcw size={16} />{en ? "Scan again" : "Recommencer"}</button>
            <button className="outline-btn" onClick={() => downloadFile("Africa Global Logistics-carte-visite.json", JSON.stringify({ ...form, scannedAt: new Date().toISOString() }, null, 2), "application/json")}><Download size={18} />JSON</button>
            <button className="brand-btn" onClick={useForAppointment}>{en ? "Use for appointment" : "Utiliser pour le rendez-vous"}<ArrowRight size={18} /></button>
          </div>
        </>
      )}
      <p className="ai-status" style={{ marginTop: 12 }}>{en ? "Reading is automatic — always check before saving. Nothing is sent anywhere." : "Lecture automatique — vérifiez toujours avant d’enregistrer. Rien n’est transmis."}</p>
    </div>
  );
}
