from __future__ import annotations
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, conint, confloat

CombatStyle = Literal["melee", "ranged", "magic"]

class PlayerLevels(BaseModel):
    attack: conint(ge=1, le=126) = 99
    strength: conint(ge=1, le=126) = 99
    defence: conint(ge=1, le=126) = 99
    ranged: conint(ge=1, le=126) = 99
    magic: conint(ge=1, le=126) = 99
    prayer: conint(ge=1, le=126) = 99

class SpecPolicy(BaseModel):
    allow: bool = False
    uptime_percent: conint(ge=0, le=100) = 0
    rotation_seconds: Optional[conint(gt=0, le=600)] = None
    weapons: Optional[List[int]] = None

class Constraints(BaseModel):
    tradeable_only: bool = False
    allow_degradables: bool = True
    ironman_mode: bool = False
    budget_cap_gp: Optional[conint(gt=0)] = None
    include_only: Optional[List[int]] = None
    exclude: Optional[List[int]] = None
    max_candidates_per_slot: conint(ge=5, le=200) = 60
    max_combinations: conint(ge=10_000, le=20_000_000) = 5_000_000
    server_timeout_ms: conint(ge=500, le=15_000) = 5_000

class Unlocks(BaseModel):
    mask: conint(ge=0) = 0
    flags: Optional[List[str]] = None

class SlotLock(BaseModel):
    slot: str
    item_id: int

class BISRequest(BaseModel):
    npc_id: int
    combat_style: CombatStyle
    levels: PlayerLevels = Field(default_factory=PlayerLevels)
    prayers: List[str] = Field(default_factory=list)
    potions: List[str] = Field(default_factory=list)
    spec_policy: SpecPolicy = Field(default_factory=SpecPolicy)
    slot_whitelist: Optional[List[str]] = None
    slot_blacklist: Optional[List[str]] = None
    locked_slots: Optional[List[SlotLock]] = None
    unlocks: Unlocks = Field(default_factory=Unlocks)
    constraints: Constraints = Field(default_factory=Constraints)
    mode: Literal["fast", "exact"] = "fast"
    beam_width: conint(ge=10, le=2000) = 250

class BISResult(BaseModel):
    best_dps: confloat(ge=0) = 0.0
    slots: Dict[str, int] = Field(default_factory=dict)
    details: Dict[str, Any] = Field(default_factory=dict)
    telemetry: Dict[str, Any] = Field(default_factory=dict)
    approximate: bool = True
    formula_version: int = 1
    data_version: Optional[str] = None
