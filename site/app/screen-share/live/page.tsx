import type { Metadata } from "next";
import LiveScreen from "./LiveScreen";

export const metadata: Metadata = {
  title: "Live Screen | adoptan.ai",
  description: "Source navigateur temps réel pour le partage d’écran adoptan.ai."
};

export default function LiveScreenPage() {
  return <LiveScreen />;
}
