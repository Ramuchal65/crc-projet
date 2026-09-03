import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
      <body className="font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-8 py-8 max-w-[1600px] min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
