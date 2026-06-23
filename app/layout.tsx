import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Technocorner 2026 Scoreboard",
  description: "Realtime room scoreboard for Technocorner competitions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
