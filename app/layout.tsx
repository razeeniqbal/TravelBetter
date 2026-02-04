import React from "react"
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Travel Better - Plan Your Perfect Trip",
  description: "Plan and organize your perfect trip with AI-powered suggestions and community-shared itineraries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
