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
  title: "TEMUS — RAG public payant",
  description:
    "TEMUS transforme des docs autorisees en un service RAG public payant, avec citations, conformite et deploiement Cloudflare Pages."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
