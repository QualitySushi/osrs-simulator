import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { CalculatorParams, Item, NpcForm, CombatStyle } from '@/types/calculator';
import calculatePassiveEffectBonuses from '@/components/features/calculator/PassiveEffectCalculator';
import { useToast } from './use-toast';
import { safeFixed } from '@/utils/format';

export function useDpsCalculator() {
  const { toast } = useToast();
  const params = useCalculatorStore((s) => s.params);
  const results = useCalculatorStore((s) => s.results);
  const setResults = useCalculatorStore((s) => s.setResults);
  const switchCombatStyle = useCalculatorStore((s) => s.switchCombatStyle);
  const resetParams = useCalculatorStore((s) => s.resetParams);
  const resetLocks = useCalculatorStore((s) => s.resetLocks);
  const storeLoadout = useCalculatorStore((s) => s.loadout);
  const setStoreLoadout = useCalculatorStore((s) => s.setLoadout);

  const [activeTab, setActiveTab] = useState<CombatStyle>(params.combat_style);
  const [currentLoadout, setCurrentLoadout] = useState<Record<string, Item | null>>(storeLoadout);
  const storeNpcForm = useCalculatorStore((s) => s.selectedNpcForm);
  const setStoreNpcForm = useCalculatorStore((s) => s.setSelectedNpcForm);
  const [currentNpcForm, setCurrentNpcForm] = useState<NpcForm | null>(storeNpcForm);
  const [appliedPassiveEffects, setAppliedPassiveEffects] = useState<any>(null);

  useEffect(() => {
    setCurrentNpcForm(storeNpcForm);
  }, [storeNpcForm]);

  useEffect(() => {
    setCurrentLoadout(storeLoadout);
  }, [storeLoadout]);

  // keep local tab state in sync with store combat style
  useEffect(() => {
    setActiveTab(params.combat_style);
  }, [params.combat_style]);

  const calculateEffects = useCallback(() => {
    return calculatePassiveEffectBonuses(params, currentLoadout, currentNpcForm);
  }, [params, currentLoadout, currentNpcForm]);

  useEffect(() => {
    const effects = calculateEffects();
    if (effects.isApplicable) {
      setAppliedPassiveEffects(effects);
    } else {
      setAppliedPassiveEffects(null);
    }
  }, [calculateEffects]);

  const calculateMutation = useMutation({
    mutationFn: (calculationParams: CalculatorParams) =>
      calculatorApi.calculateDps(calculationParams),
    onSuccess: (data) => {
      setResults(data);
      toast.success(
        `DPS Calculated: Max hit: ${data.max_hit}, DPS: ${safeFixed(data.dps, 2)}`
      );
    },
    onError: (error: any) => {
      toast.error(`Calculation Failed: ${error.message}`);
      console.error('Calculation error:', error);
    },
  });

  const sanitizeParams = useCallback(
    (p: CalculatorParams): CalculatorParams => {
      const { selected_spell, ...cleaned } = p as any;
      if (!cleaned.target_defence_type) {
        if (p.combat_style === 'melee') {
          cleaned.target_defence_type = `defence_${cleaned.attack_type || 'slash'}`;
        } else if (p.combat_style === 'ranged') {
          cleaned.target_defence_type = 'defence_ranged_standard';
        } else if (p.combat_style === 'magic') {
          cleaned.target_defence_type = 'defence_magic';
        }
      }
      if (p.combat_style === 'magic') {
        delete cleaned.attack_style_bonus_attack;
        delete cleaned.attack_style_bonus_strength;
        cleaned.magic_level = Number(cleaned.magic_level);
        cleaned.magic_boost = Number(cleaned.magic_boost);
        cleaned.magic_prayer = Number(cleaned.magic_prayer);
        cleaned.base_spell_max_hit = Number(cleaned.base_spell_max_hit);
        cleaned.magic_attack_bonus = Number(cleaned.magic_attack_bonus);
        cleaned.magic_damage_bonus = Number(cleaned.magic_damage_bonus);
        cleaned.target_magic_level = Number(cleaned.target_magic_level);
        cleaned.target_magic_defence = Number(cleaned.target_magic_defence);
        cleaned.attack_speed = Number(cleaned.attack_speed);
      }
      if (!cleaned.special_attack_cost) {
        delete cleaned.special_attack_cost;
      }
      if (cleaned.special_multiplier === 1.0) {
        delete cleaned.special_multiplier;
      }
      if (cleaned.special_accuracy_multiplier === 1.0) {
        delete cleaned.special_accuracy_multiplier;
      }
      if (cleaned.special_hit_count === 1) {
        delete cleaned.special_hit_count;
      }
      if (cleaned.special_attack_speed === undefined) {
        delete cleaned.special_attack_speed;
      }
      if (cleaned.special_damage_multiplier === undefined) {
        delete cleaned.special_damage_multiplier;
      }
      if (cleaned.special_accuracy_modifier === undefined) {
        delete cleaned.special_accuracy_modifier;
      }
      if (cleaned.special_energy_cost === undefined) {
        delete cleaned.special_energy_cost;
      }
      if (cleaned.special_regen_rate === 10 / 30) {
        delete cleaned.special_regen_rate;
      }
      if (cleaned.initial_special_energy === 100) {
        delete cleaned.initial_special_energy;
      }
      return cleaned;
    },
    []
  );

  const handleCalculate = useCallback(() => {
    const clean = sanitizeParams(params);
    if (currentLoadout) {
      const specItem = currentLoadout['spec'];
      const twistedBowEquipped =
        (currentLoadout['2h'] &&
          currentLoadout['2h']!.name.toLowerCase().includes('twisted bow')) ||
        (currentLoadout['mainhand'] &&
          currentLoadout['mainhand']!.name.toLowerCase().includes('twisted bow'));
      if (!specItem && twistedBowEquipped && params.combat_style === 'ranged') {
        (clean as any).weapon_name = 'twisted bow';
        if (currentNpcForm?.magic_level) {
          (clean as any).target_magic_level = currentNpcForm.magic_level;
        }
        (clean as any).ranged_attack_bonus = (params as any).ranged_attack_bonus;
        (clean as any).ranged_strength_bonus = (params as any).ranged_strength_bonus;
      }
      const tumekenShadowEquipped =
        (currentLoadout['2h'] &&
          currentLoadout['2h']!.name.toLowerCase().includes('tumeken')) ||
        (currentLoadout['mainhand'] &&
          currentLoadout['mainhand']!.name.toLowerCase().includes('tumeken'));
      if (tumekenShadowEquipped && params.combat_style === 'magic') {
        (clean as any).shadow_bonus = 0.5;
      }
      if (specItem) {
        (clean as any).special_attack_speed =
          specItem.combat_stats?.attack_speed ?? clean.attack_speed;
      }
    }
    calculateMutation.mutate(clean);
  }, [params, currentLoadout, currentNpcForm, calculateMutation, sanitizeParams]);

  const handleReset = () => {
    resetParams();
    resetLocks();
    setResults(null);
    setAppliedPassiveEffects(null);
    setCurrentLoadout({});
    setStoreLoadout({});
    setCurrentNpcForm(null);
    toast.success('Calculator reset to defaults');
  };

  const handleTabChange = (style: CombatStyle) => {
    setActiveTab(style);
    switchCombatStyle(style);
    toast.info(`Switched to ${style} combat style`);
  };

  const handleEquipmentUpdate = (loadout: Record<string, Item | null>) => {
    setCurrentLoadout(loadout);
    setStoreLoadout(loadout);
  };

  const handleNpcUpdate = (npcForm: NpcForm | null) => {
    setCurrentNpcForm(npcForm);
    setStoreNpcForm(npcForm);
  };

  return {
    params,
    results,
    activeTab,
    appliedPassiveEffects,
    currentLoadout,
    currentNpcForm,
    isCalculating: calculateMutation.isPending,
    handleCalculate,
    handleReset,
    handleTabChange,
    handleEquipmentUpdate,
    handleNpcUpdate,
  };
}
