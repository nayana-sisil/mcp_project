"""LLM service - FLAN-T5 singleton with background loading.

The model is loaded in a background thread on app startup so the HTTP
server can begin serving the MCP endpoint, the REST API and the static
frontend immediately. ``/api/health`` reports whether the model is
ready, and the chat endpoint rejects requests with 503 until then.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from mcp_studio.backend.config import MODEL_NAME

logger = logging.getLogger(__name__)


class LLMService:
    """Thread-safe singleton wrapper around a transformers model.

    Loads ``google/flan-t5-small`` (or whatever ``MODEL_NAME`` points at)
    as ``AutoModelForSeq2SeqLM`` + ``AutoTokenizer`` and exposes a
    blocking ``generate`` method that runs synchronously in a thread
    pool so the event loop is not blocked.
    """

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model_name = model_name
        self._model: Any | None = None
        self._tokenizer: Any | None = None
        self._executor: ThreadPoolExecutor | None = None
        self._ready = threading.Event()
        self._error: Exception | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    @property
    def ready(self) -> bool:
        return self._ready.is_set()

    @property
    def error(self) -> Exception | None:
        return self._error

    def schedule_load(self, loop: asyncio.AbstractEventLoop) -> None:
        """Kick off model loading in a background thread."""
        if self._executor is not None:
            return
        self._loop = loop
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="llm-loader")
        self._executor.submit(self._load_sync)

    def _load_sync(self) -> None:
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # heavy import

            logger.info("Loading model %s ...", self.model_name)
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
            logger.info("Model %s loaded", self.model_name)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Model load failed")
            self._error = exc
        finally:
            self._ready.set()
            if self._loop is not None:
                self._loop.call_soon_threadsafe(asyncio.Event.set, _model_ready_async)

    def generate(self, prompt: str, max_new_tokens: int = 256) -> str:
        """Run a blocking, non-streaming generation. Returns the decoded text."""
        if not self.ready:
            raise RuntimeError("Model not ready")
        if self._error is not None:
            raise self._error
        assert self._model is not None and self._tokenizer is not None

        inputs = self._tokenizer(prompt, return_tensors="pt", truncation=True)
        outputs = self._model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )
        return self._tokenizer.decode(outputs[0], skip_special_tokens=True)


# Module-level event used by HTTP routes to await readiness.
_model_ready_async = asyncio.Event()


async def wait_for_model(timeout: float | None = None) -> None:
    if _model_ready_async.is_set():
        return
    try:
        await asyncio.wait_for(_model_ready_async.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        pass


llm_service = LLMService()
