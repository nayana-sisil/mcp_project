"""Lightweight in-process facade for the FastMCP server.

The REST API uses this object to list tools/resources/prompts and to
call them directly. We bypass the HTTP transport because everything
runs in the same process - this is faster and avoids ASGI mount path
quirks. External MCP clients can still connect via ``/mcp``.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from mcp_studio.backend.mcp import tools as _tool_defs
from mcp_studio.backend.mcp.server import mcp

logger = logging.getLogger(__name__)


class MCPRuntime:
    """Async facade over the FastMCP server's in-process API."""

    def __init__(self) -> None:
        self._mcp = mcp

    async def list_tools(self) -> list[dict[str, Any]]:
        # The static definitions double as the canonical schemas used by
        # the UI even before the FastMCP tool manager has finished
        # initialising. We prefer the static ones for stability.
        return list(_tool_defs.TOOL_DEFINITIONS)

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> str:
        fn = getattr(_tool_defs, name, None)
        if fn is None:
            return f"Error: Unknown tool: {name}"
        if not asyncio.iscoroutinefunction(fn):
            try:
                return str(fn(**(arguments or {})))
            except TypeError as exc:
                return f"Error: {exc}"
            except Exception as exc:  # noqa: BLE001
                return f"Error: {exc}"
        try:
            return str(await fn(**(arguments or {})))
        except Exception as exc:  # noqa: BLE001
            return f"Error: {exc}"

    async def list_resources(self) -> list[dict[str, Any]]:
        return [
            {
                "name": r["name"],
                "uriTemplate": r["uriTemplate"],
                "description": r["description"],
                "arguments": r.get("arguments", []),
            }
            for r in _tool_defs.RESOURCE_DEFINITIONS
        ]

    async def read_resource(self, uri: str) -> str:
        # file://workspace/{filename}
        prefix = "file://workspace/"
        if not uri.startswith(prefix):
            return f"Error: Unsupported resource URI: {uri}"
        filename = uri[len(prefix):]
        return _tool_defs.read_workspace_file(filename)

    async def list_prompts(self) -> list[dict[str, Any]]:
        return [
            {
                "name": p["name"],
                "description": p["description"],
                "arguments": p.get("arguments", []),
            }
            for p in _tool_defs.PROMPT_DEFINITIONS
        ]

    async def get_prompt(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        fn_name = {
            "review_code": "review_code_prompt",
            "analyze_security": "analyze_security_prompt",
        }.get(name)
        if not fn_name:
            return {"description": "", "messages": [{"role": "user", "content": f"Unknown prompt: {name}"}]}
        fn = getattr(_tool_defs, fn_name)
        try:
            text = fn(**(arguments or {}))
        except TypeError as exc:
            text = f"Error: {exc}"
        return {
            "description": f"Rendered prompt template for {name}",
            "messages": [{"role": "user", "content": text}],
        }


_runtime: MCPRuntime | None = None


def get_runtime() -> MCPRuntime:
    global _runtime
    if _runtime is None:
        _runtime = MCPRuntime()
    return _runtime
