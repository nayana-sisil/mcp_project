"""Health, status, and model readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from mcp_studio.backend.api.deps import RuntimeDep
from mcp_studio.backend.config import MODEL_NAME, WORKSPACE_DIR
from mcp_studio.backend.services.llm import llm_service

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "workspace": str(WORKSPACE_DIR),
        "model": MODEL_NAME,
        "model_ready": llm_service.ready,
        "model_loading": not llm_service.ready and llm_service.error is None,
        "model_error": str(llm_service.error) if llm_service.error else None,
    }


@router.get("/overview")
async def overview(runtime: RuntimeDep) -> dict:
    """Counts + status used by the dashboard."""
    tools: list = []
    resources: list = []
    prompts: list = []
    error: str | None = None
    try:
        tools = await runtime.list_tools()
        resources = await runtime.list_resources()
        prompts = await runtime.list_prompts()
    except Exception as exc:  # noqa: BLE001
        error = str(exc)

    return {
        "counts": {
            "tools": len(tools),
            "resources": len(resources),
            "prompts": len(prompts),
        },
        "tools": tools,
        "resources": resources,
        "prompts": prompts,
        "model": {
            "name": MODEL_NAME,
            "ready": llm_service.ready,
            "loading": not llm_service.ready and llm_service.error is None,
            "error": str(llm_service.error) if llm_service.error else None,
        },
        "workspace": str(WORKSPACE_DIR),
        "mcp_error": error,
    }
