import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { FeedbackPanel } from "@/components/feedback-panel";
import { PawFlowProvider } from "@/components/pawflow-provider";

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
      <body className="mobile-demo min-h-full flex flex-col">
        <PawFlowProvider>
          {children}
          <FeedbackPanel />
        </PawFlowProvider>
      </body>
    </html>
  );
}
