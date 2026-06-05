"""MCP subpackage - server, runtime facade, and tool implementations."""

from mcp_studio.backend.mcp.runtime import MCPRuntime, get_runtime
from mcp_studio.backend.mcp.server import mcp

__all__ = ["mcp", "MCPRuntime", "get_runtime"]
