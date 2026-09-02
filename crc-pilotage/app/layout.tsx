import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilotage CRC",
  description: "Suivi des chantiers et actions du CRC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans min-h-screen">
        <header className="border-b border-line px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm tracking-tight">CRC</span>
            <span className="text-ink/40">/</span>
            <span className="font-medium">Pilotage</span>
          </div>
          <nav className="flex gap-5 text-sm">
            <a href="/" className="hover:underline underline-offset-4">
              Tâches
            </a>
            <a href="/import" className="hover:underline underline-offset-4">
              Importer un CR
            </a>
          </nav>
        </header>
        <main className="px-6 py-8 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
