"""Chat API - the AI host endpoint.

Uses the tool router to decide whether to invoke an MCP tool, then
returns the final answer plus a list of tool-call events so the UI can
render an expandable trace.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mcp_studio.backend.api.deps import RuntimeDep
from mcp_studio.backend.services.llm import llm_service, wait_for_model
from mcp_studio.backend.services.tool_router import route_and_answer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@router.post("")
async def chat(req: ChatRequest, runtime: RuntimeDep) -> dict[str, Any]:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")

    if not llm_service.ready:
        await wait_for_model(timeout=2.0)
    if not llm_service.ready:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "model_loading",
                "message": "The model is still loading. Please try again in a few seconds.",
            },
        )
    if llm_service.error is not None:
        raise HTTPException(status_code=500, detail=f"Model error: {llm_service.error}")

    history = [m.model_dump() for m in req.history]
    result = await route_and_answer(runtime, req.message, history)
    return result
