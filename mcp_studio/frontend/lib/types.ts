export type ToolSchema = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
};

export type ResourceDef = {
  name: string;
  uriTemplate: string;
  description: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
};

export type PromptDef = {
  name: string;
  description: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
};

export type FileEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
};

export type FileContent = {
  path: string;
  content: string;
  size: number;
  language: string;
};

export type OverviewResponse = {
  counts: { tools: number; resources: number; prompts: number };
  tools: ToolSchema[];
  resources: ResourceDef[];
  prompts: PromptDef[];
  model: { name: string; ready: boolean; loading: boolean; error: string | null };
  workspace: string;
  mcp_error: string | null;
};

export type HealthResponse = {
  status: string;
  workspace: string;
  model: string;
  model_ready: boolean;
  model_loading: boolean;
  model_error: string | null;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ToolTrace = {
  tool: string;
  args: Record<string, unknown>;
  result: string;
};

export type ChatResponse = {
  answer: string;
  trace: ToolTrace[];
};

export type PromptRender = {
  description: string;
  messages: { role: string; content: string }[];
};
