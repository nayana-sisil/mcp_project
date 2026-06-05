"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from mcp_studio.backend.mcp.runtime import MCPRuntime


def get_runtime_dep() -> MCPRuntime:
    from mcp_studio.backend.mcp.runtime import get_runtime

    return get_runtime()


RuntimeDep = Annotated[MCPRuntime, Depends(get_runtime_dep)]
