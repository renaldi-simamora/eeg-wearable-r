import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#EFEDE8",
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
      className={`${cormorant.variable} ${manrope.variable} ${jetbrainsMono.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#EFEDE8] text-[#262622] flex flex-col font-sans antialiased selection:bg-[#66744F]/20 selection:text-[#262622]">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
