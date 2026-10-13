import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookForge — Book Writing & Publishing",
  description: "A bilingual Bangla and English book writing workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
