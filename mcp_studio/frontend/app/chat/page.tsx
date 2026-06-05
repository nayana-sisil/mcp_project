"use client";
import * as React from "react";
import { Bot, Loader2, Send, User, Wrench, ChevronDown, ChevronRight, StopCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useOverview } from "@/components/providers/overview-provider";
import type { ChatMessage, ToolTrace } from "@/lib/types";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  trace?: ToolTrace[];
  pending?: boolean;
};

export default function ChatPage() {
  const { overview } = useOverview();
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const pendingId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: pendingId, role: "assistant", content: "", pending: true },
    ]);

    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const history: ChatMessage[] = messages
        .filter((m) => !m.pending)
        .map(({ role, content }) => ({ role, content }));
      const r = await api.chat(text, history);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { ...msg, content: r.answer, trace: r.trace, pending: false }
            : msg
        )
      );
    } catch (e) {
      const err = e as Error & { status?: number; detail?: { code?: string; message?: string } };
      const detail = err.detail as { code?: string; message?: string } | undefined;
      const msg =
        err.status === 503 && detail?.code === "model_loading"
          ? "The local model is still loading. Give it a few seconds and try again."
          : err.message;
      setMessages((m) =>
        m.map((mm) =>
          mm.id === pendingId
            ? { ...mm, content: `Error: ${msg}`, pending: false }
            : mm
        )
      );
      toast.error(msg);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground">
            Talk to the local AI host. It can call any MCP tool exposed by the studio.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>
      </header>

      <Card className="flex h-[calc(100vh-220px)] flex-col">
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <CardContent className="space-y-4 p-4">
            {messages.length === 0 && (
              <EmptyState modelLoading={!!overview?.model.loading} modelReady={!!overview?.model.ready} />
            )}
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
          </CardContent>
        </ScrollArea>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask the studio to read a file, list the workspace, …"
              className="min-h-[44px] resize-none"
              rows={1}
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon" className="h-11 w-11">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Press Enter to send, Shift+Enter for newline. Local FLAN-T5-small model — answers are short.
          </p>
        </div>
      </Card>
    </div>
  );
}

function EmptyState({ modelLoading, modelReady }: { modelLoading: boolean; modelReady: boolean }) {
  return (
    <div className="flex h-[calc(100vh-340px)] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
      <Bot className="h-8 w-8 opacity-50" />
      <p>
        Start a conversation. Try: <span className="font-mono">"List the files in the workspace"</span>.
      </p>
      {modelLoading && !modelReady && (
        <Badge variant="warning">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading the local model…
        </Badge>
      )}
    </div>
  );
}

function Message({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : ""}`}>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          {message.pending ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
        {message.trace && message.trace.length > 0 && <Trace trace={message.trace} />}
      </div>
      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

function Trace({ trace }: { trace: ToolTrace[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-md border bg-background/40">
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" /> {trace.length} tool call{trace.length > 1 ? "s" : ""}
      </button>
      {open && (
        <div className="space-y-2 border-t p-2">
          {trace.map((t, i) => (
            <div key={i} className="rounded-md border bg-muted/30 p-2 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <Wrench className="h-3 w-3 text-primary" />
                <span className="font-semibold">{t.tool}</span>
                <span className="text-muted-foreground">({JSON.stringify(t.args)})</span>
              </div>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
                {t.result}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
