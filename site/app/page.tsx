import type { Metadata } from "next";
import WebWorkspaceHome from "./components/WebWorkspaceHome";

export const metadata: Metadata = {
  title: "adoptan.ai Web Workspace",
  description:
    "Web workspace for creator-controlled TikTok Login Kit profile context, video list review, Content Posting API draft upload, direct post, status tracking, and disconnect."
};

export default function HomePage() {
  return <WebWorkspaceHome />;
}
