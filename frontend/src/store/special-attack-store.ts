import { create } from 'zustand';
import { Item, SpecialAttack } from '@/types/calculator';

export interface SpecialAttackState {
  weapon: Item | null;
  data: SpecialAttack | null;
  setWeapon: (w: Item | null) => void;
  setData: (d: SpecialAttack | null) => void;
}

export const useSpecialAttackStore = create<SpecialAttackState>((set) => ({
  weapon: null,
  data: null,
  setWeapon: (weapon) => set({ weapon }),
  setData: (data) => set({ data }),
}));
