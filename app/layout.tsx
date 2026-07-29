import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Live Health Intake | NSOffice.AI",
  description:
    "Real-time voice health intake with Gemini Live. Structured summary for clinician handoff.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
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
      <body className="hive">{children}</body>
      <Script src="/liquid-glass.js" strategy="beforeInteractive" />
    </html>
  );
}
