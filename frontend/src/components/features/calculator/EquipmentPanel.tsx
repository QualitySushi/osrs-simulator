'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BossForm, Item } from '@/types/calculator';
import { LoadoutTabs } from './LoadoutTabs';

interface EquipmentPanelProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
  bossForm?: BossForm | null;
}

/**
 * Equipment panel that wraps the LoadoutTabs with a consistent card style
 */
export function EquipmentPanel({ onEquipmentUpdate, bossForm }: EquipmentPanelProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>Configure your gear and attack style</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <LoadoutTabs bossForm={bossForm} onEquipmentUpdate={onEquipmentUpdate} />
      </CardContent>
    </Card>
  );
}

export default EquipmentPanel;
