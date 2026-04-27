import type { Metadata } from "next";
import TikTokReviewApp from "../components/TikTokReviewApp";

export const metadata: Metadata = {
  title: "Creator Workspace | adoptan.ai",
  description:
    "Creator workspace for TikTok Login Kit, profile scopes, video.list, video.upload, video.publish, and Content Posting API controls."
};

export default function AppPage() {
  return <TikTokReviewApp />;
}
