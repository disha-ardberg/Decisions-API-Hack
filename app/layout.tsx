import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { EvaluationsProvider } from "@/lib/evaluations";
import { getMaxConcurrency } from "@/lib/pool";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel — Synthetic Focus Group",
  description: "Test your pitch on 10 synthetic customers before you spend a dollar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><meta name="panel-max-concurrency" content={String(getMaxConcurrency())} /></head>
      <body className="min-h-screen bg-bg font-sans antialiased">
        <EvaluationsProvider>
          <AppShell>{children}</AppShell>
        </EvaluationsProvider>
      </body>
    </html>
  );
}
