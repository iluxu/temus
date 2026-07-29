import type { Metadata } from "next";
import ScreenShareStudio from "./ScreenShareStudio";

export const metadata: Metadata = {
  title: "Partage d’écran Mac → Moblin | adoptan.ai",
  description:
    "Studio WebRTC adoptan.ai pour partager un écran MacBook dans une source navigateur Moblin."
};

export default function ScreenSharePage() {
  return <ScreenShareStudio />;
}
