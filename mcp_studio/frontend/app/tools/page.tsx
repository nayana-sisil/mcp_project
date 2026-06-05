"use client";
import * as React from "react";
import { Wrench, Play, Loader2, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { CodeView } from "@/components/files/code-view";
import type { ToolSchema } from "@/lib/types";

export default function ToolsPage() {
  const [tools, setTools] = React.useState<ToolSchema[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<ToolSchema | null>(null);

  React.useEffect(() => {
    api
      .listTools()
      .then((r) => setTools(r.tools))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Call any MCP tool exposed by the studio. Arguments are validated against
          each tool's JSON schema.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No tools registered.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Card key={t.name} className="group flex flex-col transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4 text-primary" />
                    {t.name}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {Object.keys(t.inputSchema?.properties || {}).length} args
                  </Badge>
                </div>
                <CardDescription className="line-clamp-3 min-h-[3em]">
                  {t.description || "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex justify-end">
                <Button size="sm" onClick={() => setActive(t)}>
                  <Play className="h-3.5 w-3.5" /> Run
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ToolDialog tool={active} onClose={() => setActive(null)} />
    </div>
  );
}

function ToolDialog({ tool, onClose }: { tool: ToolSchema | null; onClose: () => void }) {
  const [args, setArgs] = React.useState<Record<string, string>>({});
  const [raw, setRaw] = React.useState<string>("{}");
  const [result, setResult] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tool) {
      setArgs({});
      setRaw("{}");
      setResult(null);
      setErr(null);
    }
  }, [tool]);

  if (!tool) return null;

  const properties = tool.inputSchema?.properties || {};
  const required = tool.inputSchema?.required || [];

  const run = async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      let payload: Record<string, unknown> = {};
      const propKeys = Object.keys(properties);
      if (propKeys.length > 0) {
        // Build from form
        for (const k of propKeys) {
          const v = args[k];
          if (v === undefined || v === "") continue;
          const t = properties[k].type;
          if (t === "number" || t === "integer") payload[k] = Number(v);
          else if (t === "boolean") payload[k] = v === "true";
          else payload[k] = v;
        }
      } else {
        // Fall back to raw JSON
        const parsed = JSON.parse(raw || "{}");
        if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
          throw new Error("Raw JSON must be an object");
        }
        payload = parsed as Record<string, unknown>;
      }
      const r = await api.callTool(tool.name, payload);
      setResult(r.result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={!!tool} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> {tool.name}
          </DialogTitle>
          <DialogDescription>{tool.description || "—"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.keys(properties).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(properties).map(([k, v]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {k}
                    {required.includes(k) && <span className="text-destructive">*</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{v.type}</span>
                  </Label>
                  {v.enum ? (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={args[k] ?? ""}
                      onChange={(e) => setArgs({ ...args, [k]: e.target.value })}
                    >
                      <option value="">—</option>
                      {v.enum.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : v.type === "boolean" ? (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={args[k] ?? ""}
                      onChange={(e) => setArgs({ ...args, [k]: e.target.value })}
                    >
                      <option value="">—</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <Input
                      value={args[k] ?? ""}
                      onChange={(e) => setArgs({ ...args, [k]: e.target.value })}
                      placeholder={v.description || k}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Code2 className="h-3.5 w-3.5" /> Raw arguments (JSON)
              </Label>
              <Textarea
                rows={4}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="font-mono"
              />
            </div>
          )}

          {err && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </div>
          )}

          {result !== null && (
            <div className="space-y-1.5">
              <Label>Result</Label>
              <div className="max-h-64 overflow-auto rounded-md border bg-muted/40">
                <CodeView content={result} language="text" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
