from fastapi import APIRouter, Depends, HTTPException
from ..schemas.bis import BISRequest, BISResult
from ..db.connection import get_conn
from ..db.queries import fetch_slot_candidates
from ..services.bis_search import BISSearcher

router = APIRouter(prefix="/bis", tags=["bis"])
SLOTS_ALL = ["weapon","head","body","legs","hands","feet","cape","ring","neck","ammo","shield"]

@router.post("", response_model=BISResult)
async def bis_endpoint(payload: BISRequest, conn=Depends(get_conn)):
    slots = set(SLOTS_ALL)
    if payload.slot_whitelist:
        slots &= set(payload.slot_whitelist)
    if payload.slot_blacklist:
        slots -= set(payload.slot_blacklist)
    if payload.locked_slots:
        slots |= {l.slot for l in payload.locked_slots}
    if not slots:
        raise HTTPException(status_code=422, detail="No slots selected")

    npc = await conn.fetch_one("SELECT * FROM npcs WHERE id = ?", [payload.npc_id])
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    raw = {}
    for slot in slots:
        raw[slot] = await fetch_slot_candidates(
            conn, slot, payload.unlocks.mask,
            payload.constraints, payload.constraints.include_only, payload.constraints.exclude,
        )

    searcher = BISSearcher(payload, dict(npc), data_version="v1")
    return searcher.run(raw)
