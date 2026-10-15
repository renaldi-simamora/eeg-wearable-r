import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";

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
    <html lang="id" className="antialiased scroll-smooth">
      <body className="min-h-screen bg-[#EFEDE8] text-[#262622] flex flex-col font-sans antialiased selection:bg-[#66744F]/20 selection:text-[#262622]">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
