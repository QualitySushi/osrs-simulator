'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NpcForm, Item } from '@/types/calculator';
import { LoadoutTabs } from './LoadoutTabs';

interface EquipmentPanelProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
  npcForm?: NpcForm | null;
}

/**
 * Equipment panel that wraps the LoadoutTabs with a consistent card style
 */
export function EquipmentPanel({ onEquipmentUpdate, npcForm }: EquipmentPanelProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-col items-center pb-2 text-center">
        <CardTitle>Equipment</CardTitle>
        <CardDescription>Configure your gear and attack style</CardDescription>
      </CardHeader>
      <CardContent>
        <LoadoutTabs npcForm={npcForm} onEquipmentUpdate={onEquipmentUpdate} />
      </CardContent>
    </Card>
  );
}

export default EquipmentPanel;
