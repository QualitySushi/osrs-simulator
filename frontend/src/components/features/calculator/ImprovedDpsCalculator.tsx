'use client';
import { useEffect, useState } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { useDpsCalculator } from '@/hooks/useDpsCalculator';
import { Raid, RAID_NAME_TO_ID } from '@/types/raid';
import { useCalculatorStore } from '@/store/calculator-store';
import { Header } from './improved/Header';
import { MiddleColumns } from './improved/MiddleColumns';
import { RaidScalingConfig } from '../simulation/RaidScalingPanel';

/**
 * ImprovedDpsCalculator - A redesigned ScapeLab DPS Calculator with better UI flow
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
    handleNpcUpdate,
    isCalculating,
    currentLoadout,
    currentNpcForm,
  } = useDpsCalculator();
  const initData = useReferenceDataStore((s) => s.initData);
  const selectedNpc = useCalculatorStore((s) => s.selectedNpc);
  const [raidConfig, setRaidConfig] = useState<RaidScalingConfig>({ teamSize: 1 });

  const selectedRaid = selectedNpc?.raid_group
    ? RAID_NAME_TO_ID[selectedNpc.raid_group]
    : undefined;

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onReset={handleReset}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
        params={params}
        results={results}
        appliedPassiveEffects={appliedPassiveEffects}
      />

      <MiddleColumns
        onEquipmentUpdate={handleEquipmentUpdate}
        onSelectForm={handleNpcUpdate}
        currentNpcForm={currentNpcForm}
        selectedRaid={selectedRaid}
        raidConfig={raidConfig}
        onRaidConfigChange={setRaidConfig}
      />

    </div>
  );
}

export default ImprovedDpsCalculator;
