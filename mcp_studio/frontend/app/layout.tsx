import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OverviewProvider } from "@/components/providers/overview-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "MCP Studio",
  description:
    "MCP Studio - a unified Model Context Protocol server and web UI over HTTP.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <OverviewProvider>
            <AppShell>
              <div className="min-w-0">{children}</div>
            </AppShell>
            <ToastProvider />
          </OverviewProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
