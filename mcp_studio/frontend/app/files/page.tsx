"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Save,
  Trash2,
  Upload,
  FilePlus2,
  RefreshCcw,
  Pencil,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { basename, dirname, formatBytes, joinPath } from "@/lib/utils";
import type { FileContent, FileEntry } from "@/lib/types";
import { CodeView } from "@/components/files/code-view";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading editor…
    </div>
  ),
});

export default function FilesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      }
    >
      <FilesPageInner />
    </React.Suspense>
  );
}

function FilesPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialPath = search?.get("path") ?? ".";
  const [currentPath, setCurrentPath] = React.useState(initialPath);
  const [items, setItems] = React.useState<FileEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openFile, setOpenFile] = React.useState<string | null>(null);
  const [fileContent, setFileContent] = React.useState<FileContent | null>(null);
  const [fileLoading, setFileLoading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async (path: string) => {
    setLoading(true);
    try {
      const r = await api.listFiles(path);
      setItems(r.items);
      setCurrentPath(path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh(initialPath);
  }, [initialPath, refresh]);

  const open = React.useCallback(async (path: string) => {
    setOpenFile(path);
    setFileLoading(true);
    setDirty(false);
    setMode("view");
    router.replace(`/files?path=${encodeURIComponent(path)}`);
    try {
      const c = await api.readFile(path);
      setFileContent(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read");
      setFileContent(null);
    } finally {
      setFileLoading(false);
    }
  }, [router]);

  const save = React.useCallback(async () => {
    if (!openFile || !fileContent) return;
    try {
      await api.writeFile(openFile, fileContent.content);
      toast.success("Saved");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }, [openFile, fileContent]);

  const onUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await api.uploadFile(currentPath, f);
      toast.success("Uploaded");
      refresh(currentPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      e.target.value = "";
    }
  }, [currentPath, refresh]);

  const onDelete = React.useCallback(async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await api.deleteFile(path);
      toast.success("Deleted");
      if (openFile === path) {
        setOpenFile(null);
        setFileContent(null);
      }
      refresh(currentPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }, [openFile, currentPath, refresh]);

  const onCreate = React.useCallback(async (name: string, isDir: boolean) => {
    const target = joinPath(currentPath, name);
    try {
      if (isDir) {
        // Use a tiny placeholder file because the backend only has mkdir via a separate path
        await api.writeFile(joinPath(target, ".keep"), "");
      } else {
        await api.writeFile(target, "");
      }
      toast.success(isDir ? "Folder created" : "File created");
      refresh(currentPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  }, [currentPath, refresh]);

  const crumbs = currentPath === "." ? [] : currentPath.split("/");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">
            Browse and edit files in the sandboxed workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh(currentPath)}>
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onUpload}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          <CreateDialog onCreate={onCreate} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-[calc(100vh-220px)] overflow-hidden">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm">Workspace</CardTitle>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <button className="hover:text-foreground" onClick={() => refresh(".")}>root</button>
              {crumbs.map((c, i) => {
                const path = crumbs.slice(0, i + 1).join("/");
                return (
                  <span key={path} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <button className="hover:text-foreground" onClick={() => refresh(path)}>
                      {c}
                    </button>
                  </span>
                );
              })}
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-88px)]">
            <CardContent className="p-2">
              {currentPath !== "." && (
                <button
                  onClick={() => refresh(dirname(currentPath))}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> ..
                </button>
              )}
              {loading ? (
                <div className="space-y-1.5 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  This folder is empty.
                </p>
              ) : (
                items.map((f) => {
                  const active = openFile === f.path;
                  return (
                    <div
                      key={f.path}
                      className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent ${active ? "bg-primary/10 text-primary" : ""}`}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => {
                          if (f.type === "directory") {
                            refresh(f.path);
                          } else {
                            open(f.path);
                          }
                        }}
                      >
                        {f.type === "directory" ? (
                          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="truncate">{f.name}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <span className="text-[10px] text-muted-foreground">
                          {f.type === "file" ? formatBytes(f.size) : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onDelete(f.path)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        <Card className="flex h-[calc(100vh-220px)] flex-col overflow-hidden">
          {openFile ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{basename(openFile)}</span>
                    {dirty && <Badge variant="warning">unsaved</Badge>}
                  </CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{openFile}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border p-0.5">
                    <Button
                      size="sm"
                      variant={mode === "view" ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setMode("view")}
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant={mode === "edit" ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setMode("edit")}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  {mode === "edit" && (
                    <Button size="sm" onClick={save} disabled={!dirty}>
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-auto">
                {fileLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : fileContent ? (
                  mode === "view" ? (
                    <CodeView content={fileContent.content} language={fileContent.language} />
                  ) : (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      path={openFile}
                      language={fileContent.language}
                      value={fileContent.content}
                      onChange={(v) => {
                        setFileContent({ ...fileContent, content: v ?? "" });
                        setDirty(true);
                      }}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  )
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">No content.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 opacity-50" />
              <p>Pick a file from the workspace to view or edit it.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CreateDialog({ onCreate }: { onCreate: (name: string, isDir: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [isDir, setIsDir] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FilePlus2 className="h-3.5 w-3.5" /> New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="example.py" autoFocus />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="isdir"
              type="checkbox"
              checked={isDir}
              onChange={(e) => setIsDir(e.target.checked)}
            />
            <Label htmlFor="isdir" className="cursor-pointer">Create as folder</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!name.trim()) return;
              onCreate(name.trim(), isDir);
              setName("");
              setIsDir(false);
              setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
