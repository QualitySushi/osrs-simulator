import { create } from 'zustand';

export interface EquipmentBonusesState {
  melee_attack_bonus: number;
  melee_strength_bonus: number;
  ranged_attack_bonus: number;
  ranged_strength_bonus: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
  setBonuses: (b: Partial<EquipmentBonusesState>) => void;
  resetBonuses: () => void;
}

const defaultState: Omit<EquipmentBonusesState, 'setBonuses' | 'resetBonuses'> = {
  melee_attack_bonus: 0,
  melee_strength_bonus: 0,
  ranged_attack_bonus: 0,
  ranged_strength_bonus: 0,
  magic_attack_bonus: 0,
  magic_damage_bonus: 0,
};

export const useEquipmentBonusesStore = create<EquipmentBonusesState>((set) => ({
  ...defaultState,
  setBonuses: (b) => set((state) => ({ ...state, ...b })),
  resetBonuses: () => set({ ...defaultState }),
}));
