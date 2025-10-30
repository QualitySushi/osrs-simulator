import pytest

@pytest.mark.asyncio
async def test_bis_small_slots(async_client):
    req = {
        "npc_id": 1,
        "combat_style": "ranged",
        "slot_whitelist": ["weapon","head","body"],
        "constraints": {"max_candidates_per_slot": 40, "server_timeout_ms": 3000},
        "mode": "fast",
    }
    res = await async_client.post("/bis", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["best_dps"] >= 0
    assert set(data["slots"]).issubset({"weapon","head","body"})
