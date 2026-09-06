import type { Metadata, Viewport } from "next";
import FactoryConsole from "./FactoryConsole";

export const metadata: Metadata = {
  title: "Sentinelle — Factory",
  description:
    "Un prompt. Un worker qui cherche, monte et habille. Un bouton pour publier sur TikTok.",
  applicationName: "Sentinelle",
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

export default function SentinelleFactoryPage() {
  return <FactoryConsole />;
}
