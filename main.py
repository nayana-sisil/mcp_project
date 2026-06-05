"""MCP Studio - entry point.

Starts the unified FastAPI app (which serves the REST API, the MCP
endpoint at /mcp, and the static frontend build) using uvicorn.
"""

import os
import uvicorn

from mcp_studio.backend.app import create_app


def main() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "7860"))
    app = create_app()
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
