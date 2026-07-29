import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Live Health Intake | NSOffice.AI",
  description:
    "Real-time voice health intake with Gemini Live. Structured summary for clinician handoff.",
  applicationName: "NSOffice Live Health Intake",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }, { url: "/brand/favicon.png" }],
    apple: "/brand/favicon.png",
  },
  openGraph: {
    title: "Live Health Intake | NSOffice.AI",
    description:
      "Speak your symptoms. Gemini Live builds a clinician-ready note in real time.",
    siteName: "NSOffice.AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0000FE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/tokens.css" />
      </head>
      <body className="hive">
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
      <Script src="/liquid-glass.js" strategy="beforeInteractive" />
    </html>
  );
}
