'use client';

import { CombinedEquipmentDisplay } from '@/components/features/calculator/CombinedEquipmentDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCalculatorStore } from '@/store/calculator-store';
import { BossForm, Item, Preset } from '@/types/calculator';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { encodeSeed } from '@/utils/seed';

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
  const [activePreset, setActivePreset] = useState('current');
  const {
    resetParams,
    resetLocks,
    presets,
    addPreset,
    setLoadout,
    setParams,
    switchCombatStyle,
    params,
    loadout,
  } = useCalculatorStore();

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

  const handlePresetChange = (id: string) => {
    setActivePreset(id);
    if (id === 'current') return;
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      switchCombatStyle(preset.params.combat_style as any);
      setParams(preset.params);
      setLoadout(preset.equipment || {});
      setCurrentLoadout(preset.equipment || {});
    }
  };

  const handleAddPreset = () => {
    const name = prompt('Preset name?');
    if (!name) return;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      combatStyle: params.combat_style,
      timestamp: Date.now(),
      params: { ...params },
      equipment: { ...loadout },
      seed: encodeSeed(params, loadout as any),
    };
    addPreset(newPreset);
    setActivePreset(newPreset.id);
    toast.success('Preset saved');
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
        <Tabs value={activePreset} onValueChange={handlePresetChange} className="w-full">
          <TabsList className="mb-4 flex gap-2">
            <TabsTrigger value="current">Current</TabsTrigger>
            {presets.slice(0, 6).map((p) => (
              <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddPreset}">Add preset</Button>
          </TabsList>
          <TabsContent value={activePreset} className="w-full">
            {Object.keys(currentLoadout).length > 0 && (
              <div className="flex justify-center mb-2">
                <Button variant="outline" size="sm" onClick={handleResetEquipment}">
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}