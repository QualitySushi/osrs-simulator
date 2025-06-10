'use client';

import { CombinedEquipmentDisplay } from '@/components/features/calculator/CombinedEquipmentDisplay';
import { SpecialAttackWeaponSelector } from './SpecialAttackWeaponSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCalculatorStore } from '@/store/calculator-store';
import { BossForm, Item } from '@/types/calculator';
import { useState } from 'react';

interface EquipmentPanelProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
  bossForm?: BossForm | null;
}

/**
 * Equipment panel that wraps the CombinedEquipmentDisplay with a consistent card style
 * and adds reset functionality
 */
export function EquipmentPanel({ onEquipmentUpdate, bossForm }: EquipmentPanelProps) {
  const { toast } = useToast();
  const [currentLoadout, setCurrentLoadout] = useState<Record<string, Item | null>>({});
  const { resetParams, resetLocks } = useCalculatorStore();

  const handleResetEquipment = () => {
    // Reset the local loadout state
    setCurrentLoadout({});
    
    // Reset the calculator parameters
    resetParams();
    resetLocks();
    
    // Notify parent that equipment was reset
    if (onEquipmentUpdate) {
      onEquipmentUpdate({});
    }
    
    toast.success("Equipment reset to defaults");
  };

  const handleEquipmentUpdate = (loadout: Record<string, Item | null>) => {
    setCurrentLoadout(loadout);
    
    if (onEquipmentUpdate) {
      onEquipmentUpdate(loadout);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>Configure your gear and attack style</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {Object.keys(currentLoadout).length > 0 && (
          <div className="flex justify-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetEquipment}
            >
              Reset Equipment
            </Button>
          </div>
        )}
        {Object.keys(currentLoadout).length === 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              Select equipment to calculate DPS with specific gear bonuses.
            </AlertDescription>
          </Alert>
        )}
        
        <CombinedEquipmentDisplay
          onEquipmentUpdate={handleEquipmentUpdate}
          bossForm={bossForm}
        />
        <SpecialAttackWeaponSelector />
      </CardContent>
    </Card>
  );
}