"use client";
import * as React from "react";
import { Layers, Loader2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { CodeView } from "@/components/files/code-view";
import type { ResourceDef } from "@/lib/types";

export default function ResourcesPage() {
  const [resources, setResources] = React.useState<ResourceDef[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .listResources()
      .then((r) => setResources(r.resources))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground">
          Browse MCP resources. Each template is filled in with arguments and read
          back as content.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No resources registered.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((r) => (
            <ResourceCard key={r.uriTemplate} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: ResourceDef }) {
  const args = resource.arguments || [];
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const uri = React.useMemo(() => {
    let u = resource.uriTemplate;
    for (const a of args) {
      u = u.replace(`{${a.name}}`, encodeURIComponent(values[a.name] ?? ""));
    }
    return u;
  }, [resource.uriTemplate, args, values]);

  const read = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.readResource(uri);
      setContent(r.content);
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
          <Layers className="h-4 w-4 text-primary" /> {resource.name}
        </CardTitle>
        <CardDescription className="font-mono text-xs">{resource.uriTemplate}</CardDescription>
        {resource.description && (
          <p className="pt-1 text-sm text-muted-foreground">{resource.description}</p>
        )}
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
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {uri}
          </Badge>
          <Button size="sm" onClick={read} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Read
          </Button>
        </div>
        {err && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}
        {content !== null && (
          <div className="max-h-64 overflow-auto rounded-md border bg-muted/40">
            <CodeView content={content} language="text" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
