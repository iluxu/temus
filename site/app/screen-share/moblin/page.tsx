import type { Metadata } from "next";
import LiveScreen from "../live/LiveScreen";

export const metadata: Metadata = {
  title: "Moblin Screen Source | adoptan.ai",
  robots: {
    index: false,
    follow: false
  }
};

export default function MoblinScreenSourcePage() {
  return <LiveScreen />;
}
