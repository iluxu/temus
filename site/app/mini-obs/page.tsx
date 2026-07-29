import type { Metadata } from "next";
import MiniObsStudio from "./MiniObsStudio";

export const metadata: Metadata = {
  title: "Mini OBS mobile | adoptan.ai",
  description:
    "Régie web privée pour diffuser la caméra de l’iPhone, l’écran du Mac et les overlays sans Moblin.",
  robots: {
    index: false,
    follow: false
  }
};

export default function MiniObsPage() {
  return <MiniObsStudio />;
}
