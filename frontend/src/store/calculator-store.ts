import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '@/utils/safeStorage';
import {
  CalculatorParams,
  DpsResult,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
  Item,
  Npc,
  NpcForm,
  Preset,
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
  npcLocked: boolean;
  loadout: Record<string, Item | null>;
  selectedNpc: Npc | null;
  selectedNpcForm: NpcForm | null;
  presets: Preset[];

  setParams: (params: Partial<CalculatorParams>) => void;
  switchCombatStyle: (style: 'melee' | 'ranged' | 'magic') => void;
  setResults: (results: DpsResult | null) => void;
  addComparisonResult: (label: string, params: CalculatorParams, results: DpsResult) => void;
  removeComparisonResult: (index: number) => void;
  clearComparisonResults: () => void;
  resetParams: () => void;
  lockGear: () => void;
  unlockGear: () => void;
  lockNpc: () => void;
  unlockNpc: () => void;
  resetLocks: () => void;
  setLoadout: (loadout: Record<string, Item | null>) => void;
  setSelectedNpc: (npc: Npc | null) => void;
  setSelectedNpcForm: (form: NpcForm | null) => void;
  setPresets: (presets: Preset[]) => void;
  addPreset: (preset: Preset) => void;
  removePreset: (id: string) => void;
  reorderPresets: (fromIndex: number, toIndex: number) => void;
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
  special_attack_cost: 0,
  special_attack_speed: 2.4,
  special_damage_multiplier: 1.0,
  special_accuracy_modifier: 1.0,
  special_energy_cost: 0,
  special_regen_rate: 10 / 30,
  lightbearer: false,
  surge_potion: false,
  initial_special_energy: 100,
  duration: 60,
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
  special_attack_cost: 0,
  special_attack_speed: 2.4,
  special_damage_multiplier: 1.0,
  special_accuracy_modifier: 1.0,
  special_energy_cost: 0,
  special_regen_rate: 10 / 30,
  lightbearer: false,
  surge_potion: false,
  initial_special_energy: 100,
  duration: 60,
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
  special_multiplier: 1.0,
  special_attack_cost: 0,
  special_attack_speed: 2.4,
  special_damage_multiplier: 1.0,
  special_accuracy_modifier: 1.0,
  special_energy_cost: 0,
  special_regen_rate: 10 / 30,
  lightbearer: false,
  surge_potion: false,
  initial_special_energy: 100,
  duration: 60
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      params: defaultMeleeParams,
      results: null,
      comparisonResults: [],
      gearLocked: false,
      npcLocked: false,
      loadout: {},
      selectedNpc: null,
      selectedNpcForm: null,
      presets: [],

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
            npcLocked: false
          };
          case 'ranged': return { 
            params: defaultRangedParams,
            gearLocked: false,
            npcLocked: false
          };
          case 'magic': return { 
            params: defaultMagicParams,
            gearLocked: false,
            npcLocked: false
          };
          default: return { 
            params: defaultMeleeParams,
            gearLocked: false,
            npcLocked: false
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
            return { params: defaultMeleeParams, gearLocked: false, npcLocked: false };
          case 'ranged':
            return { params: defaultRangedParams, gearLocked: false, npcLocked: false };
          case 'magic':
            return { params: defaultMagicParams, gearLocked: false, npcLocked: false };
          default:
            return { params: defaultMeleeParams, gearLocked: false, npcLocked: false };
        }
      }),


      lockGear: () => set({ gearLocked: true }),
      unlockGear: () => set({ gearLocked: false }),
      lockNpc: () => set({ npcLocked: true }),
      unlockNpc: () => set({ npcLocked: false }),
      resetLocks: () => set({ gearLocked: false, npcLocked: false }),
      setLoadout: (loadout) => set({ loadout }),
      setSelectedNpc: (npc) => set({ selectedNpc: npc }),
      setSelectedNpcForm: (form) => set({ selectedNpcForm: form }),
      setPresets: (presets) => set({ presets }),
      addPreset: (preset) =>
        set((state) => ({ presets: [...state.presets, preset] })),
      removePreset: (id) =>
        set((state) => ({ presets: state.presets.filter((p) => p.id !== id) })),
      reorderPresets: (fromIndex, toIndex) =>
        set((state) => {
          const updated = [...state.presets];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          return { presets: updated };
        })
    }),
    {
      name: 'osrs-calculator-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        params: state.params,
        gearLocked: state.gearLocked,
        npcLocked: state.npcLocked,
        loadout: state.loadout,
        selectedNpc: state.selectedNpc,
        selectedNpcForm: state.selectedNpcForm,
        presets: state.presets,
      })
    }
  )
);
