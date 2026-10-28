import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel — Synthetic Focus Group",
  description: "Test your pitch on 10 synthetic customers before you spend a dollar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans antialiased">{children}</body>
    </html>
  );
}
