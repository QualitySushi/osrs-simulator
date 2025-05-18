'use client';

import { useState } from 'react';
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
import { CombatStyle, CalculatorParams } from '@/app/types/calculator';
import { Badge } from '@/components/ui/badge';

interface PresetSelectorProps {
  onPresetLoad?: () => void;
}

interface Preset {
  id: string;
  name: string;
  combatStyle: CombatStyle;
  timestamp: number;
  params: CalculatorParams;
}

export function PresetSelector({ onPresetLoad }: PresetSelectorProps) {
  const { params, setParams, switchCombatStyle } = useCalculatorStore();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<Preset[]>(() => {
    // Load presets from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedPresets = localStorage.getItem('osrs-dps-presets');
      return savedPresets ? JSON.parse(savedPresets) : [];
    }
    return [];
  });

  // Save current setup as a preset
  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      combatStyle: params.combat_style,
      timestamp: Date.now(),
      params: { ...params }
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-dps-presets', JSON.stringify(updatedPresets));
    }
    
    // Close dialog and reset form
    setSaveDialogOpen(false);
    setPresetName('');
  };

  // Load a preset
  const loadPreset = (preset: Preset) => {
    // Switch combat style first
    switchCombatStyle(preset.params.combat_style as CombatStyle);
    
    // Then set all params
    setParams(preset.params);
    
    // Call callback if provided
    if (onPresetLoad) {
      onPresetLoad();
    }
  };

  // Delete a preset
  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== presetId);
    setPresets(updatedPresets);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-dps-presets', JSON.stringify(updatedPresets));
    }
  };

  // Get formatted date
  const getFormattedDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

// Add these type guards
function isMeleeParams(params: CalculatorParams): params is CalculatorParams & { 
  attack_level: number;
  strength_level: number; 
  melee_attack_bonus: number;
  melee_strength_bonus: number;
} {
  return params.combat_style === 'melee';
}

function isRangedParams(params: CalculatorParams): params is CalculatorParams & {
  ranged_level: number;
  ranged_attack_bonus: number;
  ranged_strength_bonus: number;
} {
  return params.combat_style === 'ranged';
}

function isMagicParams(params: CalculatorParams): params is CalculatorParams & {
  magic_level: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
} {
  return params.combat_style === 'magic';
}

// Get style-specific summary of the preset
const getPresetSummary = (preset: Preset) => {
  const { params } = preset;
  
  if (isMeleeParams(params)) {
    return `ATK: ${params.attack_level}, STR: ${params.strength_level}, ATK Bonus: ${params.melee_attack_bonus}, STR Bonus: ${params.melee_strength_bonus}`;
  } 
  else if (isRangedParams(params)) {
    return `RNG: ${params.ranged_level}, ATK Bonus: ${params.ranged_attack_bonus}, STR Bonus: ${params.ranged_strength_bonus}`;
  } 
  else if (isMagicParams(params)) {
    return `MAG: ${params.magic_level}, ATK Bonus: ${params.magic_attack_bonus}, DMG Bonus: ${(params.magic_damage_bonus * 100).toFixed(0)}%`;
  }
  
  return '';
};

  // Group presets by combat style
  const getMeleePresets = () => presets.filter(p => p.combatStyle === 'melee');
  const getRangedPresets = () => presets.filter(p => p.combatStyle === 'ranged');
  const getMagicPresets = () => presets.filter(p => p.combatStyle === 'magic');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Loadout Presets</CardTitle>
            <CardDescription>Save and load your equipment setups</CardDescription>
          </div>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Current
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
                <div className="space-y-2">
                  <Input
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
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
      </CardHeader>
      <CardContent>
        {presets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven&apos;t saved any presets yet.</p>
            <p className="text-sm">Save your current setup to create a preset.</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="melee">Melee</TabsTrigger>
              <TabsTrigger value="ranged">Ranged</TabsTrigger>
              <TabsTrigger value="magic">Magic</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-2">
              {presets.map(preset => (
                <div 
                  key={preset.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium truncate">{preset.name}</div>
                    <div className="flex gap-2 items-center text-xs text-muted-foreground">
                      <Badge variant="outline">{preset.combatStyle}</Badge>
                      <span className="text-xs">{getFormattedDate(preset.timestamp)}</span>
                    </div>
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
              ))}
            </TabsContent>
            
            <TabsContent value="melee" className="space-y-2">
              {getMeleePresets().length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No melee presets saved</p>
                </div>
              ) : (
                getMeleePresets().map(preset => (
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
                      <Button variant="outline" size="sm" onClick={() => loadPreset(preset)}>
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="ranged" className="space-y-2">
              {getRangedPresets().length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No ranged presets saved</p>
                </div>
              ) : (
                getRangedPresets().map(preset => (
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
                      <Button variant="outline" size="sm" onClick={() => loadPreset(preset)}>
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="magic" className="space-y-2">
              {getMagicPresets().length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No magic presets saved</p>
                </div>
              ) : (
                getMagicPresets().map(preset => (
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
                      <Button variant="outline" size="sm" onClick={() => loadPreset(preset)}>
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}