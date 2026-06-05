"""Runtime configuration for MCP Studio."""

from __future__ import annotations

import os
from pathlib import Path


def _resolve_workspace_dir() -> Path:
    """Pick the workspace directory.

    On Hugging Face Spaces, ``/data`` is the persistent volume. If it
    exists we use ``/data/workspace`` so user changes survive restarts.
    Otherwise we fall back to the bundled samples shipped with the image.
    """

    env = os.environ.get("WORKSPACE_DIR")
    if env:
        return Path(env).expanduser().resolve()

    hf_data = Path("/data")
    if hf_data.exists() and os.access(hf_data, os.W_OK):
        target = hf_data / "workspace"
        target.mkdir(parents=True, exist_ok=True)
        return target

    bundled = Path(__file__).parent / "workspace"
    bundled.mkdir(parents=True, exist_ok=True)
    return bundled


WORKSPACE_DIR: Path = _resolve_workspace_dir()
HF_HOME: Path = Path(os.environ.get("HF_HOME", str(WORKSPACE_DIR.parent / ".cache" / "huggingface")))
HF_HOME.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("HF_HOME", str(HF_HOME))

MODEL_NAME: str = os.environ.get("MODEL_NAME", "google/flan-t5-small")
MODEL_LOAD_TIMEOUT: float = float(os.environ.get("MODEL_LOAD_TIMEOUT", "300"))

STATIC_DIR: Path = (
    Path(os.environ.get("STATIC_DIR", str(Path(__file__).parent.parent / "frontend" / "out")))
)
