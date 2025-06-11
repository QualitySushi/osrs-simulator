import { act } from '@testing-library/react';
import { useSpecialAttackStore } from '../store/special-attack-store';

describe('special attack store', () => {
  it('stores weapon and special data', () => {
    act(() => {
      useSpecialAttackStore.getState().setWeapon({ id:1, name:'Spec', has_special_attack: true } as any);
      useSpecialAttackStore.getState().setData({ weapon_name:'Spec', effect:'x', special_cost:50, accuracy_multiplier:1, damage_multiplier:1 });
    });
    const state = useSpecialAttackStore.getState();
    expect(state.weapon?.name).toBe('Spec');
    expect(state.data?.weapon_name).toBe('Spec');
  });
});
