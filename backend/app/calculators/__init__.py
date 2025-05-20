from .melee import MeleeCalculator
from .ranged import RangedCalculator
from .magic import MagicCalculator
from typing import Dict, Any


class DpsCalculator:
    """Main DPS calculator that delegates to specific combat style calculators."""

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch DPS calculation based on combat style.
        """
        combat_style = params.get("combat_style", "melee").lower()

        if combat_style == "melee":
            return MeleeCalculator.calculate_dps(params)
        elif combat_style == "ranged":
            return RangedCalculator.calculate_dps(params)
        elif combat_style == "magic":
            return MagicCalculator.calculate_dps(params)
        else:
            raise ValueError(f"Invalid combat style: {combat_style}")