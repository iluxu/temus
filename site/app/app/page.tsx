import type { Metadata } from "next";
import TikTokReviewApp from "../components/TikTokReviewApp";

export const metadata: Metadata = {
  title: "Review App | adoptan.ai",
  description:
    "Clickable TikTok sandbox review flow for Login Kit, profile scopes, video.list, video.upload, video.publish, and Content Posting API controls."
};

export default function AppPage() {
  return <TikTokReviewApp />;
}
