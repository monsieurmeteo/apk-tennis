import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tennis Quant Edge | Value Bets",
  description: "Dashboard quantitatif pour l'arbitrage sur les paris sportifs tennis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} font-sans`}>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
