import type { Metadata } from "next";
import TikTokBlocksApp from "./TikTokBlocksApp";

export const metadata: Metadata = {
  title: "TikTok Blocks | adoptan.ai",
  description: "Review and publish creator-approved TikTok video blocks."
};

export default function TikTokBlocksPage() {
  return <TikTokBlocksApp />;
}
