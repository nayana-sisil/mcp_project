"use client";
import * as React from "react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/files", label: "Files" },
  { href: "/tools", label: "Tools" },
  { href: "/resources", label: "Resources" },
  { href: "/prompts", label: "Prompts" },
  { href: "/chat", label: "Chat" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileMenu />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function MobileMenu() {
  const pathname = usePathname();
  return (
    <div className="flex h-12 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">MCP Studio</div>
          <nav className="space-y-1 p-3">
            {items.map((it) => {
              const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm",
                    active ? "bg-primary/15 text-primary" : "hover:bg-accent"
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
