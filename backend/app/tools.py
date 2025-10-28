# backend/app/tools.py
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from .services import calculation_service, bis_service
from .models import DpsParameters, DpsResult, Item, Boss

# ---- Tool Schemas (narrow, explicit, documented) ----
class CalcDpsArgs(BaseModel):
    params: DpsParameters = Field(..., description="All inputs required to compute DPS.")

class BisArgs(BaseModel):
    boss_name: str
    constraints: dict = Field(default_factory=dict, description="e.g. budget_gp, account_type, skills, prayers allowed")

class LookupItemArgs(BaseModel):
    name: str

class LookupBossArgs(BaseModel):
    name: str

# ---- Tool Implementations (deterministic, side-effect free) ----
def tool_calculate_dps(args: CalcDpsArgs) -> DpsResult:
    # Your service already returns a DpsResult Pydantic model
    return calculation_service.calculate(args.params)

def tool_bis_for_boss(args: BisArgs):
    return bis_service.best_in_slot_for_boss(args.boss_name, **args.constraints)

def tool_lookup_item(args: LookupItemArgs) -> Item:
    from .repositories.item_repository import get_item_by_name
    item = get_item_by_name(args.name)
    if not item:
        raise ValueError(f"Unknown item: {args.name}")
    return item

def tool_lookup_boss(args: LookupBossArgs) -> Boss:
    from .repositories.boss_repository import get_boss_by_name
    boss = get_boss_by_name(args.name)
    if not boss:
        raise ValueError(f"Unknown boss: {args.name}")
    return boss

# ---- JSON tool specs for the LLM ----
def openai_tool_specs():
    # Map function names to JSON schemas the model can call.
    return [
        {
            "type": "function",
            "function": {
                "name": "calculate_dps",
                "description": "Compute DPS with canonical ScapeLab formulas.",
                "parameters": CalcDpsArgs.model_json_schema(),
            },
        },
        {
            "type": "function",
            "function": {
                "name": "bis_for_boss",
                "description": "Return best-in-slot recommendations for a boss under constraints.",
                "parameters": BisArgs.model_json_schema(),
            },
        },
        {
            "type": "function",
            "function": {
                "name": "lookup_item",
                "description": "Resolve an item by name or alias (DHCB, serp, etc.).",
                "parameters": LookupItemArgs.model_json_schema(),
            },
        },
        {
            "type": "function",
            "function": {
                "name": "lookup_boss",
                "description": "Resolve a boss by name or alias.",
                "parameters": LookupBossArgs.model_json_schema(),
            },
        },
    ]

# Dispatcher for tool calls from the LLM
TOOL_IMPLS = {
    "calculate_dps": lambda a: tool_calculate_dps(CalcDpsArgs(**a)),
    "bis_for_boss":  lambda a: tool_bis_for_boss(BisArgs(**a)),
    "lookup_item":   lambda a: tool_lookup_item(LookupItemArgs(**a)),
    "lookup_boss":   lambda a: tool_lookup_boss(LookupBossArgs(**a)),
}
