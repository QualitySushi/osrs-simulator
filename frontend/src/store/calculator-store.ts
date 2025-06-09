import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CalculatorParams,
  DpsResult,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
  Item
} from '@/types/calculator';

interface CalculatorState {
  params: CalculatorParams;
  results: DpsResult | null;
  comparisonResults: Array<{
    label: string;
    params: CalculatorParams;
    results: DpsResult;
  }>;
  gearLocked: boolean;
  bossLocked: boolean;
  loadout: Record<string, Item | null>;

  setParams: (params: Partial<CalculatorParams>) => void;
  switchCombatStyle: (style: 'melee' | 'ranged' | 'magic') => void;
  setResults: (results: DpsResult | null) => void;
  addComparisonResult: (label: string, params: CalculatorParams, results: DpsResult) => void;
  removeComparisonResult: (index: number) => void;
  clearComparisonResults: () => void;
  resetParams: () => void;
  lockGear: () => void;
  unlockGear: () => void;
  lockBoss: () => void;
  unlockBoss: () => void;
  resetLocks: () => void;
  setLoadout: (loadout: Record<string, Item | null>) => void;
}

const defaultMeleeParams: MeleeCalculatorParams = {
  combat_style: 'melee',
  strength_level: 99,
  strength_boost: 0,
  strength_prayer: 1.0,
  attack_level: 99,
  attack_boost: 0,
  attack_prayer: 1.0,
  melee_strength_bonus: 85,
  melee_attack_bonus: 102,
  attack_style_bonus_strength: 3,
  attack_style_bonus_attack: 0,
  attack_type: 'slash',
  void_melee: false,
  gear_multiplier: 1.0,
  special_multiplier: 1.0,
  target_defence_level: 200,
  target_defence_bonus: 30,
  attack_speed: 2.4
};

const defaultRangedParams: RangedCalculatorParams = {
  combat_style: 'ranged',
  ranged_level: 99,
  ranged_boost: 0,
  ranged_prayer: 1.0,
  ranged_strength_bonus: 100,
  ranged_attack_bonus: 110,
  attack_style_bonus_attack: 3,
  attack_style_bonus_strength: 3,
  void_ranged: false,
  gear_multiplier: 1.0,
  special_multiplier: 1.0,
  target_defence_level: 200,
  target_defence_bonus: 150,
  attack_speed: 2.4
};

const defaultMagicParams: MagicCalculatorParams = {
  combat_style: 'magic',
  magic_level: 99,
  magic_boost: 0,
  magic_prayer: 1.0,
  base_spell_max_hit: 30,
  magic_attack_bonus: 100,
  magic_damage_bonus: 0.2,
  attack_style_bonus_attack: 0,
  attack_style_bonus_strength: 0,
  attack_style_bonus: 0,
  void_magic: false,
  shadow_bonus: 0,
  virtus_bonus: 0,
  tome_bonus: 0,
  prayer_bonus: 0,
  elemental_weakness: 0,
  salve_bonus: 0,
  target_magic_level: 150,
  target_magic_defence: 90,
  target_defence_level: 150,
  target_defence_bonus: 0,
  attack_speed: 2.4,
  spellbook: 'standard',
  spell_type: 'offensive',
  god_spell_charged: false,
  gear_multiplier: 1.0,
  special_multiplier: 1.0
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      params: defaultMeleeParams,
      results: null,
      comparisonResults: [],
      gearLocked: false,
      bossLocked: false,
      loadout: {},

      setParams: (newParams: Partial<CalculatorParams>) => set((state): Partial<CalculatorState> => {
        const currentStyle = state.params.combat_style;

        if (currentStyle === 'melee') {
          return {
            params: {
              ...(state.params as MeleeCalculatorParams),
              ...(newParams as Partial<MeleeCalculatorParams>)
            }
          };
        } else if (currentStyle === 'ranged') {
          return {
            params: {
              ...(state.params as RangedCalculatorParams),
              ...(newParams as Partial<RangedCalculatorParams>)
            }
          };
        } else if (currentStyle === 'magic') {
          return {
            params: {
              ...(state.params as MagicCalculatorParams),
              ...(newParams as Partial<MagicCalculatorParams>)
            }
          };
        }

        return { params: state.params }; // fallback
      }),

      switchCombatStyle: (style) => set(() => {
        switch (style) {
          case 'melee': return { 
            params: defaultMeleeParams,
            gearLocked: false,
            bossLocked: false
          };
          case 'ranged': return { 
            params: defaultRangedParams,
            gearLocked: false,
            bossLocked: false
          };
          case 'magic': return { 
            params: defaultMagicParams,
            gearLocked: false,
            bossLocked: false
          };
          default: return { 
            params: defaultMeleeParams,
            gearLocked: false,
            bossLocked: false
          };
        }
      }),

      setResults: (results) => set({ results }),

      addComparisonResult: (label, params, results) => set((state) => ({
        comparisonResults: [...state.comparisonResults, { label, params, results }]
      })),

      removeComparisonResult: (index) => set((state) => ({
        comparisonResults: state.comparisonResults.filter((_, i) => i !== index)
      })),

      clearComparisonResults: () => set({ comparisonResults: [] }),

      resetParams: () => set((state): Partial<CalculatorState> => {
        const style = state.params.combat_style;
        switch (style) {
          case 'melee':
            return { params: defaultMeleeParams, gearLocked: false, bossLocked: false };
          case 'ranged':
            return { params: defaultRangedParams, gearLocked: false, bossLocked: false };
          case 'magic':
            return { params: defaultMagicParams, gearLocked: false, bossLocked: false };
          default:
            return { params: defaultMeleeParams, gearLocked: false, bossLocked: false };
        }
      }),


      lockGear: () => set({ gearLocked: true }),
      unlockGear: () => set({ gearLocked: false }),
      lockBoss: () => set({ bossLocked: true }),
      unlockBoss: () => set({ bossLocked: false }),
      resetLocks: () => set({ gearLocked: false, bossLocked: false }),
      setLoadout: (loadout) => set({ loadout })
    }),
    {
      name: 'osrs-calculator-storage',
      partialize: (state) => ({
        params: state.params,
        gearLocked: state.gearLocked,
        bossLocked: state.bossLocked,
        loadout: state.loadout
      })
    }
  )
);
