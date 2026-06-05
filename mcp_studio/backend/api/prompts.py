"""Prompts API - list and render MCP prompt templates."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from mcp_studio.backend.api.deps import RuntimeDep

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("")
async def list_prompts(runtime: RuntimeDep) -> dict:
    prompts = await runtime.list_prompts()
    return {"prompts": prompts}


class GetRequest(BaseModel):
    arguments: dict[str, Any] = {}


@router.post("/{name}/get")
async def get_prompt(name: str, req: GetRequest | None = None, runtime: RuntimeDep = None) -> dict:
    arguments = (req.arguments if req else {}) or {}
    return await runtime.get_prompt(name, arguments)
