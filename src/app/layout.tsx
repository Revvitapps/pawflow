import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { FeedbackPanel } from "@/components/feedback-panel";
import { PhoneFrame } from "@/components/phone-frame";

import "./globals.css";

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
          <FeedbackPanel />
        </PhoneFrame>
      </body>
    </html>
  );
}
