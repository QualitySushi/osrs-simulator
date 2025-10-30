# tools/scraper_v2/models.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# Keep this super minimal. Parsers only need these to import/type-hint.
# If you later want to persist these to DB, expand as needed.

@dataclass
class Lineage:
    source_page: Optional[str] = None         # e.g., wiki title
    source_url: Optional[str] = None
    raw_html: Optional[str] = None            # original parse.text["*"] if you store it
    scraped_at: Optional[str] = None          # ISO timestamp


@dataclass
class Npc:
    name: Optional[str] = None
    combat_level: Optional[int] = None
    hitpoints: Optional[int] = None
    max_hit: Optional[int] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    drops: List[Dict[str, Any]] = field(default_factory=list)
    lineage: Optional[Lineage] = None


@dataclass
class Prayer:
    name: Optional[str] = None
    level: Optional[int] = None                   # unlock level
    drain_rate: Optional[float] = None            # per tick/second as your parser defines
    effects: Dict[str, Any] = field(default_factory=dict)  # buffs/protections/etc.
    lineage: Optional[Lineage] = None


@dataclass
class SpecialAttack:
    name: Optional[str] = None
    energy_cost: Optional[int] = None             # percentage (0–100)
    description: Optional[str] = None             # rich text/plain
    modifiers: Dict[str, Any] = field(default_factory=dict)  # accuracy/damage/etc.
    lineage: Optional[Lineage] = None
