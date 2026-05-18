import type { Metadata } from "next";
import { Toaster } from "sonner";
import { validateEnv } from "@/lib/env";
import "./globals.css";

// Validate required environment variables at startup
// This will throw with a clear message if DATABASE_URL or JWT_SECRET are missing
validateEnv();

export const metadata: Metadata = {
  title: "VistaraBI | Turn Business Data Into Decisions — Automatically",
  description: "AI-powered dashboards, KPIs, forecasting & business strategy — generated from your raw files. Transform messy spreadsheets into intelligent insights.",
  keywords: ["business intelligence", "AI analytics", "dashboard", "KPI", "forecasting", "data analytics", "CSV to dashboard", "AI BI tool"],
  authors: [{ name: "VistaraBI" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://vistarabi.com'),
  openGraph: {
    title: "VistaraBI | AI-Powered Business Intelligence",
    description: "Transform your raw business files into clean dashboards, KPIs, forecasts and AI-powered strategy.",
    type: "website",
    url: "/",
    siteName: "VistaraBI",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "VistaraBI — AI Business Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VistaraBI | AI-Powered Business Intelligence",
    description: "Upload a CSV, get a full AI dashboard in minutes.",
    images: ["/opengraph-image.png"],
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
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
      <body className="antialiased">
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
