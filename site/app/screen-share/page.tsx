import type { Metadata } from "next";
import ScreenShareStudio from "./ScreenShareStudio";

export const metadata: Metadata = {
  title: "Partage d’écran Mac → Mini OBS | adoptan.ai",
  description:
    "Studio WebRTC adoptan.ai pour partager tout l’écran du MacBook dans le Mini OBS de l’iPhone."
};

export default function ScreenSharePage() {
  return <ScreenShareStudio />;
}
