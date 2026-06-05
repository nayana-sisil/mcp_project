---
title: MCP Studio
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: true
license: mit
---

# MCP Studio

A unified workspace for the Model Context Protocol. MCP Studio is a single
self hosted web application that bundles a real MCP server, a sandboxed file
workspace, a tool explorer, a prompt library, and a chat interface backed by
a local language model that can call your tools. It runs as a single
container, ships as a single URL, and exposes a standard MCP streamable HTTP
endpoint so any external MCP client can connect to it as well.

The project is the natural next step for anyone who has experimented with
the Model Context Protocol locally and wants a clean, shareable, end to end
demo that other people can actually open in a browser and try.

## What is the Model Context Protocol

The Model Context Protocol, or MCP, is an open standard that lets a language
model call external tools and read external resources in a structured,
predictable way. An MCP server exposes a set of tools, resources, and
prompts. An MCP client (a desktop app, an IDE plugin, or a chat product)
connects to that server, asks what is available, and invokes whatever the
user needs.

MCP Studio is a working MCP server wrapped in a friendly web UI. It is
useful for three audiences.

* **For learners** it is a small, self contained codebase that shows the
  whole MCP stack in one place. You can read every file, run every
  example, and watch the protocol happen live in the UI.
* **For builders** it is a starter template. Swap the bundled file tools
  for your own domain tools, keep the UI, and you have a polished
  product front end for your MCP server in an afternoon.
* **For presenters** it is a one URL demo. Push it to a Hugging Face
  Space, share the link, and anyone can click around the tools,
  edit files, and chat with the model without installing anything.

## What you can do with it

Open the running app and you land on a dashboard with a live snapshot of
the server, the model, and the workspace. From there the sidebar takes
you to six fully functional pages.

**Dashboard** shows the live status of the server, the model, and the
workspace. It lists how many tools, resources, and prompts the studio
exposes and surfaces the most recent files.

**Files** is a tree browser for the sandboxed workspace. You can create
folders, upload files, open any file in a syntax highlighted viewer, and
edit it in a full Monaco editor with a Save button that writes back to
the server.

**Tools** lists every MCP tool the server exposes, with a description
and the number of arguments for each. Click Run and the app generates a
form automatically from the tool's JSON schema, including dropdowns for
enumerations and type aware number and boolean inputs. The result is
rendered in a code block right inside the dialog.

**Resources** lists every MCP resource template. Fill in the template
arguments and the studio makes a real MCP read resource call and
displays the content.

**Prompts** lists every MCP prompt template. Fill in the arguments,
click Render, and the studio returns the prompt as a list of messages
ready to paste into a chat. There is a Copy button for the rendered
output.

**Chat** is a chat interface backed by a local language model. You can
ask the model to read a file, list the workspace, or do anything else
the MCP tools support. The studio uses a small in process tool router
to decide which tool to call, executes it through the in process MCP
runtime, and feeds the result back to the model for a final answer.
Every assistant turn has an expandable trace that shows the tool
name, the arguments, and the raw result.

On top of all that, the studio still behaves like a regular MCP server.
Any MCP client you already use, including Claude Desktop and the MCP
Inspector, can connect to the studio's streamable HTTP endpoint and
drive the same tools over the standard protocol.

## Architecture

MCP Studio is one Python process that serves three things on the same
port, plus a static front end build served from disk.

```
Browser
   |
   v
FastAPI on port 7860
   |
   +-- /             static Next.js build (Dashboard, Files, Tools,
   |                 Resources, Prompts, Chat)
   |
   +-- /api/*        REST API used by the front end
   |     /api/health, /api/overview,
   |     /api/tools, /api/tools/{name}/call,
   |     /api/resources, /api/resources/read,
   |     /api/prompts, /api/prompts/{name}/get,
   |     /api/files (GET list, GET content, PUT content,
   |                POST upload, POST mkdir, DELETE),
   |     /api/chat
   |
   +-- /mcp/mcp      FastMCP streamable HTTP endpoint
   |                 (any external MCP client connects here)
   |
   +-- in process
         FastMCP instance: tool, resource, and prompt registry
         LLM service: FLAN-T5 small, loaded in a background thread
         Tool router: tiny LLM driven dispatcher that calls MCP tools
         MCPRuntime: in process facade for the REST handlers
         Workspace: /data/workspace on Hugging Face, or the bundled
                    samples on a developer machine
```

Why this shape. Mounting the FastMCP streamable HTTP app at `/mcp` keeps
the public MCP URL at `/mcp/mcp`, which is what the rest of the stack
assumes. The REST API is a thin convenience layer on top of the same
in process runtime, so the front end never has to speak the MCP
protocol directly. The model and the tool router live in the same
process, which keeps the round trip for a chat turn to a single
function call.

## Quick start (local development)

