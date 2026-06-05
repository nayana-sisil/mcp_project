import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString();
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}

export function dirname(p: string): string {
  if (!p || p === "." || !p.includes("/")) return ".";
  return p.split("/").slice(0, -1).join("/") || ".";
}

export function basename(p: string): string {
  if (!p) return "";
  const parts = p.split("/");
  return parts[parts.length - 1] || "";
}
