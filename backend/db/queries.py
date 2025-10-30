from typing import Iterable
from ..schemas.bis import Constraints

ITEM_BASE_QUERY = """
SELECT id, name, slot,
       attack_stab, attack_slash, attack_crush, attack_magic, attack_ranged,
       str_melee, str_ranged, str_magic,
       tradeable, degradable, price_gp,
       requirements_flags
FROM items
WHERE slot = ?
  AND (requirements_flags & ?) = requirements_flags
"""

async def fetch_slot_candidates(conn, slot: str, unlocks_mask: int, c: Constraints,
                                include_only: Iterable[int] | None,
                                exclude: Iterable[int] | None) -> list[dict]:
    clauses = []
    params = [slot, unlocks_mask]

    if c.tradeable_only:
        clauses.append("AND tradeable = 1")
    if not c.allow_degradables:
        clauses.append("AND (degradable = 0 OR degradable IS NULL)")
    if c.budget_cap_gp:
        clauses.append("AND (price_gp IS NULL OR price_gp <= ?)")
        params.append(int(c.budget_cap_gp))
    if include_only:
        placeholders = ",".join("?" for _ in include_only)
        clauses.append(f"AND id IN ({placeholders})")
        params.extend(include_only)
    if exclude:
        placeholders = ",".join("?" for _ in exclude)
        clauses.append(f"AND id NOT IN ({placeholders})")
        params.extend(exclude)

    sql = ITEM_BASE_QUERY + "\n".join(clauses)
    rows = await conn.fetch_all(sql, params)
    return [dict(r) for r in rows]
