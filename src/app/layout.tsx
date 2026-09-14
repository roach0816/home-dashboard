import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { readData } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "Landing page for home automation, homelab, and network links.",
};

// Reads the persisted theme on every request (see readData() below) rather
// than caching it at build time.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read here (in addition to page.tsx) so the theme is set on <html>
  // before the first byte renders — otherwise a non-default theme would
  // flash the default palette until the client applies it.
  const { theme } = await readData();
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
