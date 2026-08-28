import type { Metadata, Viewport } from "next";
import SentinelleApp from "./SentinelleApp";

export const metadata: Metadata = {
  title: "Sentinelle — Lucia Moments",
  description:
    "Watch, shape and compose Lucia Moments with Sentinelle inside the same shared reality.",
  applicationName: "Sentinelle",
  manifest: "/sentinelle.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentinelle"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/sentinelle-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/sentinelle-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/sentinelle-apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080908"
};

export default function SentinellePage() {
  return <SentinelleApp />;
}
