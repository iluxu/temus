import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "adoptan.ai — Watchlists, signals, and publishing workflows",
  description:
    "Desktop and web workspace to monitor market signals, review content, and trigger user-approved publishing workflows."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
