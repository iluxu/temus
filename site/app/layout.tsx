import "./globals.css";
import { Fraunces, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display"
});

export const metadata = {
  title: "codex-skill — Ship installable Codex skills",
  description:
    "codex-skill is a lightweight CLI + registry workflow for packaging, publishing, and installing Codex skills across teams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
