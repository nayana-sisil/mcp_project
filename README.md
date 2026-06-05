---
title: MCP Studio
emoji: "\U0001F9E9"
colorFrom: violet
colorTo: indigo
sdk: docker
app_port: 7860
pinned: true
license: mit
---

# MCP Studio

A unified **Model Context Protocol** server, workspace browser, and AI host - all
in one app, deployable to Hugging Face Spaces.

Browse MCP capabilities, edit files in a sandboxed workspace, and chat with a
local model that can call your tools - all from a single URL. The same server
also exposes a standard MCP streamable HTTP endpoint, so any MCP client (Claude
Desktop, MCP Inspector, …) can connect to it.

## Live demo

Once the Space is up, the URL is:

```
https://huggingface.co/spaces/<your-username>/mcp-studio
```

The public MCP endpoint for external clients is:

```
https://<your-username>-mcp-studio.hf.space/mcp/mcp
```

## Features

| Page | What it does |
|---|---|
| **Dashboard** | Live server, model, and workspace status. |
| **Files** | Tree browser, syntax-highlighted viewer, Monaco editor with Save. |
| **Tools** | Card grid + auto-generated form dialog for any registered MCP tool. |
| **Resources** | Read MCP resources with template arguments. |
| **Prompts** | Render MCP prompt templates to messages. |
| **Chat** | Chat with the local FLAN-T5 model. Expand any assistant turn to see the tool calls and results. |

The workspace lives in the Hugging Face Space's persistent volume at `/data/workspace`
and survives restarts.

## Connecting with an MCP client

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


async def main():
    async with streamablehttp_client(
        "https://<your-username>-mcp-studio.hf.space/mcp/mcp"
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            for t in tools.tools:
                print(f"- {t.name}: {t.description}")

            result = await session.call_tool("list_files", {"directory": "."})
            print(result.content[0].text)


asyncio.run(main())
```

## Architecture

```
Browser  ->  FastAPI (uvicorn, port 7860)
                  |
                  +-- /          ->  static Next.js build
                  +-- /api/*     ->  REST (health, overview, tools,
                  |                       resources, prompts, files, chat)
                  +-- /mcp/mcp   ->  FastMCP streamable HTTP (in-process)
                  +-- in-process services:
                  |       - LLM service (FLAN-T5-small, background load)
                  |       - Tool router (LLM -> MCP tool dispatcher)
                  +-- /data/workspace (HF Space persistent volume)
```

## Development

```bash
# Backend
uv sync
uv run python main.py                # http://localhost:7860

# Frontend (separate terminal, requires Node 20+)
cd mcp_studio/frontend
npm install
npm run dev                          # http://localhost:3000

# Build the static export - the backend will serve it from out/ on restart
npm run build
```

## Deploying to a Hugging Face Space

1. Create a new Space on huggingface.co → **New Space** → **Docker** → name it
   `mcp-studio` (or whatever you like). Pick the **CPU basic** hardware.
2. From your local checkout, push the project:

   ```bash
   git remote add space https://huggingface.co/spaces/<your-username>/mcp-studio
   git push space main
   ```

   The Docker build (multi-stage: Node 20 builds the frontend, Python 3.12
   runs the backend) will start automatically. The first build downloads
   the FLAN-T5-small weights (~250 MB) and takes a few minutes. Subsequent
   builds use the cached `/data/.cache/huggingface` from the Space.
3. After the Space shows **Running**, open it. The first chat reply may take
   a few extra seconds while the model finishes loading.

The persistent volume (`/data`) is created automatically. The bundled sample
files in `mcp_studio/backend/workspace/` are seeded into it on first boot.

## Tech stack

- **Backend** - FastAPI, FastMCP, transformers (FLAN-T5-small), uvicorn
- **Frontend** - Next.js 14 (App Router, static export), TypeScript, TailwindCSS,
  shadcn-style UI primitives (Radix UI under the hood), Monaco editor,
  react-syntax-highlighter, framer-motion, lucide-react, next-themes
- **Deployment** - Multi-stage Dockerfile (Node 20 build, Python 3.12 runtime),
  Hugging Face Spaces Docker SDK

## License

MIT
