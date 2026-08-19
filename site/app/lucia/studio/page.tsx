import type { Metadata } from "next";
import MomentStudio from "../MomentStudio";

export const metadata: Metadata = {
  title: "Moment Studio — Maison Lucia",
  description: "Le Studio privé où Lucia et Luca comprennent, retrouvent et gouvernent les Moments.",
  robots: { index: false, follow: false }
};

export default function LuciaMomentStudioPage() {
  return <main style={{ minHeight: "100vh", padding: "clamp(1rem, 4vw, 4rem)", background: "#f5f0f7" }}><MomentStudio operator /></main>;
}
