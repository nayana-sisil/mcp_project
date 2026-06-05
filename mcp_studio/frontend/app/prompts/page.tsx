"use client";
import * as React from "react";
import { BookOpen, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PromptDef } from "@/lib/types";

export default function PromptsPage() {
  const [prompts, setPrompts] = React.useState<PromptDef[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .listPrompts()
      .then((r) => setPrompts(r.prompts))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
        <p className="text-sm text-muted-foreground">
          Render MCP prompt templates. The output is a list of messages ready to
          drop into a chat with your model.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((p) => (
            <PromptCard key={p.name} prompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptCard({ prompt }: { prompt: PromptDef }) {
  const args = prompt.arguments || [];
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [rendered, setRendered] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const render = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.getPrompt(prompt.name, values);
      const text = r.messages
        .map((m) => `--- ${m.role.toUpperCase()} ---\n${m.content}`)
        .join("\n\n");
      setRendered(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" /> {prompt.name}
        </CardTitle>
        <CardDescription>{prompt.description || "—"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {args.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {args.map((a) => (
              <div key={a.name} className="space-y-1">
                <Label className="text-xs">
                  {a.name}
                  {a.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <Input
                  value={values[a.name] ?? ""}
                  onChange={(e) => setValues({ ...values, [a.name]: e.target.value })}
                  placeholder={a.description || a.name}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {rendered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(rendered);
                toast.success("Copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          )}
          <Button size="sm" onClick={render} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Render
          </Button>
        </div>

        {err && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}

        {rendered && (
          <Textarea readOnly value={rendered} className="min-h-[180px] font-mono text-xs" />
        )}
      </CardContent>
    </Card>
  );
}
