'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { BossSelector } from './BossSelector';
import { EquipmentPanel } from './EquipmentPanel';
import { PrayerPotionSelector } from './PrayerPotionSelector';
import { CalculatorForms } from './CalculatorForms';
import { CombatStyleTabs } from './CombatStyleTabs';
import { DpsResultDisplay } from './DpsResultDisplay';
import { useDpsCalculator } from '@/hooks/useDpsCalculator';
import { calculatorApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

/**
 * BestInSlotCalculator - A stripped-down DPS Calculator focused on
 * suggesting optimal equipment setups.
 * This component improves on the original by:
 * - Creating a consistent layout with proper alignment
 * - Balancing the height between columns
 * - Using a logical grouping of related components
 * - Providing better visual hierarchy and readability
 */
export function BestInSlotCalculator() {
  const {
    params,
    results,
    activeTab,
    appliedPassiveEffects,
    handleReset,
    handleTabChange,
    handleEquipmentUpdate,
    handleBossUpdate,
    currentBossForm,
  } = useDpsCalculator();
  const initData = useReferenceDataStore((s) => s.initData);
  const { toast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const sanitizeParams = useCallback((p: any): any => {
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
    if (!cleaned.special_attack_cost) delete cleaned.special_attack_cost;
    if (cleaned.special_multiplier === 1.0) delete cleaned.special_multiplier;
    if (cleaned.special_accuracy_multiplier === 1.0)
      delete cleaned.special_accuracy_multiplier;
    if (cleaned.special_hit_count === 1) delete cleaned.special_hit_count;
    if (cleaned.special_attack_speed === undefined)
      delete cleaned.special_attack_speed;
    if (cleaned.special_damage_multiplier === undefined)
      delete cleaned.special_damage_multiplier;
    if (cleaned.special_accuracy_modifier === undefined)
      delete cleaned.special_accuracy_modifier;
    if (cleaned.special_energy_cost === undefined) delete cleaned.special_energy_cost;
    if (cleaned.special_regen_rate === 10 / 30) delete cleaned.special_regen_rate;
    if (cleaned.initial_special_energy === 100) delete cleaned.initial_special_energy;
    return cleaned;
  }, []);

  const handleSuggestBis = async () => {
    setIsSuggesting(true);
    try {
      toast.info('Fetching best-in-slot setup...');
      const clean = sanitizeParams(params);
      const setup = await calculatorApi.getBis(clean);
      handleEquipmentUpdate(setup);
      toast.success('Best-in-slot setup applied');
    } catch (e: any) {
      toast.error(`Failed to fetch BIS: ${e.message}`);
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    initData();
  }, [initData]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16">
      {" "}
      {/* Added significant bottom padding */}
      {/* Main calculator header card */}
      <Card className="w-full bg-card border border-border shadow-md">
        <CardHeader className="border-b border-border pb-4 flex flex-row justify-between items-center">
          <CombatStyleTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onReset={handleReset}
          />
        </CardHeader>

        <CardContent className="pt-6">
          <Alert className="mb-6 bg-muted/40">
            <Info className="h-5 w-5 mr-2 text-primary" />
            <AlertDescription>
              Select your combat style, equipment, prayers, and target to
              calculate optimal DPS setup.
            </AlertDescription>
          </Alert>

          <CalculatorForms
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onSuggestBis={handleSuggestBis}
            isCalculating={isSuggesting}
          />

          {results && (
            <DpsResultDisplay
              params={params}
              results={results}
              appliedPassiveEffects={appliedPassiveEffects}
            />
          )}
        </CardContent>
      </Card>
      {/* Two-column layout for middle sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6 flex flex-col">
          {/* Character equipment section */}
          <EquipmentPanel
            onEquipmentUpdate={handleEquipmentUpdate}
            bossForm={currentBossForm}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6 flex flex-col flex-grow">
          {/* Prayer/Potion selector */}
          <PrayerPotionSelector />
          {/* Target selection section */}
          <BossSelector onSelectForm={handleBossUpdate} />
        </div>
      </div>
    </div>
  );
}

export default BestInSlotCalculator;
