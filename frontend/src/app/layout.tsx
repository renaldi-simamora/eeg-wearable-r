import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#f7f8f5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "NeuroPulse EEG | Biosignal IoT & Neural Research Platform",
  description:
    "Web-based research platform for monitoring EEG sessions, visualizing high-resolution biosignal data, and preparing machine-learning analysis.",
  keywords: [
    "NeuroPulse",
    "EEG Wearable",
    "IoT",
    "ESP32",
    "TGAM1",
    "Brainwaves",
    "Biosignal",
    "Machine Learning",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#f7f8f5] text-[#1c1e1a] flex flex-col font-sans antialiased selection:bg-[#5b6d49]/20 selection:text-[#1c1e1a]">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
