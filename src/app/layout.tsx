import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SONORA — Music to Art AI Studio",
  description:
    "Upload a song, press play, and watch SONORA transform music into living artwork. A premium AI-powered music-to-art creative studio.",
  keywords: [
    "SONORA",
    "music to art",
    "AI art",
    "generative art",
    "audio visualizer",
    "creative studio",
    "Web Audio API",
  ],
  authors: [{ name: "SONORA Studio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "SONORA — Music to Art AI Studio",
    description:
      "Upload a song, press play, and watch an extraordinary piece of artwork come to life in synchronization with the music.",
    siteName: "SONORA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SONORA — Music to Art AI Studio",
    description:
      "Upload a song, press play, and watch an extraordinary piece of artwork come to life in synchronization with the music.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
