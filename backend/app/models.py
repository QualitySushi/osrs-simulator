from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union


class DpsResult(BaseModel):
    """Result of a DPS calculation."""

    dps: float
    max_hit: int
    hit_chance: float
    attack_roll: int
    defence_roll: int
    average_hit: float
    effective_str: Optional[int] = None
    effective_atk: Optional[int] = None
    damage_multiplier: Optional[float] = None
    special_attacks: Optional[int] = None
    duration: Optional[float] = None
    special_attack_dps: Optional[float] = None


class BossForm(BaseModel):
    """Represents a specific form or phase of a boss."""

    id: int
    boss_id: int
    form_name: str
    form_order: int
    combat_level: Optional[int] = None
    hitpoints: Optional[int] = None
    max_hit: Optional[str] = None
    attack_speed: Optional[int] = None
    attack_style: Optional[Union[str, List[str]]] = None
    attack_level: Optional[int] = None
    strength_level: Optional[int] = None
    defence_level: Optional[int] = None
    magic_level: Optional[int] = None
    ranged_level: Optional[int] = None
    aggressive_attack_bonus: Optional[int] = None
    aggressive_strength_bonus: Optional[int] = None
    aggressive_magic_bonus: Optional[int] = None
    aggressive_magic_strength_bonus: Optional[int] = None
    aggressive_ranged_bonus: Optional[int] = None
    aggressive_ranged_strength_bonus: Optional[int] = None
    defence_stab: Optional[int] = None
    defence_slash: Optional[int] = None
    defence_crush: Optional[int] = None
    defence_magic: Optional[int] = None
    defence_ranged_standard: Optional[int] = None
    defence_ranged_light: Optional[int] = None
    defence_ranged_heavy: Optional[int] = None
    elemental_weakness_type: Optional[str] = None
    elemental_weakness_percent: Optional[str] = None
    attribute: Optional[str] = None
    xp_bonus: Optional[str] = None
    aggressive: Optional[bool] = None
    poisonous: Optional[bool] = None
    poison_immunity: Optional[bool] = None
    venom_immunity: Optional[bool] = None
    melee_immunity: Optional[bool] = None
    magic_immunity: Optional[bool] = None
    ranged_immunity: Optional[bool] = None
    cannon_immunity: Optional[bool] = None
    thrall_immunity: Optional[bool] = None
    special_mechanics: Optional[str] = None
    image_url: Optional[str] = None
    icons: Optional[List[str]] = None
    size: Optional[int] = None
    npc_ids: Optional[str] = None
    assigned_by: Optional[str] = None


class Boss(BaseModel):
    """Represents a boss with metadata."""

    id: int
    name: str
    raid_group: Optional[str] = None
    location: Optional[str] = None
    icon_url: Optional[str] = None
    release_date: Optional[str] = None
    slayer_level: Optional[int] = None
    slayer_xp: Optional[int] = None
    slayer_category: Optional[str] = None
    examine: Optional[str] = None
    has_multiple_forms: bool = False
    forms: List[BossForm] = []


class BossSummary(BaseModel):
    """Summary representation of a boss."""

    id: int
    name: str
    raid_group: Optional[str] = None
    location: Optional[str] = None
    has_multiple_forms: bool = False
    icon_url: Optional[str] = None


class ItemStats(BaseModel):
    """Combat statistics for an item."""

    attack_bonuses: Dict[str, int] = Field(default_factory=dict)
    defence_bonuses: Dict[str, int] = Field(default_factory=dict)
    other_bonuses: Dict[str, Union[int, str]] = Field(default_factory=dict)
    combat_styles: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class Item(BaseModel):
    """Represents an equipment item with metadata and stats."""

    id: int
    name: str
    slot: Optional[str] = None
    has_special_attack: bool = False
    has_passive_effect: bool = False
    passive_effect_text: Optional[str] = None
    is_tradeable: bool = True
    has_combat_stats: bool = True
    icons: Optional[List[str]] = None
    combat_stats: Optional[ItemStats] = None
    special_attack: Optional[str] = None


class ItemSummary(BaseModel):
    """Summary representation of an item."""

    id: int
    name: str
    slot: Optional[str] = None
    has_special_attack: bool = False
    has_passive_effect: bool = False
    is_tradeable: bool = True
    has_combat_stats: bool = True
    icons: Optional[List[str]] = None


class DpsParameters(BaseModel):
    """Parameters for DPS calculation."""

    combat_style: str = "melee"

    # Common parameters
    attack_speed: float = 2.4
    gear_multiplier: float = 1.0
    special_multiplier: float = 1.0
    accuracy_multiplier: float = 1.0
    hit_count: int = 1
    guaranteed_hit: bool = False
    attack_style_bonus: Optional[int] = Field(default=0)
    special_attack_cost: Optional[int] = None
    lightbearer: Optional[bool] = None
    surge_potion: Optional[bool] = None
    duration: Optional[float] = None

    # Melee parameters
    strength_level: Optional[int] = None
    strength_boost: Optional[int] = None
    strength_prayer: Optional[float] = None
    melee_strength_bonus: Optional[int] = None
    attack_level: Optional[int] = None
    attack_boost: Optional[int] = None
    attack_prayer: Optional[float] = None
    melee_attack_bonus: Optional[int] = None
    void_melee: Optional[bool] = None

    # Ranged parameters
    ranged_level: Optional[int] = None
    ranged_boost: Optional[int] = None
    ranged_prayer: Optional[float] = None
    ranged_strength_bonus: Optional[int] = None
    ranged_attack_bonus: Optional[int] = None
    void_ranged: Optional[bool] = None

    # Magic parameters
    magic_level: Optional[int] = None
    magic_boost: Optional[int] = None
    magic_prayer: Optional[float] = None
    base_spell_max_hit: Optional[int] = None
    magic_attack_bonus: Optional[int] = None
    magic_damage_bonus: Optional[float] = None
    void_magic: Optional[bool] = None
    shadow_bonus: Optional[float] = None
    virtus_bonus: Optional[float] = None
    tome_bonus: Optional[float] = None
    prayer_bonus: Optional[float] = None
    elemental_weakness: Optional[float] = None
    salve_bonus: Optional[float] = None

    # Raid parameters
    raid: Optional[str] = None
    raid_level: Optional[int] = None
    party_size: Optional[int] = None
    path_level: Optional[int] = None

    # Target parameters
    target_defence_level: int = 1
    target_defence_bonus: int = 0
    target_magic_level: int = 1
    target_magic_defence: int = 0

    class Config:
        validate_assignment = True
        extra = "allow"  # Allow extra fields for future expansion


class SearchQuery(BaseModel):
    """Query parameters for search endpoints."""

    query: str
    limit: int | None = None
