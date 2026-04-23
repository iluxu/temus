import type { Metadata } from "next";
import WebWorkspaceHome from "./components/WebWorkspaceHome";

export const metadata: Metadata = {
  title: "adoptan.ai Web Workspace",
  description:
    "Web workspace for creator-controlled TikTok connection, content review, publishing, exports, and event feedback."
};

export default function HomePage() {
  return <WebWorkspaceHome />;
}
