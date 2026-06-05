"""Workspace file operations - the underlying tool implementations.

These functions are the source of truth for what the server can do. They
are wrapped as FastMCP tools in :mod:`mcp_studio.backend.mcp.server` and
also called directly by the REST API.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from mcp_studio.backend.config import WORKSPACE_DIR


def is_within_workspace(path: Path) -> bool:
    """Return True if ``path`` is inside the workspace root."""
    try:
        path.resolve().relative_to(WORKSPACE_DIR.resolve())
        return True
    except ValueError:
        return False


def resolve_path(rel_path: str) -> Path:
    """Resolve a workspace-relative path, raising ValueError on escape."""
    candidate = (WORKSPACE_DIR / (rel_path or ".")).resolve()
    try:
        candidate.relative_to(WORKSPACE_DIR.resolve())
    except ValueError as exc:
        raise ValueError("Access denied - path outside workspace") from exc
    return candidate


def read_file(filepath: str) -> str:
    """Read a file from the workspace directory."""
    path = resolve_path(filepath)
    if not is_within_workspace(path):
        return "Error: Access denied - path outside workspace"
    if not path.exists():
        return f"Error: File not found: {filepath}"
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="latin-1")
        except Exception as exc:  # noqa: BLE001
            return f"Error reading file: {exc}"
    except Exception as exc:  # noqa: BLE001
        return f"Error reading file: {exc}"


def write_file(filepath: str, content: str) -> str:
    """Write content to a file in the workspace directory."""
    path = resolve_path(filepath)
    if not is_within_workspace(path):
        return "Error: Access denied - path outside workspace"
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"Successfully wrote {len(content)} characters to {filepath}"
    except Exception as exc:  # noqa: BLE001
        return f"Error writing file: {exc}"


def list_files(directory: str = ".") -> str:
    """List files in a directory within the workspace."""
    path = resolve_path(directory)
    if not is_within_workspace(path):
        return "Error: Access denied - path outside workspace"
    if not path.exists():
        return f"Error: Directory not found: {directory}"
    if not path.is_dir():
        return f"Error: Not a directory: {directory}"

    try:
        items: list[str] = []
        for item in sorted(path.iterdir()):
            relative_path = item.relative_to(WORKSPACE_DIR)
            file_type = "DIR" if item.is_dir() else "FILE"
            size = item.stat().st_size if item.is_file() else 0
            items.append(f"{file_type}: {relative_path} ({size} bytes)")
        return "\n".join(items) if items else "Directory is empty"
    except Exception as exc:  # noqa: BLE001
        return f"Error listing directory: {exc}"


def analyze_code(code: str, focus: str = "quality") -> str:
    """Trigger an LLM-based code analysis via MCP sampling.

    The current transport does not implement bidirectional sampling, so
    we return a marker that explains the flow.
    """
    snippet = code[:50].replace("\n", " ")
    return (
        "[SAMPLING TRIGGER]\n"
        "This tool would send a sampling/createMessage request to the client:\n\n"
        "{\n"
        "  'method': 'sampling/createMessage',\n"
        "  'params': {\n"
        "    'messages': [{'role': 'user', 'content': {\n"
        "      'type': 'text',\n"
        f"      'text': 'Analyze this code for {focus}:\\n{snippet}...'\n"
        "    }}],\n"
        "    'maxTokens': 500\n"
        "  }\n"
        "}\n\n"
        "The client would surface an approval dialog, call an LLM, and\n"
        "return the response so the server can finish the analysis."
    )


def read_workspace_file(filename: str) -> str:
    """Read a workspace file as an MCP resource."""
    return read_file(filename)


def review_code_prompt(filename: str) -> str:
    """Render a code-review prompt template."""
    return (
        f"Please review the code in file '{filename}' and provide:\n\n"
        "1. A summary of what the code does\n"
        "2. Potential bugs or issues\n"
        "3. Security concerns\n"
        "4. Suggestions for improvements\n"
        "5. Code quality assessment\n\n"
        "Focus on readability, maintainability, and best practices."
    )


def analyze_security_prompt(filename: str) -> str:
    """Render a security-analysis prompt template."""
    return (
        f"Perform a security analysis of '{filename}' focusing on:\n\n"
        "1. Input validation and sanitization\n"
        "2. Authentication and authorization checks\n"
        "3. Potential injection vulnerabilities\n"
        "4. Data exposure risks\n"
        "5. Error handling security\n\n"
        "Provide specific line numbers and remediation suggestions."
    )


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "read_file",
        "description": "Read a file from the workspace directory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "filepath": {"type": "string", "description": "Path relative to the workspace root."},
            },
            "required": ["filepath"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file in the workspace directory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "filepath": {"type": "string", "description": "Path relative to the workspace root."},
                "content": {"type": "string", "description": "File content to write."},
            },
            "required": ["filepath", "content"],
        },
    },
    {
        "name": "list_files",
        "description": "List files in a directory within the workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "Directory path relative to the workspace root (default '.').",
                },
            },
        },
    },
    {
        "name": "analyze_code",
        "description": "Request an LLM-based code analysis through MCP sampling.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Source code to analyze."},
                "focus": {
                    "type": "string",
                    "enum": ["quality", "security", "performance", "style"],
                    "description": "Aspect of the code to focus on.",
                },
            },
            "required": ["code"],
        },
    },
]

RESOURCE_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "workspace_file",
        "uriTemplate": "file://workspace/{filename}",
        "description": "Read a file from the workspace as an MCP resource.",
        "arguments": [
            {"name": "filename", "description": "File path relative to the workspace root.", "required": True},
        ],
    },
]

PROMPT_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "review_code",
        "description": "Generate a code-review prompt template for a file.",
        "arguments": [
            {"name": "filename", "description": "File to review.", "required": True},
        ],
    },
    {
        "name": "analyze_security",
        "description": "Generate a security-analysis prompt template for a file.",
        "arguments": [
            {"name": "filename", "description": "File to analyze.", "required": True},
        ],
    },
]
