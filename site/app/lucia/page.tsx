import type { Metadata } from "next";
import LuciaHouse from "./LuciaHouse";

export const metadata: Metadata = {
  title: "Maison Lucia",
  description:
    "La projection publique de Maison Lucia, avec Lucia’s Sentinel, son Contract et ce qui se passe maintenant.",
  robots: {
    index: true,
    follow: true
  }
};

export default function LuciaPage() {
  return <LuciaHouse />;
}
