import type { Metadata, Viewport } from "next";
import DemoExperience from "./DemoExperience";

export const metadata: Metadata = {
  title: "Sentinelle — Replay de démo",
  description:
    "Rejeu déterministe d'un cas réel : un live Twitch de Lucia devient huit TikToks verticaux sous-titrés, validés puis publiés.",
  applicationName: "Sentinelle",
  manifest: "/sentinelle-demo.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentinelle Démo"
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/sentinelle-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/sentinelle-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/sentinelle-apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  other: { "mobile-web-app-capable": "yes" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080908"
};

export default function SentinelleDemoPage() {
  return <DemoExperience />;
}
