from typing import Dict, Any

from ..calculators import DpsCalculator


def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
    """Facade for DPS calculations without FastAPI dependencies."""
    return DpsCalculator.calculate_dps(params)


def calculate_item_effect(params: Dict[str, Any]) -> Dict[str, Any]:
    """Facade for special item effect calculations."""
    return DpsCalculator.calculate_item_effect(params)
