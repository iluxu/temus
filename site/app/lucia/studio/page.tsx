import type { Metadata } from "next";
import ClipStudio from "../ClipStudio";

export const metadata: Metadata = {
  title: "Sentinelle Publisher Studio — Maison Lucia",
  description: "Le catalogue réel où les clips de Lucia se retrouvent, se comprennent et deviennent progressivement des Moments.",
  robots: { index: false, follow: false }
};

export default function LuciaMomentStudioPage() {
  return <ClipStudio />;
}
