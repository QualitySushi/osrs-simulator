'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle, CalculatorParams } from '@/types/calculator';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  onPresetLoad?: () => void;
  className?: string;
}

interface Preset {
  id: string;
  name: string;
  combatStyle: CombatStyle;
  timestamp: number;
  params: CalculatorParams;
}

export function PresetSelector({ onPresetLoad, className }: PresetSelectorProps) {
  const { params, setParams, switchCombatStyle } = useCalculatorStore();
  const [hasMounted, setHasMounted] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      const savedPresets = localStorage.getItem('osrs-dps-presets');
      setPresets(savedPresets ? JSON.parse(savedPresets) : []);
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      combatStyle: params.combat_style,
      timestamp: Date.now(),
      params: { ...params },
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-dps-presets', JSON.stringify(updatedPresets));
    }
    setSaveDialogOpen(false);
    setPresetName('');
  };

  const loadPreset = (preset: Preset) => {
    switchCombatStyle(preset.params.combat_style);
    setParams(preset.params);
    onPresetLoad?.();
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== presetId);
    setPresets(updatedPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-dps-presets', JSON.stringify(updatedPresets));
    }
  };

  const getFormattedDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getPresetSummary = (preset: Preset) => {
    const { params } = preset;
    if (params.combat_style === 'melee') {
      return `ATK: ${params.attack_level}, STR: ${params.strength_level}, ATK Bonus: ${params.melee_attack_bonus}, STR Bonus: ${params.melee_strength_bonus}`;
    } else if (params.combat_style === 'ranged') {
      return `RNG: ${params.ranged_level}, ATK Bonus: ${params.ranged_attack_bonus}, STR Bonus: ${params.ranged_strength_bonus}`;
    } else if (params.combat_style === 'magic') {
      return `MAG: ${params.magic_level}, ATK Bonus: ${params.magic_attack_bonus}, DMG Bonus: ${(params.magic_damage_bonus * 100).toFixed(0)}%`;
    }
    return '';
  };

  const groupedPresets = {
    all: presets,
    melee: presets.filter(p => p.combatStyle === 'melee'),
    ranged: presets.filter(p => p.combatStyle === 'ranged'),
    magic: presets.filter(p => p.combatStyle === 'magic'),
  };

  if (!hasMounted) return null;

  return (
    <Card className={cn('w-full flex flex-col', className)}>
      <CardHeader>
        <CardTitle>Loadout Presets</CardTitle>
        <CardDescription>Save and load your equipment setups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Loadout Preset</DialogTitle>
                <DialogDescription>
                  Give your preset a name to save your current setup
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <div className="text-sm">
                  <p>Combat Style: <Badge>{params.combat_style}</Badge></p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={savePreset} disabled={!presetName.trim()}>
                  Save Preset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {presets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven&apos;t saved any presets yet.</p>
            <p className="text-sm">Save your current setup to create a preset.</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-4 mb-4 align-middle w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="melee">Melee</TabsTrigger>
              <TabsTrigger value="ranged">Ranged</TabsTrigger>
              <TabsTrigger value="magic">Magic</TabsTrigger>
            </TabsList>
            {Object.entries(groupedPresets).map(([key, group]) => (
              <TabsContent key={key} value={key} className="space-y-2">
                {group.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No {key} presets saved</p>
                  </div>
                ) : (
                  group.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">{getFormattedDate(preset.timestamp)}</div>
                        <div className="text-xs truncate">{getPresetSummary(preset)}</div>
                      </div>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => loadPreset(preset)}>
                                Load
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Load this preset</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this preset</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
