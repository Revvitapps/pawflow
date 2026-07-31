import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { PhoneFrame } from "@/components/phone-frame";

import "./globals.css";

// SECURITY/PROTOTYPE FLAG (do not silently remove): <PhoneFrame> wraps the
// entire app in a phone-mockup presentation shell left over from the demo/
// prototype era. It is presentation-only (no security impact) but constrains
// the live product to a phone viewport. Removing it is a product/UX decision —
// deliberately left in place in this security pass. Tracked in the PR.

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawFlow",
  description: "AI-powered operating system for grooming, boarding, daycare, and independent pet-care businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <PhoneFrame>
          {children}
        </PhoneFrame>
      </body>
    </html>
  );
}
