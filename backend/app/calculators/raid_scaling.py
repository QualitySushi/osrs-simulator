"""Utility functions for adjusting target stats based on raid settings."""

from typing import Dict, Any


def apply_raid_scaling(params: Dict[str, Any]) -> Dict[str, Any]:
    """Adjust defensive stats based on raid type and raid level."""

    raid = params.get("raid")
    raid_group = params.get("raid_group")
    if not raid or not raid_group:
        return params

    raid = str(raid).lower()
    party_size = int(params.get("party_size", 1) or 1)
    raid_level = int(params.get("raid_level", 0) or 0)
    path_level = int(params.get("path_level", 0) or 0)

    defence_mult = 1.0

    if raid in {"toa", "tombs of amascut"}:
        # Only raid level affects defence/accuracy. Party size and path level
        # modify hitpoints/damage which are not currently modelled.
        defence_mult = 1 + raid_level * 0.004
    elif raid in {"tob", "theatre of blood"}:
        # Theatre of Blood only scales boss hitpoints based on party size.
        # Defensive stats remain unchanged.
        defence_mult = 1.0
    elif raid in {"cox", "chambers of xeric"}:
        # Chambers of Xeric enemy stats vary with party size and scaling
        # from infiltration. A precise formula is complex, so we
        # approximate increased defence by 40% per extra player.
        defence_mult = 1 + 0.4 * max(0, party_size - 1)
    else:
        return params

    params = params.copy()
    params["target_defence_level"] = int(params.get("target_defence_level", 1) * defence_mult)
    params["target_defence_bonus"] = int(params.get("target_defence_bonus", 0) * defence_mult)
    if "target_magic_level" in params:
        params["target_magic_level"] = int(params.get("target_magic_level", 1) * defence_mult)
    if "target_magic_defence" in params:
        params["target_magic_defence"] = int(params.get("target_magic_defence", 0) * defence_mult)

    # Store multipliers for potential future use (e.g. hitpoint scaling)
    params["raid_defence_multiplier"] = defence_mult

    hp_mult = 1.0
    if raid in {"toa", "tombs of amascut"}:
        hp_mult = 1.0
        if party_size > 1:
            hp_mult += 0.9 * min(2, party_size - 1)
        if party_size > 3:
            hp_mult += 0.6 * (party_size - 3)
        hp_mult *= 1 + raid_level * 0.004
        if path_level:
            hp_mult *= 1 + 0.08 + 0.05 * max(0, path_level - 1)
    elif raid in {"tob", "theatre of blood"}:
        if party_size <= 3:
            hp_mult = 0.75
        elif party_size == 4:
            hp_mult = 0.875
        else:
            hp_mult = 1.0
    elif raid in {"cox", "chambers of xeric"}:
        hp_mult = 1 + 0.4 * max(0, party_size - 1)

    params["raid_hp_multiplier"] = hp_mult

    return params
