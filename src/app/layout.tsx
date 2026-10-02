import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./experience.css";

export const metadata: Metadata = {
  title: "Africa Global Logistics × SIREXE — Borne Immersive",
  description: "Connecting Africa. Powering Possibilities. Expérience kiosk Africa Global Logistics Côte d'Ivoire.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full flex flex-col select-none">{children}</body>
    </html>
  );
}
