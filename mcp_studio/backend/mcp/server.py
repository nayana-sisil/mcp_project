"""MCP server module - registers tools/resources/prompts on a FastMCP instance."""

from __future__ import annotations

import logging
import warnings

from fastmcp import FastMCP

from mcp_studio.backend.mcp import tools as _tools

warnings.filterwarnings("ignore", category=DeprecationWarning)
logging.getLogger("fastmcp").setLevel(logging.WARNING)

mcp = FastMCP("MCP Studio")


@mcp.tool()
def read_file(filepath: str) -> str:
    """Read a file from the workspace directory."""
    return _tools.read_file(filepath)


@mcp.tool()
def write_file(filepath: str, content: str) -> str:
    """Write content to a file in the workspace directory."""
    return _tools.write_file(filepath, content)


@mcp.tool()
def list_files(directory: str = ".") -> str:
    """List files in a directory within the workspace."""
    return _tools.list_files(directory)


@mcp.tool()
def analyze_code(code: str, focus: str = "quality") -> str:
    """Request an LLM-based code analysis through MCP sampling."""
    return _tools.analyze_code(code, focus)


@mcp.resource("file://workspace/{filename}")
def get_workspace_file(filename: str) -> str:
    """Read a workspace file as a resource."""
    return _tools.read_workspace_file(filename)


@mcp.prompt()
def review_code(filename: str) -> str:
    """Generate a code-review prompt template for a file."""
    return _tools.review_code_prompt(filename)


@mcp.prompt()
def analyze_security(filename: str) -> str:
    """Generate a security-analysis prompt template for a file."""
    return _tools.analyze_security_prompt(filename)
