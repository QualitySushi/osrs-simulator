import importlib
import pytest

pe = None
for path in ("app.effects.passives", "app.services.passive_service"):
    try:
        pe = importlib.import_module(path)
        break
    except Exception:
        pass

if not pe:
    pytest.skip("passives module not found; adjust path", allow_module_level=True)


def test_conflicting_passives_not_duplicated():
    fn = getattr(pe, "detect", None)
    if not fn:
        pytest.skip("Expected detect(loadout, target)")
    loadout = {"gear": {"ring": "Lightbearer", "ammo": "Ruby Bolts (e)"}}
    res = fn(loadout, {"name": "Boss"})
    assert isinstance(res, (list, set))
    assert len(res) == len(set(map(str, res)))
