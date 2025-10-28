# backend/app/agent.py
import json
import logging
import os
from typing import List, Dict, Any

from openai import OpenAI
from .tools import openai_tool_specs, TOOL_IMPLS

MODEL = os.getenv("MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """
You are ScapeLab Agent. Your job:
- Parse the user's intent.
- Call tools for ANY numbers: do not invent game data or math.
- Resolve aliases (DHCB, serp, vork) via lookup tools; never guess.
- If an essential parameter is missing (e.g., bolts type), ask ONE precise question.
- Return short, useful summaries and include a 'Show math' section if DPS is computed.
- Units: ticks, attack roll, accuracy %, max hit, effective levels.
- If user asks for comparisons, run multiple calls and present a table.

Hard rules:
- If a boss/item name isn't found, say so and offer close matches (if provided by tools).
- Do not freeform calculate DPS; always use calculate_dps.
"""

_client_singleton: OpenAI | None = None

def _get_client() -> OpenAI:
    """Lazy-initialize the OpenAI client after env is loaded."""
    global _client_singleton
    if _client_singleton is not None:
        return _client_singleton

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing OPENAI_API_KEY. Ensure it's set in backend/.env or your environment "
            "BEFORE importing/starting the app."
        )
    _client_singleton = OpenAI(api_key=api_key)
    return _client_singleton


def run_agent_chat(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    messages: [{"role":"user"/"assistant"/"system", "content":"..."}]
    Returns: {"content": "..."} for the final assistant reply.
    """
    client = _get_client()

    # 1) Ask the model what to do
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages,
        tools=openai_tool_specs(),
        tool_choice="auto",
        temperature=0.2,
    )

    msg = resp.choices[0].message

    # 2) If the model wants to call tools, execute them sequentially
    tool_calls = msg.tool_calls or []
    tool_results: List[Dict[str, Any]] = []

    for call in tool_calls:
        name = call.function.name
        args = json.loads(call.function.arguments or "{}")
        try:
            result = TOOL_IMPLS[name](args)
            payload = json.dumps(
                result,
                default=lambda o: o.model_dump() if hasattr(o, "model_dump") else o,
            )
        except Exception as e:
            logging.exception("Tool %s failed", name)
            payload = json.dumps({"error": str(e)})

        tool_results.append({
            "role": "tool",
            "tool_call_id": call.id,
            "name": name,
            "content": payload,
        })

    if tool_results:
        # 3) Let the model synthesize a final, user-facing answer
        final = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages + tool_results,
            temperature=0.2,
        )
        return {"content": final.choices[0].message.content}

    # No tools needed; just return the initial model message
    return {"content": msg.content}
