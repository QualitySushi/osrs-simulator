import { detectCombatStyleFromWeapon } from '../components/features/calculator/EquipmentUtils';
import { Item } from '../types/calculator';

describe('detectCombatStyleFromWeapon', () => {
  it('detects style from combat styles', () => {
    const weapon: Item = {
      id: 1,
      name: 'Magic staff',
      has_special_attack: false,
      has_passive_effect: false,
      is_tradeable: true,
      has_combat_stats: true,
      combat_stats: {
        attack_bonuses: { magic: 10 },
        defence_bonuses: {},
        other_bonuses: {},
        combat_styles: [
          { name: 'Cast', attack_type: 'Magic', style: '', speed: '', range: '', experience: '' }
        ],
      },
    } as any;

    expect(detectCombatStyleFromWeapon(weapon)).toBe('magic');
  });

  it('falls back to attack bonuses', () => {
    const weapon: Item = {
      id: 2,
      name: 'Bow',
      has_special_attack: false,
      has_passive_effect: false,
      is_tradeable: true,
      has_combat_stats: true,
      combat_stats: {
        attack_bonuses: { ranged: 15 },
        defence_bonuses: {},
        other_bonuses: {},
      },
    } as any;

    expect(detectCombatStyleFromWeapon(weapon)).toBe('ranged');
  });
});
