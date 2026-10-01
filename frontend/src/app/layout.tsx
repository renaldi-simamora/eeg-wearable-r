import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EEG Wearable Platform | IoT EEG Monitoring & Machine Learning",
  description:
    "Web-based platform for monitoring EEG sessions, visualizing signal data, and preparing machine-learning analysis in an integrated IoT environment.",
  keywords: [
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
      <body className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600/30 selection:text-white">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
