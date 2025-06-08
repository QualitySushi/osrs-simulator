'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RotateCcw } from 'lucide-react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
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
import { Boss, BossForm } from '@/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DirectBossSelectorProps {
  onSelectBoss?: (boss: Boss) => void;
  onSelectForm?: (form: BossForm | null) => void;
}

export function DirectBossSelector({ onSelectBoss, onSelectForm }: DirectBossSelectorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [selectedForm, setSelectedForm] = useState<BossForm | null>(null);
  const [bossIcons, setBossIcons] = useState<Record<number, string>>({});
  const { params, setParams, lockBoss, unlockBoss, bossLocked } = useCalculatorStore();
  const { toast } = useToast();
  const commandRef = useRef<HTMLDivElement>(null);
  
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

  // Fetch icons for all bosses
  useEffect(() => {
    if (!bosses) return;
    const map: Record<number, string> = {};
    bosses.forEach((b) => {
      if (b.icon_url) {
        map[b.id] = b.icon_url;
      }
    });
    setBossIcons(map);
  }, [bosses]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setSearchOpen(false);
    setSearchQuery(boss.name);

    if (onSelectBoss) {
      onSelectBoss(boss);
    }
  };

  // Handle form selection and update calculator params
  const handleSelectForm = (form: BossForm) => {
    setSelectedForm(form);

    // Update the calculator params with the selected boss's defense stats
    const combatStyle = params.combat_style;
    
    if (combatStyle === 'melee') {
      // For melee combat style, use the defence level and appropriate defense bonus
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
    } 
    else if (combatStyle === 'ranged') {
      setParams({
        target_defence_level: form.defence_level || 1,
        target_defence_bonus: form.defence_ranged_standard || 0,
        original_defence_level: form.defence_level || 1,
        target_defence_type: 'defence_ranged_standard'
      });
    } 
    else if (combatStyle === 'magic') {
      setParams({
        target_magic_level: form.magic_level || 1,
        target_magic_defence: form.defence_magic || 0,
        target_defence_level: form.defence_level || 1,
        target_defence_bonus: form.defence_magic || 0,
        original_defence_level: form.defence_level || 1,
        target_defence_type: 'defence_magic'
      });
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
    setSearchQuery('');
    
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
        <CardTitle>Target Selection</CardTitle>
        <CardDescription>Select a boss to calculate DPS against</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bossLocked && (
          <Alert className="mb-4">
            <AlertDescription>
              Target stats from boss are being used. Manual target stat inputs are disabled.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Direct search input without dropdown button */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Boss</label>
          <div className="relative" ref={commandRef}>
            {selectedBoss && (
              <img
                src={bossIcons[selectedBoss.id]}
                alt="icon"
                className="w-5 h-5 absolute top-2 left-2"
              />
            )}
            <Command className="rounded-lg border shadow-md pl-7">
              <CommandInput
                placeholder="Search bosses..."
                className="h-9 pl-2"
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value);
                  setSearchOpen(!!value.trim());
                }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchOpen && (
                <CommandList>
                  <CommandEmpty>No boss found.</CommandEmpty>
                  <CommandGroup>
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
                          className="cursor-pointer"
                        >
                          <img
                            src={bossIcons[boss.id]}
                            alt="icon"
                            className="w-4 h-4 mr-2 inline-block"
                          />
                          <span>{boss.name}</span>
                          {boss.raid_group && (
                            <Badge variant="outline" className="ml-2">
                              {boss.raid_group}
                            </Badge>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </div>
        </div>

        {/* Form selector */}
        {selectedBoss && bossDetails?.forms && bossDetails.forms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Form/Phase</label>
              <Button variant="outline" size="sm" onClick={handleResetBoss}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
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
                      {form.form_name || `${bossDetails.name} (${form.combat_level || 'Unknown'})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Display the selected boss stats */}
        {selectedForm && (
          <div className="pt-2 space-y-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-md flex flex-col items-center">
            {(selectedForm.icons?.[0] || selectedForm.image_url) && (
              <img
                src={selectedForm.icons?.[0] || selectedForm.image_url}
                alt="icon"
                className="w-28 h-auto mb-2 object-contain"
              />
            )}
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