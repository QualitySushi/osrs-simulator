'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, RotateCcw } from 'lucide-react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { bossesApi } from '@/services/api';
import { Boss, BossForm, MeleeCalculatorParams, RangedCalculatorParams, MagicCalculatorParams } from '@/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BossSelectorProps {
  onSelectBoss?: (boss: Boss) => void;
  onSelectForm?: (form: BossForm | null) => void;
}

export function BossSelector({ onSelectBoss, onSelectForm }: BossSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [selectedForm, setSelectedForm] = useState<BossForm | null>(null);
  const { params, setParams, lockBoss, unlockBoss, bossLocked } = useCalculatorStore();
  const { toast } = useToast();
  
  // Fetch all bosses
  const { data: bosses, isLoading } = useQuery({
    queryKey: ['bosses'],
    queryFn: bossesApi.getAllBosses,
    staleTime: Infinity,
  });

  // Fetch specific boss details when a boss is selected
  const { data: bossDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['boss', selectedBoss?.id],
    queryFn: () => selectedBoss ? bossesApi.getBossById(selectedBoss.id) : null,
    enabled: !!selectedBoss,
    staleTime: Infinity,
  });

  // Effect to clean up when combat style changes or component unmounts
  useEffect(() => {
    return () => {
      // Ensure we're not leaving stale boss locked state on unmount
      if (!selectedForm) {
        unlockBoss();
      }
    };
  }, [unlockBoss, selectedForm]);

  // Handle boss selection
  const handleSelectBoss = (boss: Boss) => {
    setSelectedBoss(boss);
    setSelectedForm(null);
    setOpen(false);

    if (onSelectBoss) {
      onSelectBoss(boss);
    }
  };

  // Handle form selection and update calculator params
  const handleSelectForm = (form: BossForm) => {
    setSelectedForm(form);

    // Log the values before update
    if (params.combat_style === 'melee') {
      const meleeParams = params as MeleeCalculatorParams;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Before update - Melee target params:', {
          current_defence_level: meleeParams.target_defence_level,
          current_defence_bonus: meleeParams.target_defence_bonus
        });
      }
    }
    else if (params.combat_style === 'ranged') {
      const rangedParams = params as RangedCalculatorParams;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Before update - Ranged target params:', {
          current_defence_level: rangedParams.target_defence_level,
          current_ranged_defence_bonus: rangedParams.target_defence_bonus
        });
      }
    }
    else if (params.combat_style === 'magic') {
      const magicParams = params as MagicCalculatorParams;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Before update - Magic target params:', {
          current_magic_level: magicParams.target_magic_level,
          current_magic_defence: magicParams.target_magic_defence
        });
      }
    }

    // Update the calculator params with the selected boss's defense stats
    const combatStyle = params.combat_style;
    
    if (combatStyle === 'melee') {
      // For melee combat style, use the defence level and appropriate defense bonus
      // Choose the lowest defense bonus for optimal damage (stab/slash/crush)
      let defenceBonus = 0;
      let target_defence_type = '';
      const storeParams = useCalculatorStore.getState().params;
      const atkType =
        storeParams.combat_style === 'melee' && 'attack_type' in storeParams
          ? storeParams.attack_type
          : 'slash';

      if (atkType === 'stab') {
        defenceBonus = form.defence_stab ?? 0;
        target_defence_type = 'defence_stab';
      } else if (atkType === 'slash') {
        defenceBonus = form.defence_slash ?? 0;
        target_defence_type = 'defence_slash';
      } else if (atkType === 'crush') {
        defenceBonus = form.defence_crush ?? 0;
        target_defence_type = 'defence_crush';
      }
      
      setParams({
        target_defence_level: form.defence_level || 1,
        target_defence_bonus: defenceBonus,
        original_defence_level: form.defence_level || 1,
        target_defence_type: target_defence_type
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Updated melee target stats:', {
          defence_level: form.defence_level,
          defence_bonus: defenceBonus,
          target_defence_type: target_defence_type
        });
      }
      
      // Verify the update
      setTimeout(() => {
        const currentParams = useCalculatorStore.getState().params;
        if (currentParams.combat_style === 'melee') {
          const meleeParams = currentParams as MeleeCalculatorParams;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Verified melee boss stats after update:', {
              target_defence_level: meleeParams.target_defence_level,
              target_defence_bonus: meleeParams.target_defence_bonus,
              target_defence_type: meleeParams.target_defence_type
            });
          }
        }
      }, 0);
    } 
    else if (combatStyle === 'ranged') {
      setParams({
        target_defence_level: form.defence_level || 1,
        target_defence_bonus: form.defence_ranged_standard || 0,
        original_defence_level: form.defence_level || 1,
        target_defence_type: 'defence_ranged_standard'
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Updated ranged target stats:', {
          defence_level: form.defence_level,
          ranged_defence_bonus: form.defence_ranged_standard,
          target_defence_type: 'defence_ranged_standard'
        });
      }
      
      // Verify the update
      setTimeout(() => {
        const currentParams = useCalculatorStore.getState().params;
        if (currentParams.combat_style === 'ranged') {
          const rangedParams = currentParams as RangedCalculatorParams;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Verified ranged boss stats after update:', {
              target_defence_level: rangedParams.target_defence_level,
              target_defence_bonus: rangedParams.target_defence_bonus,
              target_defence_type: rangedParams.target_defence_type
            });
          }
        }
      }, 0);
    } 
    else if (combatStyle === 'magic') {
      setParams({
        target_magic_level: form.magic_level || 1,
        target_magic_defence: form.defence_magic || 0,
        target_defence_level: form.defence_level || 1,
        target_defence_bonus: form.defence_magic || 0, // use magic defence as fallback
        original_defence_level: form.defence_level || 1,
        target_defence_type: 'defence_magic'
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Updated magic target stats:', {
          magic_level: form.magic_level,
          magic_defence: form.defence_magic,
          target_defence_type: 'defence_magic'
        });
      }
      
      // Verify the update
      setTimeout(() => {
        const currentParams = useCalculatorStore.getState().params;
        if (currentParams.combat_style === 'magic') {
          const magicParams = currentParams as MagicCalculatorParams;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Verified magic boss stats after update:', {
              target_magic_level: magicParams.target_magic_level,
              target_magic_defence: magicParams.target_magic_defence,
              target_defence_type: magicParams.target_defence_type
            });
          }
        }
      }, 0);
    }

    // Lock boss inputs
    lockBoss();
    
    // Show success notification
    toast.success(`Target stats updated: ${form.form_name || form.boss_id}`);

    if (onSelectForm) {
      onSelectForm(form);
    }
  };

  // Reset boss selection
  const handleResetBoss = () => {
    setSelectedBoss(null);
    setSelectedForm(null);
    
    // Reset the defense parameters to default values based on combat style
    if (params.combat_style === 'melee') {
      setParams({
        target_defence_level: 1,
        target_defence_bonus: 0,
        target_defence_type: 'defence_slash' // Default to slash
      });
    } 
    else if (params.combat_style === 'ranged') {
      setParams({
        target_defence_level: 1,
        target_defence_bonus: 0,
        target_defence_type: 'defence_ranged_standard'
      });
    } 
    else if (params.combat_style === 'magic') {
      setParams({
        target_magic_level: 1,
        target_magic_defence: 0,
        target_defence_type: 'defence_magic'
      });
    }
    
    unlockBoss();
    
    // Show toast notification
    toast.info("Target selection reset");
    
    // Notify parent that form is reset
    if (onSelectForm) {
      onSelectForm(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Target Selection</CardTitle>
            <CardDescription>Select a boss to calculate DPS against</CardDescription>
          </div>
          {selectedBoss && (
            <Button variant="outline" size="sm" onClick={handleResetBoss}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bossLocked && (
          <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
            <AlertDescription>
              Target stats from boss are being used. Manual target stat inputs are disabled.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Boss selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Boss</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedBoss ? selectedBoss.name : "Select a boss..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search bosses..." className="h-9" />
                <CommandEmpty>No boss found.</CommandEmpty>
                <CommandGroup>
                  <CommandList>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      bosses?.map((boss) => (
                        <CommandItem
                          key={boss.id}
                          value={boss.name}
                          onSelect={() => handleSelectBoss(boss)}
                        >
                          {boss.name}
                          {boss.raid_group && (
                            <Badge variant="outline" className="ml-2">
                              {boss.raid_group}
                            </Badge>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Form selector (if the boss has multiple forms) */}
        {selectedBoss && bossDetails?.forms && bossDetails.forms.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Form/Phase</label>
            {isLoadingDetails ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading boss details...
              </div>
            ) : (
              <Select
                value={selectedForm?.id.toString() || ''}
                onValueChange={(value: string) => {
                    const form = bossDetails?.forms?.find(f => f.id.toString() === value);
                    if (form) {
                        handleSelectForm(form);
                    }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a form/phase" />
                </SelectTrigger>
                <SelectContent>
                  {bossDetails.forms.map((form) => (
                    <SelectItem key={form.id} value={form.id.toString()}>
                      {form.form_name} (Combat Lvl: {form.combat_level || 'Unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Display the selected boss stats if a form is selected */}
        {selectedForm && (
          <div className="pt-2 space-y-2">
            <h4 className="text-sm font-semibold">Target Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Combat Level:</span>{' '}
                <span className="font-medium">{selectedForm.combat_level || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hitpoints:</span>{' '}
                <span className="font-medium">{selectedForm.hitpoints || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Defence Level:</span>{' '}
                <span className="font-medium">{selectedForm.defence_level || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Magic Level:</span>{' '}
                <span className="font-medium">{selectedForm.magic_level || 'Unknown'}</span>
              </div>
              
              <div className="col-span-2 mt-1">
                <h5 className="text-xs font-semibold mb-1">Defence Bonuses</h5>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                  <div>
                    <span className="text-xs text-muted-foreground">Stab:</span>{' '}
                    <span className="text-xs font-medium">{selectedForm.defence_stab ?? '0'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Slash:</span>{' '}
                    <span className="text-xs font-medium">{selectedForm.defence_slash ?? '0'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Crush:</span>{' '}
                    <span className="text-xs font-medium">{selectedForm.defence_crush ?? '0'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Magic:</span>{' '}
                    <span className="text-xs font-medium">{selectedForm.defence_magic ?? '0'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Ranged:</span>{' '}
                    <span className="text-xs font-medium">{selectedForm.defence_ranged_standard ?? '0'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}