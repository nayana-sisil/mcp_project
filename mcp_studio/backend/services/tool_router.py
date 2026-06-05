"""LLM-driven tool router.

FLAN-T5-small can't do reliable native function calling, so we prompt it
to emit a single JSON line with ``{"tool": ..., "args": ...}`` or
``{"tool": "answer", "args": {"text": ...}}``. The router then executes
the tool via the in-process runtime and loops for a final answer.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from mcp_studio.backend.mcp.runtime import MCPRuntime
from mcp_studio.backend.services.llm import llm_service

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 3

ROUTER_INSTRUCTION = (
    "You are the routing brain of MCP Studio. Given a user request and a list of "
    "available tools, decide which tool (if any) should be called.\n"
    "Reply with EXACTLY one JSON object on a single line, no prose:\n"
    '{{"tool": "<tool_name>", "args": {{...}}}}  - to call a tool\n'
    '{{"tool": "answer", "args": {{"text": "<short response>"}}}} - to answer directly\n'
    "If unsure, choose answer.\n\n"
    "Tools:\n"
)

_JSON_LINE = re.compile(r"\{.*\}")


def _extract_json(text: str) -> dict[str, Any] | None:
    match = _JSON_LINE.search(text)
    if not match:
        return None
    candidate = match.group(0)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        try:
            return json.loads(re.sub(r",\s*([\]}])", r"\1", candidate))
        except Exception:  # noqa: BLE001
            return None


def _summarize_tool(t: dict[str, Any]) -> str:
    props = (t.get("inputSchema") or {}).get("properties") or {}
    props_str = ", ".join(f"{k}: {v.get('type', 'string')}" for k, v in props.items())
    return f"- {t['name']}({props_str}) - {t.get('description', '')}"


async def route_and_answer(
    runtime: MCPRuntime,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    history = history or []
    tools = await runtime.list_tools()
    tool_names = {t["name"] for t in tools}
    tool_summaries = "\n".join(_summarize_tool(t) for t in tools)

    transcript: list[dict[str, Any]] = []
    last_tool_result: str | None = None
    final_answer: str | None = None

    for _ in range(MAX_TOOL_ITERATIONS):
        prompt_parts = [ROUTER_INSTRUCTION, tool_summaries, ""]
        for h in history[-6:]:
            prompt_parts.append(f"{h['role']}: {h['content']}")
        if last_tool_result is not None:
            prompt_parts.append(f"tool_result: {last_tool_result[:800]}")
        prompt_parts.append(f"user: {user_message}")
        prompt_parts.append("assistant:")

        raw = llm_service.generate("\n".join(prompt_parts), max_new_tokens=200)
        decision = _extract_json(raw)

        if not decision or "tool" not in decision:
            final_answer = raw.strip() or "I'm not sure how to help with that yet."
            break

        tool_name = decision.get("tool")
        args = decision.get("args") or {}

        if tool_name == "answer":
            final_answer = (args.get("text") or "").strip() or "(no answer)"
            break

        if tool_name not in tool_names:
            final_answer = f"Unknown tool: {tool_name}"
            break

        result = await runtime.call_tool(tool_name, args)
        transcript.append({"tool": tool_name, "args": args, "result": result})
        last_tool_result = result
    else:
        final_answer = (
            "I gathered some information but ran out of tool steps. "
            "Here is the last tool result I saw:\n\n" + (last_tool_result or "(none)")
        )

    return {"answer": final_answer or "(no answer)", "trace": transcript}
