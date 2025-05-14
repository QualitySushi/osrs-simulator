import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  CalculatorParams, 
  DpsResult,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams
} from '@/app/types/calculator';

interface CalculatorState {
  // Parameters
  params: CalculatorParams;
  results: DpsResult | null;
  comparisonResults: Array<{
    label: string;
    params: CalculatorParams;
    results: DpsResult;
  }>;
  
  // Actions
  setParams: (params: Partial<CalculatorParams>) => void;
  switchCombatStyle: (style: 'melee' | 'ranged' | 'magic') => void;
  setResults: (results: DpsResult | null) => void;
  addComparisonResult: (label: string, params: CalculatorParams, results: DpsResult) => void;
  removeComparisonResult: (index: number) => void;
  clearComparisonResults: () => void;
  resetParams: () => void;
}

// Default parameter values for each combat style
const defaultMeleeParams: MeleeCalculatorParams = {
  combat_style: 'melee',
  strength_level: 99,
  strength_boost: 8,
  strength_prayer: 1.23, // Piety
  attack_level: 99,
  attack_boost: 8,
  attack_prayer: 1.23, // Piety
  melee_strength_bonus: 130,
  melee_attack_bonus: 120,
  attack_style_bonus: 3,
  void_melee: false,
  gear_multiplier: 1.0,
  special_multiplier: 1.0,
  target_defence_level: 250,
  target_defence_bonus: 100,
  attack_speed: 2.4
};

const defaultRangedParams: RangedCalculatorParams = {
  combat_style: 'ranged',
  ranged_level: 99,
  ranged_boost: 13,
  ranged_prayer: 1.23, // Rigour
  ranged_strength_bonus: 120,
  ranged_attack_bonus: 130,
  attack_style_bonus: 3,
  void_ranged: false,
  gear_multiplier: 1.0,
  special_multiplier: 1.0,
  target_defence_level: 250,
  target_ranged_defence_bonus: 150,
  attack_speed: 2.4
};

const defaultMagicParams: MagicCalculatorParams = {
  combat_style: 'magic',
  magic_level: 99,
  magic_boost: 13,
  magic_prayer: 1.25, // Augury
  base_spell_max_hit: 30,
  magic_attack_bonus: 120,
  magic_damage_bonus: 0.20,
  attack_style_bonus: 0,
  void_magic: false,
  target_magic_level: 150,
  target_magic_defence: 90,
  attack_speed: 2.4,
  prayer_bonus: 0.04
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      params: defaultMeleeParams,
      results: null,
      comparisonResults: [],

      setParams: (newParams: Partial<CalculatorParams>) => set((state) => {
        // Preserve the discriminant field (combat_style)
        const updatedParams = {
          ...state.params,
          ...newParams,
          // Explicitly preserve the combat_style discriminant
          combat_style: newParams.combat_style || state.params.combat_style
        };
        
        // Return with type assertion
        return { params: updatedParams as CalculatorParams };
      }),

      switchCombatStyle: (style) => set(() => {
        switch (style) {
          case 'melee':
            return { params: defaultMeleeParams };
          case 'ranged':
            return { params: defaultRangedParams };
          case 'magic':
            return { params: defaultMagicParams };
          default:
            return { params: defaultMeleeParams };
        }
      }),

      setResults: (results) => set({ results }),

      addComparisonResult: (label, params, results) => set((state) => ({
        comparisonResults: [
          ...state.comparisonResults,
          { label, params, results }
        ]
      })),

      removeComparisonResult: (index) => set((state) => ({
        comparisonResults: state.comparisonResults.filter((_, i) => i !== index)
      })),

      clearComparisonResults: () => set({ comparisonResults: [] }),

      resetParams: () => set((state) => {
        const style = state.params.combat_style;
        switch (style) {
          case 'melee':
            return { params: defaultMeleeParams };
          case 'ranged':
            return { params: defaultRangedParams };
          case 'magic':
            return { params: defaultMagicParams };
          default:
            return { params: defaultMeleeParams };
        }
      }),
    }),
    {
      name: 'osrs-calculator-storage',
      partialize: (state) => ({ 
        params: state.params,
        // Don't persist results or comparison
      }),
    }
  )
);