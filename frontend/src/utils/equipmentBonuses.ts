export interface EquipmentBonuses {
  melee_attack_bonus: number;
  melee_strength_bonus: number;
  ranged_attack_bonus: number;
  ranged_strength_bonus: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
}

import { Item } from '@/types/calculator';

export function calculateEquipmentBonuses(
  loadout: Record<string, Item | null>,
  attackType?: string
): EquipmentBonuses {
  let meleeAtk = 0,
    meleeStr = 0,
    rangedAtk = 0,
    rangedStr = 0,
    magicAtk = 0,
    magicDmg = 0;

  Object.entries(loadout).forEach(([slot, item]) => {
    if (slot === 'spec' || !item?.combat_stats) return;

    const { attack_bonuses = {}, other_bonuses = {} } = item.combat_stats;

    const atkType = attackType as keyof typeof attack_bonuses;
    meleeAtk += attack_bonuses[atkType] || 0;
    meleeStr += other_bonuses.strength || 0;
    rangedAtk += attack_bonuses.ranged || 0;
    rangedStr += other_bonuses['ranged strength'] || 0;
    magicAtk += attack_bonuses.magic || 0;

    const dmgStr = other_bonuses['magic damage'];
    if (typeof dmgStr === 'string') {
      const match = dmgStr.match(/\+(\d+)%/);
      if (match) magicDmg += parseInt(match[1], 10) / 100;
    }
  });

  return {
    melee_attack_bonus: meleeAtk,
    melee_strength_bonus: meleeStr,
    ranged_attack_bonus: rangedAtk,
    ranged_strength_bonus: rangedStr,
    magic_attack_bonus: magicAtk,
    magic_damage_bonus: magicDmg,
  };
}
