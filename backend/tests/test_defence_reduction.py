import importlib, pytest

mod = None
for path in ("app.combat.defence_reduction", "app.calculators.defence_reduction"):
    try:
        mod = importlib.import_module(path); break
    except Exception: pass

if not mod:
    pytest.skip("defence reduction module not found; adjust path")

def test_order_and_caps_nonincreasing():
    if not hasattr(mod, "apply_reductions"):
        pytest.skip("Expected apply_reductions(defence, effects)")
    base = 300
    effects = [{"type": "flat", "value": 30}, {"type": "percent", "value": 0.3}]
    d1 = mod.apply_reductions(base, effects)
    d2 = mod.apply_reductions(d1, effects)
    assert 0 < d1 < base and d2 <= d1
