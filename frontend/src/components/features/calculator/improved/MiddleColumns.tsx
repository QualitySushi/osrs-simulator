'use client';
import { Card, CardContent } from '@/components/ui/card';
import { NpcSelector } from '../NpcSelector';
import { EquipmentPanel } from '../EquipmentPanel';
import { PrayerPotionSelector } from '../PrayerPotionSelector';
import RaidScalingPanel, { RaidScalingConfig } from '../../simulation/RaidScalingPanel';
import { DefenceReductionPanel } from '../DefenceReductionPanel';
import { Raid } from '@/types/raid';

interface MiddleColumnsProps {
  onEquipmentUpdate: (slot: string, item: any) => void;
  onSelectForm: (form: any) => void;
  currentNpcForm: any;
  selectedRaid?: Raid;
  raidConfig: RaidScalingConfig;
  onRaidConfigChange: (config: RaidScalingConfig) => void;
}

export function MiddleColumns({
  onEquipmentUpdate,
  onSelectForm,
  currentNpcForm,
  selectedRaid,
  raidConfig,
  onRaidConfigChange,
}: MiddleColumnsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6 flex flex-col">
        <EquipmentPanel
          onEquipmentUpdate={onEquipmentUpdate}
          npcForm={currentNpcForm}
        />
      </div>
      <div className="space-y-6 flex flex-col flex-grow">
        <PrayerPotionSelector />
        <NpcSelector onSelectForm={onSelectForm} />
        {selectedRaid && (
          <RaidScalingPanel raid={selectedRaid} config={raidConfig} onChange={onRaidConfigChange} />
        )}
        <Card className="w-full border">
          <CardContent>
            <DefenceReductionPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MiddleColumns;
