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
  title: "ADOPTAN.AI — Control AI Agent Execution",
  description:
    "ADOPTAN.AI is the execution layer for AI agents. Enterprise-grade security, full audit trail, GDPR compliant. Control how AI runs in your organization."
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
