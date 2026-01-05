import "./globals.css";

export const metadata = {
  title: "ADOPTAN.AI — Infrastructure for AI Agents",
  description:
    "Deploy, monitor, and control AI agents across your organization. One platform for visibility, compliance, and governance."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
