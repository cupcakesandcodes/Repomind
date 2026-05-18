import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoMind | AI Codebase Intelligence",
  description: "Chat with any GitHub repository using AI. Understand logic, find features, and get improvement suggestions instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div className="bg-glow" />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
