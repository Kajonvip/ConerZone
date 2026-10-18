import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConerZone AI Movie Recap Studio",
  description: "A workspace for planning movie recaps, voice-over scripts, and subtitles."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="my">
      <body>{children}</body>
    </html>
  );
}
