import "./globals.css";

export const metadata = {
  title: "ADOPTAN.AI — Votre marché, en temps réel",
  description:
    "Comprenez votre écosystème. Apprenez de ceux qui réussissent. Surveillez votre marché 24/7 avec l'IA."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
