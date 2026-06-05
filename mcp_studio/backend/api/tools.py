"""Tools API - list and call MCP tools."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from mcp_studio.backend.api.deps import RuntimeDep

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("")
async def list_tools(runtime: RuntimeDep) -> dict:
    tools = await runtime.list_tools()
    return {"tools": tools}


@router.post("/{name}/call")
async def call_tool(name: str, payload: dict[str, Any] | None = None, runtime: RuntimeDep = None) -> dict:
    payload = payload or {}
    arguments = payload.get("arguments") if "arguments" in payload else payload
    if not isinstance(arguments, dict):
        raise HTTPException(status_code=400, detail="arguments must be a JSON object")
    result = await runtime.call_tool(name, arguments)
    return {"name": name, "result": result}