You will need Python 3.12 or newer, [uv](https://docs.astral.sh/uv/) for
the Python side, and Node.js 20 or newer for the front end.

Clone, install Python dependencies, and start the backend:

```bash
git clone https://github.com/nayana-sisil/mcp_project.git
cd mcp_project
uv sync
uv run python main.py
```

The backend listens on `http://127.0.0.1:7860`. The first time it boots
it will download the FLAN-T5 small weights to a local cache, which
takes a minute. While the model is loading the chat endpoint returns
HTTP 503 with a `model_loading` error code, and the UI shows a
"Loading model" badge.

In a second terminal, install the front end dependencies and start
the dev server:

```bash
cd mcp_studio/frontend
npm install
npm run dev
```

The dev server listens on `http://localhost:3000` and proxies API
calls to the backend on port 7860. Open the URL in a browser and you
have the full studio.

To produce the static export that the production backend serves, run
the front end build instead:

```bash
cd mcp_studio/frontend
npm run build
```

The build writes to `mcp_studio/frontend/out`. Restart the backend and
it will pick up the export automatically.

## Deploying to a Hugging Face Space

The repo includes a multi stage Dockerfile that builds the front end
with Node 20, then runs the backend with Python 3.12. The image is
about 1.5 GB, mostly because of PyTorch and Transformers.

1. Create a new Space at huggingface.co (Docker SDK, CPU basic
   hardware is enough).
2. Add the Space as a remote and push:

   ```bash
   git remote add space https://huggingface.co/spaces/<you>/mcp-studio
   git push space main
   ```

3. HF builds the image. First build takes 5 to 10 minutes because the
   FLAN-T5 weights are downloaded as part of the build. After that,
   cold starts are around 30 seconds while the model is reloaded into
   memory.

The Space's persistent volume is mounted at `/data`. The studio seeds
`/data/workspace` with sample files on the first boot, and any file
the user creates through the UI is written to the same volume, so
nothing is lost on restart.

## Connecting an external MCP client

The studio's streamable HTTP endpoint is mounted at `/mcp/mcp`. From
anywhere on the public internet that becomes
`https://<space-name>.hf.space/mcp/mcp`.

Here is a minimal Python client using the official MCP SDK:

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


async def main():
    async with streamablehttp_client(
        "https://<space-name>.hf.space/mcp/mcp"
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            for tool in tools.tools:
                print(f"- {tool.name}: {tool.description}")

            result = await session.call_tool("list_files", {"directory": "."})
            for chunk in result.content:
                if hasattr(chunk, "text"):
                    print(chunk.text)


asyncio.run(main())
```

The MCP Inspector works the same way. Set the transport to Streamable
HTTP and the URL to the `/mcp/mcp` endpoint.

## API reference

All paths are relative to the studio root. JSON in, JSON out. Errors
come back as `{"detail": "..."}` with the appropriate HTTP status.

### Health and overview

* `GET /api/health` returns workspace path, model name, model ready
  flag, and any model load error.
* `GET /api/overview` returns counts, the full list of tools,
  resources, and prompts, the model state, and the workspace path.
  This is what the Dashboard page polls.

### Tools

* `GET /api/tools` returns the tool list with JSON schemas.
* `POST /api/tools/{name}/call` with body `{"arguments": {...}}`
  invokes a tool and returns `{"name": "...", "result": "..."}`.

### Resources

* `GET /api/resources` returns the resource templates.
* `POST /api/resources/read` with body `{"uri": "file://workspace/x"}`
  reads a resource by URI.

### Prompts

* `GET /api/prompts` returns the prompt templates.
* `POST /api/prompts/{name}/get` with body `{"arguments": {...}}`
  renders a prompt and returns the message list.

### Files

* `GET /api/files?path=.` lists a directory.
* `GET /api/files/content?path=README.md` returns the file content
  and a best guess at the language for syntax highlighting.
* `PUT /api/files/content` with body `{"path": "...", "content": "..."}`
  writes a file.
* `POST /api/files/upload?path=.` with multipart form data uploads a
  file into a directory.
* `POST /api/files/mkdir?path=foo/bar` creates a directory.
* `DELETE /api/files?path=foo` deletes a file or directory.

All file paths are validated to stay inside the workspace root. Any
attempt to escape with `..` or absolute paths returns HTTP 403.

### Chat

* `POST /api/chat` with body `{"message": "...", "history": [...]}`
  sends a message to the model. The model may decide to call tools in
  the process. The response is `{"answer": "...", "trace": [...]}` where
  `trace` lists every tool call the router made, with its name,
  arguments, and raw result.

While the model is still loading, the endpoint returns HTTP 503 with
`{"detail": {"code": "model_loading", "message": "..."}}`. The UI
surfaces this as a toast and the user can retry.

## Configuration

All settings are environment variables. Defaults are tuned for local
development.

* `PORT` (default `7860`) port the FastAPI server binds to. Hugging
  Face sets this for you on a Space.
* `HOST` (default `0.0.0.0`) interface the server binds to.
* `WORKSPACE_DIR` (default `/data/workspace` on Hugging Face, otherwise
  the bundled `mcp_studio/backend/workspace`) the directory the
  server reads and writes from. The startup logic prefers `/data` if
  it exists and is writable, which gives you a persistent workspace on
  a Space without any extra setup.
* `MODEL_NAME` (default `google/flan-t5-small`) the Hugging Face
  model used by the chat endpoint. Anything that fits the seq2seq
  API should work; if you swap in a larger model, the in memory load
  time goes up.
* `HF_HOME` (default `/data/.cache/huggingface` on Hugging Face,
  otherwise the user's default cache) the directory Transformers
  caches model weights in. Pointing this at `/data` on a Space means
  the model only needs to be downloaded once.

## Project structure

```
mcp_project/
  Dockerfile                 multi stage build (Node 20 + Python 3.12)
  .dockerignore              files to exclude from the image
  pyproject.toml             Python dependencies
  uv.lock                    locked Python dependency tree
  main.py                    entry point, runs uvicorn
  README.md                  this file
  mcp_studio/
    backend/
      app.py                 FastAPI factory, mounts MCP and static
      config.py              environment driven settings
      api/                   REST routers
        health.py            /api/health and /api/overview
        tools.py             /api/tools
        resources.py         /api/resources
        prompts.py           /api/prompts
        workspace.py         /api/files
        chat.py              /api/chat
        deps.py              shared FastAPI dependencies
      mcp/
        server.py            FastMCP instance and tool/resource/prompt
                             registrations
        tools.py             the underlying tool implementations
        runtime.py           in process facade used by the REST API
      services/
        llm.py               LLM service (FLAN-T5 small, background load)
        tool_router.py       LLM to tool dispatcher
      workspace/             sample files seeded on first boot
    frontend/
      app/                   Next.js App Router pages
        layout.tsx           sidebar + topbar shell
        page.tsx             Dashboard
        files/page.tsx       Files browser
        tools/page.tsx       Tools grid
        resources/page.tsx   Resources list
        prompts/page.tsx     Prompts list
        chat/page.tsx        Chat
        globals.css          Tailwind base + design tokens
      components/
        shell/               sidebar, topbar, mobile sheet
        ui/                  button, card, dialog, input, badge, etc.
        files/               code viewer
        providers/           context providers (overview, toasts)
      lib/
        api.ts               typed fetch client
        types.ts             shared types
        utils.ts             helpers (cn, formatters)
      next.config.mjs        output: 'export' for static build
      tailwind.config.ts     Tailwind theme + design tokens
      package.json           front end dependencies
```

## How the chat tool calling works

The chat endpoint is the most interesting part of the stack. FLAN-T5
small is a 60 million parameter encoder decoder model that cannot do
reliable native function calling, so the studio uses a tiny in process
router.

1. The router builds a prompt that lists every available tool with
   its name, a one line description, and a type summary of its
   arguments. It then appends the recent conversation and the user's
   message.
2. The model is asked to reply with a single line of JSON, either
   `{"tool": "<name>", "args": {...}}` to call a tool, or
   `{"tool": "answer", "args": {"text": "..."}}` to answer directly.
3. If the model asked to call a tool, the router invokes it through
   the in process MCP runtime, appends the result to the prompt, and
   asks the model for a final answer.
4. The loop is capped at three iterations so a confused model cannot
   run away.

The router is intentionally simple. It trades elegance for
predictability, which is the right trade for a small model.

## Tech stack

* **Backend** FastAPI, FastMCP, Transformers, Uvicorn, Pydantic
* **Frontend** Next.js 14 (App Router, static export), TypeScript,
  Tailwind CSS, Radix UI primitives, shadcn style components, Monaco
  editor, react syntax highlighter, framer motion, lucide react,
  next themes, sonner
* **Deployment** multi stage Docker (Node 20 build, Python 3.12
  runtime), Hugging Face Spaces Docker SDK

## Limitations

* The bundled model is FLAN-T5 small, which is fast and small but
  has limited reasoning ability. It is enough to demonstrate the
  flow, not enough to be useful as a daily driver. To upgrade, set
  `MODEL_NAME` to a larger model and give the Space more memory.
* The router loop is bounded at three tool calls, and FLAN-T5 small
  is not always able to emit valid JSON. In those cases the model
  text is returned as the answer.
* The workspace is shared with every visitor of the public Space.
  Treat it as a sandbox. There is no per user isolation.
* The bundled tool set is intentionally small (read file, write file,
  list files, analyze code, plus two prompt templates and one
  resource template). The interesting work is in the rest of the
  stack, which you can extend without touching the UI.

## Roadmap

* Per user workspaces and authentication
* Tool level rate limiting and audit log
* Support for MCP sampling so servers can request completions from
  the studio's model
* Pluggable model backend (Hugging Face Inference API, llama.cpp,
  vLLM)
* Command palette for keyboard first navigation

## Contributing

Bug reports and pull requests are welcome on the GitHub repository.
Please run the linters and the local smoke tests before opening a
pull request.

## License

MIT. See the LICENSE file in the repository root, or read the SPDX
header in `pyproject.toml`.
