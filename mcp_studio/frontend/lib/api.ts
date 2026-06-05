import type {
  ChatMessage,
  ChatResponse,
  FileContent,
  FileEntry,
  HealthResponse,
  OverviewResponse,
  PromptRender,
  PromptDef,
  ResourceDef,
  ToolSchema,
} from "./types";

const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const err = new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    ) as Error & { status?: number; detail?: unknown };
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  overview: () => request<OverviewResponse>("/api/overview"),

  listTools: () => request<{ tools: ToolSchema[] }>("/api/tools"),
  callTool: (name: string, arguments_: Record<string, unknown>) =>
    request<{ name: string; result: string }>(`/api/tools/${encodeURIComponent(name)}/call`, {
      method: "POST",
      body: JSON.stringify({ arguments: arguments_ }),
    }),

  listResources: () => request<{ resources: ResourceDef[] }>("/api/resources"),
  readResource: (uri: string) =>
    request<{ uri: string; content: string }>("/api/resources/read", {
      method: "POST",
      body: JSON.stringify({ uri }),
    }),

  listPrompts: () => request<{ prompts: PromptDef[] }>("/api/prompts"),
  getPrompt: (name: string, arguments_: Record<string, unknown> = {}) =>
    request<PromptRender>(`/api/prompts/${encodeURIComponent(name)}/get`, {
      method: "POST",
      body: JSON.stringify({ arguments: arguments_ }),
    }),

  listFiles: (path = ".") =>
    request<{ path: string; items: FileEntry[]; workspace: string }>(
      `/api/files?path=${encodeURIComponent(path)}`
    ),
  readFile: (path: string) =>
    request<FileContent>(`/api/files/content?path=${encodeURIComponent(path)}`),
  writeFile: (path: string, content: string) =>
    request<{ path: string; size: number; status: string }>("/api/files/content", {
      method: "PUT",
      body: JSON.stringify({ path, content }),
    }),
  deleteFile: (path: string) =>
    request<{ path: string; status: string }>(
      `/api/files?path=${encodeURIComponent(path)}`,
      { method: "DELETE" }
    ),
  uploadFile: async (path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/files/upload?path=${encodeURIComponent(path)}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  chat: (message: string, history: ChatMessage[] = []) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};
