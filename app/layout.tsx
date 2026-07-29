import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Live Health Intake | NSOffice.AI",
  description:
    "Real-time voice health intake with Gemini Live. Structured summary for clinician handoff.",
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
