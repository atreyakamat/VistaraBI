import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
