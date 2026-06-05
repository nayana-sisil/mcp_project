"""Resources API - list and read MCP resources."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mcp_studio.backend.api.deps import RuntimeDep

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("")
async def list_resources(runtime: RuntimeDep) -> dict:
    resources = await runtime.list_resources()
    return {"resources": resources}


class ReadRequest(BaseModel):
    uri: str


@router.post("/read")
async def read_resource(req: ReadRequest, runtime: RuntimeDep) -> dict:
    if not req.uri:
        raise HTTPException(status_code=400, detail="uri is required")
    content = await runtime.read_resource(req.uri)
    return {"uri": req.uri, "content": content}
