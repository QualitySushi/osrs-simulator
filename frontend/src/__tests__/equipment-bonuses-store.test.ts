import { act } from '@testing-library/react';
import { useEquipmentBonusesStore } from '../store/equipment-bonuses-store';

describe('equipment bonuses store', () => {
  it('updates and resets bonuses', () => {
    act(() => {
      useEquipmentBonusesStore.getState().setBonuses({ melee_attack_bonus: 5 });
    });
    expect(useEquipmentBonusesStore.getState().melee_attack_bonus).toBe(5);
    act(() => {
      useEquipmentBonusesStore.getState().resetBonuses();
    });
    expect(useEquipmentBonusesStore.getState().melee_attack_bonus).toBe(0);
  });
});
