'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { BossSelector } from './BossSelector';
import { CombinedEquipmentDisplay } from './CombinedEquipmentDisplay';
import { DpsComparison } from './DpsComparison';
import { PrayerPotionSelector } from './PrayerPotionSelector';
import PassiveEffectsDisplay from './PassiveEffectsDisplay';
import { DefenceReductionPanel } from './DefenceReductionPanel';
import { PresetSelector } from './PresetSelector';
import { CalculatorForms } from './CalculatorForms';
import { CombatStyleTabs } from './CombatStyleTabs';
import { DpsResultDisplay } from './DpsResultDisplay';
import { useDpsCalculator } from '@/hooks/useDpsCalculator';
import { useToast } from '@/hooks/use-toast';
import RaidScalingPanel, { Raid, RaidScalingConfig } from '../simulation/RaidScalingPanel';
import { useCalculatorStore } from '@/store/calculator-store';

/**
 * ImprovedDpsCalculator - A redesigned OSRS DPS Calculator with better UI flow
 * This component improves on the original by:
 * - Creating a consistent layout with proper alignment
 * - Balancing the height between columns
 * - Using a logical grouping of related components
 * - Providing better visual hierarchy and readability
 */
export function ImprovedDpsCalculator() {
  const {
    params,
    results,
    activeTab,
    appliedPassiveEffects,
    handleCalculate,
    handleReset,
    handleTabChange,
    handleEquipmentUpdate,
    handleBossUpdate,
    isCalculating,
    currentLoadout,
    currentBossForm,
  } = useDpsCalculator();
  const initData = useReferenceDataStore((s) => s.initData);
  const selectedBoss = useCalculatorStore((s) => s.selectedBoss);
  const [raidConfig, setRaidConfig] = useState<RaidScalingConfig>({ teamSize: 1 });

  const RAID_NAME_TO_ID: Record<string, Raid> = {
    'Chambers of Xeric': 'cox',
    'Theatre of Blood': 'tob',
    'Tombs of Amascut': 'toa',
  };

  const selectedRaid = selectedBoss?.raid_group
    ? RAID_NAME_TO_ID[selectedBoss.raid_group]
    : undefined;

  useEffect(() => {
    initData();
  }, [initData]);
  const { toast } = useToast();


  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16"> {/* Added significant bottom padding */}
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
              Select your combat style, equipment, prayers, and target to calculate optimal DPS setup.
            </AlertDescription>
          </Alert>
          
          
          <CalculatorForms
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
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

      {Object.keys(currentLoadout).length > 0 && (
        <PassiveEffectsDisplay
          loadout={currentLoadout}
          target={currentBossForm}
        />
      )}

      {/* Two-column layout for middle sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6 flex flex-col">
          {/* Character equipment section */}
          <CombinedEquipmentDisplay onEquipmentUpdate={handleEquipmentUpdate} bossForm={currentBossForm} />
          {/* Prayer/Potion selector */}
          <PrayerPotionSelector className="flex-grow" />
        </div>

        {/* Right column */}
        <div className="space-y-6 flex flex-col flex-grow">
          {/* Target selection section */}
          <BossSelector onSelectForm={handleBossUpdate} />
          {selectedRaid && (
            <RaidScalingPanel
              raid={selectedRaid}
              config={raidConfig}
              onChange={setRaidConfig}
            />
          )}
          
          {/* Defensive reductions panel - with contained height */}
          <Card className="w-full border">
            <CardContent>
              <DefenceReductionPanel />
            </CardContent>
          </Card>

        </div>
        {/* Bottom row: DPS comparison and loadout presets */}
        <DpsComparison />
        <PresetSelector
          className="flex-grow"
          onPresetLoad={() => toast.success("Preset loaded successfully!")}
        />
      </div>
      
    </div>
  );
}

export default ImprovedDpsCalculator;
