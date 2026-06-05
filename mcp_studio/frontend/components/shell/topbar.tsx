"use client";
import * as React from "react";
import { Activity, Moon, Sun, Github } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOverview } from "@/components/providers/overview-provider";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { overview, loading } = useOverview();

  const modelVariant = overview?.model.error
    ? "destructive"
    : overview?.model.ready
    ? "success"
    : "warning";
  const modelLabel = overview?.model.error
    ? "Model error"
    : overview?.model.ready
    ? "Model ready"
    : overview?.model.loading
    ? "Loading model…"
    : "Checking…";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-sm font-semibold">MCP Studio</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Badge variant={modelVariant} className="hidden gap-1.5 sm:inline-flex">
          <Activity className="h-3 w-3" />
          {modelLabel}
        </Badge>
        <a
          href="https://huggingface.co/spaces"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          /mcp/mcp
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <a
          href="https://huggingface.co"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Hugging Face"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
