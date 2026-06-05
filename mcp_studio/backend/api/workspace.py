"""Workspace API - browse, read, write, and upload files in the sandboxed workspace."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from mcp_studio.backend.config import WORKSPACE_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])


class WriteRequest(BaseModel):
    path: str
    content: str


def _resolve(rel_path: str) -> Path:
    """Resolve a relative path inside the workspace, refusing escapes."""
    rel = rel_path or "."
    # Normalize and reject absolute paths and drive letters.
    candidate = (WORKSPACE_DIR / rel).resolve()
    try:
        candidate.relative_to(WORKSPACE_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Access denied - path outside workspace") from exc
    return candidate


@router.get("")
async def list_path(path: str = ".") -> dict:
    base = _resolve(path)
    if not base.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path}")
    if not base.is_dir():
        raise HTTPException(status_code=400, detail=f"Not a directory: {path}")

    items: list[dict[str, Any]] = []
    for entry in sorted(base.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        st = entry.stat()
        items.append(
            {
                "name": entry.name,
                "path": str(entry.relative_to(WORKSPACE_DIR)).replace("\\", "/"),
                "type": "directory" if entry.is_dir() else "file",
                "size": st.st_size if entry.is_file() else 0,
                "modified": st.st_mtime,
            }
        )
    return {"path": path, "items": items, "workspace": str(WORKSPACE_DIR)}


@router.get("/content")
async def read_content(path: str) -> dict:
    target = _resolve(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path}")
    if not target.is_file():
        raise HTTPException(status_code=400, detail=f"Not a file: {path}")
    try:
        content = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = target.read_text(encoding="latin-1")
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {
        "path": path,
        "content": content,
        "size": target.stat().st_size,
        "language": _guess_language(target.name),
    }


@router.put("/content")
async def write_content(req: WriteRequest) -> dict:
    target = _resolve(req.path)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(req.content, encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"path": req.path, "size": len(req.content), "status": "ok"}


@router.post("/upload")
async def upload(path: str = ".", file: UploadFile = File(...)) -> dict:
    base = _resolve(path)
    if not base.exists() or not base.is_dir():
        raise HTTPException(status_code=400, detail=f"Target directory not found: {path}")

    safe_name = Path(file.filename or "upload").name
    target = _resolve(str(Path(path) / safe_name))

    data = await file.read()
    try:
        target.write_bytes(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {
        "path": str(target.relative_to(WORKSPACE_DIR)).replace("\\", "/"),
        "size": len(data),
        "status": "ok",
    }


@router.delete("")
async def delete_path(path: str) -> dict:
    target = _resolve(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path}")
    try:
        if target.is_dir():
            import shutil

            shutil.rmtree(target)
        else:
            target.unlink()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"path": path, "status": "deleted"}


@router.post("/mkdir")
async def mkdir(path: str) -> dict:
    target = _resolve(path)
    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"path": path, "status": "ok"}


def _guess_language(name: str) -> str:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return {
        "py": "python",
        "js": "javascript",
        "ts": "typescript",
        "tsx": "tsx",
        "jsx": "jsx",
        "json": "json",
        "md": "markdown",
        "html": "html",
        "css": "css",
        "yml": "yaml",
        "yaml": "yaml",
        "toml": "toml",
        "sh": "bash",
        "rs": "rust",
        "go": "go",
        "java": "java",
        "c": "c",
        "cpp": "cpp",
        "h": "cpp",
        "sql": "sql",
    }.get(ext, "text")
