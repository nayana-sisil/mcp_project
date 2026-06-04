# MCP Advanced Lab

A hands on educational project demonstrating the **Model Context Protocol (MCP)** over HTTP transport. This project implements a full MCP stack: an HTTP server exposing tools, resources, and prompts, a protocol level client, and two Gradio-based GUI applications.

## Architecture

```
mcp_advanced_lab/
├── mcp_http_server.py        # MCP HTTP server (FastMCP + Uvicorn)
├── mcp_http_client_base.py   # Base async MCP client (Streamable HTTP)
├── mcp_http_client_app.py    # Gradio GUI for browsing MCP capabilities
├── mcp_http_host_app.py      # Gradio AI Host with local FLAN-T5-small
└── workspace/                # Sandboxed file directory for the server
```

The project consists of four layers:

1. **Server** -- exposes file-system tools, resources, and prompts over HTTP via FastMCP.
2. **Base Client** -- a reusable async client using the Streamable HTTP transport.
3. **Client App** -- a Gradio UI for manually exploring the server's tools, resources, and prompts.
4. **AI Host App** -- a Gradio chatbot powered by `google/flan-t5-small` that can invoke MCP tools.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (package manager)

## Setup

```bash
# Install dependencies
uv sync

# Activate the virtual environment
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # macOS/Linux
```

## Usage

### 1. Start the MCP HTTP Server

```bash
python mcp_advanced_lab/mcp_http_server.py
```

The server starts on `http://127.0.0.1:8000/mcp`.

### 2. Launch the Client App (browser-based MCP explorer)

```bash
python mcp_advanced_lab/mcp_http_client_app.py http://127.0.0.1:8000 mcp_advanced_lab/workspace
```

Opens a Gradio UI at `http://127.0.0.1:7861` with tabs for tools, resources, and prompts.

### 3. Launch the AI Host App (chatbot with local LLM)

```bash
python mcp_advanced_lab/mcp_http_host_app.py http://127.0.0.1:8000 mcp_advanced_lab/workspace
```

Opens a chatbot UI at `http://127.0.0.1:7862` powered by FLAN-T5-small.

## Server Capabilities

### Tools

| Tool | Description |
|---|---|
| `read_file` | Read a file from the workspace directory |
| `write_file` | Write content to a file in the workspace |
| `list_files` | List files in a workspace subdirectory |
| `analyze_code` | Request LLM-based code analysis (demonstrates MCP sampling) |

### Resources

- `file://workspace/{filename}` -- exposes workspace files as MCP resources

### Prompts

| Prompt | Description |
|---|---|
| `review_code` | Generates a code review prompt template for a given file |
| `analyze_security` | Generates a security analysis prompt template for a given file |

## Project Structure

| File | Purpose |
|---|---|
| `pyproject.toml` | Project metadata and Python dependencies |
| `main.py` | Placeholder entry point |
| `mcp_advanced_lab/mcp_http_server.py` | FastMCP server with file tools, resources, and prompts |
| `mcp_advanced_lab/mcp_http_client_base.py` | Reusable async MCP HTTP client |
| `mcp_advanced_lab/mcp_http_client_app.py` | Gradio UI for browsing server capabilities |
| `mcp_advanced_lab/mcp_http_host_app.py` | Gradio chatbot with local FLAN-T5-small and MCP tool integration |
| `mcp_advanced_lab/workspace/` | Sandboxed directory for server file operations |

## Dependencies

- `fastmcp` -- MCP server framework
- `mcp` -- MCP client SDK
- `gradio` -- Web UI framework
- `httpx` -- HTTP client
- `uvicorn` -- ASGI server
- `transformers` + `torch` -- Local LLM (FLAN-T5-small)
