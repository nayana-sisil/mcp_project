"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Boxes, FileText, Layers, MessageSquare, RefreshCcw, Wrench, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/components/providers/overview-provider";
import { api } from "@/lib/api";
import { formatDate, formatBytes } from "@/lib/utils";
import type { FileEntry } from "@/lib/types";

export default function DashboardPage() {
  const { overview, loading, error, refresh } = useOverview();
  const [files, setFiles] = React.useState<FileEntry[]>([]);

  React.useEffect(() => {
    api
      .listFiles()
      .then((r) => setFiles(r.items))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="gradient-text">MCP Studio</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A unified Model Context Protocol server, tool explorer, and AI host - all
          in one app. Browse MCP capabilities, manage a sandboxed workspace, and
          chat with a local model that can call your tools.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link href="/chat">
              <MessageSquare className="h-4 w-4" /> Open chat
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tools">
              <Wrench className="h-4 w-4" /> Explore tools
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          loading={loading}
          icon={<Wrench className="h-4 w-4" />}
          label="Tools"
          value={overview?.counts.tools ?? 0}
          href="/tools"
        />
        <StatCard
          loading={loading}
          icon={<Layers className="h-4 w-4" />}
          label="Resources"
          value={overview?.counts.resources ?? 0}
          href="/resources"
        />
        <StatCard
          loading={loading}
          icon={<BookOpen className="h-4 w-4" />}
          label="Prompts"
          value={overview?.counts.prompts ?? 0}
          href="/prompts"
        />
        <StatCard
          loading={loading}
          icon={<Boxes className="h-4 w-4" />}
          label="Model"
          valueLabel={
            overview?.model.error
              ? "error"
              : overview?.model.ready
              ? "ready"
              : "loading"
          }
          href="/chat"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Workspace
            </CardTitle>
            <CardDescription className="truncate">
              {overview?.workspace ?? "loading…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files yet.</p>
            ) : (
              <ul className="divide-y">
                {files.slice(0, 8).map((f) => (
                  <li key={f.path} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      href={`/files?path=${encodeURIComponent(f.path)}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      {f.type === "directory" ? (
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{f.name}</span>
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {f.type === "file" ? formatBytes(f.size) : formatDate(f.modified)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/files">
                  Open files <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Status
            </CardTitle>
            <CardDescription>Live server health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Model" value={
              overview?.model.error ? (
                <Badge variant="destructive">error</Badge>
              ) : overview?.model.ready ? (
                <Badge variant="success">ready</Badge>
              ) : overview?.model.loading ? (
                <Badge variant="warning">loading</Badge>
              ) : (
                <Badge variant="secondary">—</Badge>
              )
            }/>
            <Row label="Name" value={overview?.model.name ?? "—"} />
            <Row label="MCP error" value={overview?.mcp_error ? <Badge variant="destructive">error</Badge> : <Badge variant="success">none</Badge>} />
            <Row label="API error" value={error ? <Badge variant="destructive">error</Badge> : <Badge variant="success">ok</Badge>} />
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                <RefreshCcw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  loading,
  icon,
  label,
  value,
  valueLabel,
  href,
}: {
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  value?: number;
  valueLabel?: string;
  href: string;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-12" />
          ) : valueLabel ? (
            <p className="mt-1 text-2xl font-semibold capitalize">{valueLabel}</p>
          ) : (
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          )}
        </div>
        <Link href={href} className="text-muted-foreground hover:text-primary" aria-label={`Open ${label}`}>
          {icon}
        </Link>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
