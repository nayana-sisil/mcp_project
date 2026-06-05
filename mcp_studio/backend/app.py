"""FastAPI app factory - mounts REST, MCP, and the static frontend build."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from mcp_studio.backend.api import chat as chat_routes
from mcp_studio.backend.api import health as health_routes
from mcp_studio.backend.api import prompts as prompt_routes
from mcp_studio.backend.api import resources as resource_routes
from mcp_studio.backend.api import tools as tool_routes
from mcp_studio.backend.api import workspace as workspace_routes
from mcp_studio.backend.config import STATIC_DIR
from mcp_studio.backend.mcp.server import mcp
from mcp_studio.backend.services.llm import llm_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    # FastMCP's streamable-http app exposes the endpoint at its configured
    # path (default "/mcp"). Mounting the sub-app at "/mcp" means the
    # public streamable URL is "/mcp/mcp" - documented in the README and
    # the root JSON response. External MCP clients connect there.
    mcp_app = mcp.http_app(transport="streamable-http")
    app.mount("/mcp", mcp_app)
    logger.info("Mounted MCP server at /mcp/mcp")

    loop = asyncio.get_running_loop()
    logger.info("Scheduling LLM load in background")
    llm_service.schedule_load(loop)

    try:
        yield
    finally:
        pass


def create_app() -> FastAPI:
    app = FastAPI(
        title="MCP Studio",
        version="0.1.0",
        description="MCP Studio - a unified Model Context Protocol server and web UI over HTTP.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_routes.router)
    app.include_router(tool_routes.router)
    app.include_router(resource_routes.router)
    app.include_router(prompt_routes.router)
    app.include_router(workspace_routes.router)
    app.include_router(chat_routes.router)

    if STATIC_DIR.exists():
        assets = STATIC_DIR / "_next"
        if assets.exists():
            app.mount("/_next", StaticFiles(directory=str(assets)), name="next-assets")

        @app.get("/")
        async def index() -> FileResponse:
            return FileResponse(str(STATIC_DIR / "index.html"))

        @app.get("/{full_path:path}")
        async def spa_fallback(full_path: str) -> FileResponse:
            candidate = STATIC_DIR / full_path
            if candidate.is_file():
                return FileResponse(str(candidate))
            return FileResponse(str(STATIC_DIR / "index.html"))
    else:
        @app.get("/")
        async def index_placeholder() -> JSONResponse:
            return JSONResponse(
                {
                    "name": "MCP Studio",
                    "message": "Frontend build not found. Use the /api/* endpoints or POST to /mcp/mcp as an MCP client.",
                    "endpoints": [
                        "GET  /api/health",
                        "GET  /api/overview",
                        "GET  /api/tools",
                        "POST /api/tools/{name}/call",
                        "GET  /api/resources",
                        "POST /api/resources/read",
                        "GET  /api/prompts",
                        "POST /api/prompts/{name}/get",
                        "GET  /api/files",
                        "GET  /api/files/content",
                        "PUT  /api/files/content",
                        "POST /api/files/upload",
                        "POST /api/chat",
                        "POST /mcp/mcp  (MCP streamable HTTP)",
                    ],
                }
            )

    return app
