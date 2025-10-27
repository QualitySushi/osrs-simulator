from __future__ import annotations
from typing import Dict, List, Tuple
import time
from .calculator import compute_dps
from ..schemas.bis import BISRequest, BISResult

RELEVANT_STATS = {
    "melee": ("attack_stab", "attack_slash", "attack_crush", "str_melee"),
    "ranged": ("attack_ranged", "str_ranged"),
    "magic": ("attack_magic", "str_magic"),
}

def proxy_score(item: dict, style: str) -> float:
    keys = RELEVANT_STATS[style]
    return sum(float(item.get(k, 0) or 0) for k in keys)

def cull_dominated(items: List[dict], style: str) -> List[dict]:
    keys = RELEVANT_STATS[style]
    kept = []
    for a in items:
        if any(all(b.get(k, 0) >= a.get(k, 0) for k in keys)
               and any(b.get(k, 0) > a.get(k, 0) for k in keys)
               for b in items if b is not a):
            continue
        kept.append(a)
    return kept

class Timeout(Exception): pass

class BISSearcher:
    def __init__(self, req: BISRequest, npc: dict, data_version: str | None = None):
        self.req = req
        self.npc = npc
        self.data_version = data_version
        self.deadline = time.perf_counter() + req.constraints.server_timeout_ms / 1000
        self.telemetry = {"candidates_per_slot": {}, "combinations_considered": 0}

    def _check_timeout(self):
        if time.perf_counter() > self.deadline:
            raise Timeout()

    def prefilter(self, raw: Dict[str, List[dict]]) -> Dict[str, List[dict]]:
        out = {}
        for slot, items in raw.items():
            locked = next((l.item_id for l in (self.req.locked_slots or []) if l.slot == slot), None)
            if locked:
                items = [i for i in items if int(i["id"]) == int(locked)]
            items = cull_dominated(items, self.req.combat_style)
            items.sort(key=lambda i: proxy_score(i, self.req.combat_style), reverse=True)
            out[slot] = items[: self.req.constraints.max_candidates_per_slot]
            self.telemetry["candidates_per_slot"][slot] = len(out[slot])
        return out

    def evaluate(self, partial: Dict[str, dict]) -> float:
        return compute_dps(self.req, self.npc, partial)

    def search_beam(self, candidates: Dict[str, List[dict]]) -> Tuple[float, Dict[str, int]]:
        order = list(candidates.keys())
        frontier = [({}, 0.0)]
        best_dps, best_loadout = -1.0, {}
        for slot in order:
            next_frontier = []
            for partial, _ in frontier:
                for item in candidates[slot]:
                    self._check_timeout()
                    new_partial = {**partial, slot: item}
                    next_frontier.append((new_partial, proxy_score(item, self.req.combat_style)))
            frontier = next_frontier[: self.req.beam_width]
        for partial, _ in frontier:
            dps = self.evaluate(partial)
            self.telemetry["combinations_considered"] += 1
            if dps > best_dps:
                best_dps = dps
                best_loadout = {s: int(i["id"]) for s, i in partial.items()}
        return best_dps, best_loadout

    def run(self, candidates: Dict[str, List[dict]]) -> BISResult:
        start = time.perf_counter()
        try:
            filtered = self.prefilter(candidates)
            best_dps, best_loadout = self.search_beam(filtered)
            approx = self.req.mode == "fast"
        except Timeout:
            best_dps, best_loadout, approx = 0.0, {}, True
            self.telemetry["timed_out"] = True
        duration = int((time.perf_counter() - start) * 1000)
        return BISResult(best_dps=best_dps, slots=best_loadout,
                         approximate=approx, telemetry={**self.telemetry, "duration_ms": duration},
                         data_version=self.data_version)
