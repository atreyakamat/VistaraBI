import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VistaraBI | Turn Business Data Into Decisions — Automatically",
  description: "AI-powered dashboards, KPIs, forecasting & business strategy — generated from your raw files. Transform messy spreadsheets into intelligent insights.",
  keywords: ["business intelligence", "AI analytics", "dashboard", "KPI", "forecasting", "data analytics"],
  authors: [{ name: "VistaraBI" }],
  openGraph: {
    title: "VistaraBI | AI-Powered Business Intelligence",
    description: "Transform your raw business files into clean dashboards, KPIs, forecasts and AI-powered strategy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
