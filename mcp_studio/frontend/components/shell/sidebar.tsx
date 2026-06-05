"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FileText,
  MessageSquare,
  Wrench,
  Layers,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: Sparkles },
  { href: "/files", label: "Files", icon: FileText },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/resources", label: "Resources", icon: Layers },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r bg-card/50 backdrop-blur">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Boxes className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">MCP Studio</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            v0.1.0
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-[11px] leading-relaxed text-muted-foreground">
        Sandbox: any visitor can read and write files in this workspace.
      </div>
    </aside>
  );
}
