'use client';
import { Card, CardContent } from '@/components/ui/card';
import { BossSelector } from '../BossSelector';
import { EquipmentPanel } from '../EquipmentPanel';
import { PrayerPotionSelector } from '../PrayerPotionSelector';
import RaidScalingPanel, { RaidScalingConfig } from '../../simulation/RaidScalingPanel';
import { DefenceReductionPanel } from '../DefenceReductionPanel';
import { Raid } from '@/types/raid';

interface MiddleColumnsProps {
  onEquipmentUpdate: (slot: string, item: any) => void;
  onSelectForm: (form: any) => void;
  currentBossForm: any;
  selectedRaid?: Raid;
  raidConfig: RaidScalingConfig;
  onRaidConfigChange: (config: RaidScalingConfig) => void;
}

export function MiddleColumns({
  onEquipmentUpdate,
  onSelectForm,
  currentBossForm,
  selectedRaid,
  raidConfig,
  onRaidConfigChange,
}: MiddleColumnsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6 flex flex-col">
        <EquipmentPanel
          onEquipmentUpdate={onEquipmentUpdate}
          bossForm={currentBossForm}
        />
        <PrayerPotionSelector className="flex-grow" />
      </div>
      <div className="space-y-6 flex flex-col flex-grow">
        <BossSelector onSelectForm={onSelectForm} />
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
