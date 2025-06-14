'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RotateCcw } from 'lucide-react';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
import { Command as CommandPrimitive } from 'cmdk';
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
import { useDebounce } from '@/hooks/useDebounce';
import { npcsApi } from '@/services/api';
import { NpcSummary, NpcForm, MeleeCalculatorParams, RangedCalculatorParams, MagicCalculatorParams } from '@/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReferenceDataStore } from '@/store/reference-data-store';

// Helper to normalize npc names and remove variant markers
const canonicalName = (name: string) =>
  name
    .split('#')[0]
    .replace(/\([^)]*\)/g, '')
    .trim();

const canonicalKey = (name: string) => canonicalName(name).toLowerCase();

const dedupeNpcs = (npcs: NpcSummary[]): NpcSummary[] => {
  const seen = new Map<string, NpcSummary>();
  for (const npc of npcs) {
    const clean = canonicalName(npc.name);
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...npc, name: clean });
    }
  }
  return Array.from(seen.values());
};

interface NpcSelectorProps {
  onSelectNpc?: (npc: NpcSummary) => void;
  onSelectForm?: (form: NpcForm | null) => void;
}

export function NpcSelector({ onSelectNpc, onSelectForm }: NpcSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedNpc = useCalculatorStore((s) => s.selectedNpc);
  const setSelectedNpc = useCalculatorStore((s) => s.setSelectedNpc);
  const selectedForm = useCalculatorStore((s) => s.selectedNpcForm);
  const setSelectedForm = useCalculatorStore((s) => s.setSelectedNpcForm);
  const storeNpcs = useReferenceDataStore((s) => s.npcs);
  const storeNpcForms = useReferenceDataStore((s) => s.npcForms);
  const initData = useReferenceDataStore((s) => s.initData);
  const addNpces = useReferenceDataStore((s) => s.addNpces);
  const addNpcForms = useReferenceDataStore((s) => s.addNpcForms);
  const { params, setParams, lockNpc, unlockNpc, npcLocked } = useCalculatorStore();
  const { toast } = useToast();

  useEffect(() => {
    initData();
  }, [initData]);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const initialLoading = storeNpcs.length === 0 && searchTerm.length === 0;

  const {
    data: searchResults,
    isLoading,
  } = useQuery({
    queryKey: ['npc-search', debouncedSearch],
    queryFn: () => npcsApi.searchNpces(debouncedSearch),
    enabled: debouncedSearch.length > 0,
    staleTime: Infinity,
    onSuccess: (d) => addNpces(d),
    onError: (e: any) => toast.error(`Npc search failed: ${e.message}`),
  });

  // Fetch specific npc details when a npc is selected
  const { data: npcDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['npc', selectedNpc?.id],
    queryFn: () => selectedNpc ? npcsApi.getNpcById(selectedNpc.id) : null,
    enabled: !!selectedNpc && !storeNpcForms[selectedNpc!.id],
    staleTime: Infinity,
    onSuccess: (d) => addNpcForms(d.id, d.forms || []),
    onError: (e: any) => toast.error(`Failed to load npc: ${e.message}`),
  });

  const combinedNpcDetails = selectedNpc
    ? { ...selectedNpc, forms: storeNpcForms[selectedNpc.id] ?? npcDetails?.forms }
    : null;

  const rangedWeakness = selectedForm &&
    typeof selectedForm.defence_ranged_light === 'number' &&
    typeof selectedForm.defence_ranged_heavy === 'number'
      ? selectedForm.defence_ranged_light < selectedForm.defence_ranged_heavy
        ? 'Light'
        : selectedForm.defence_ranged_heavy < selectedForm.defence_ranged_light
          ? 'Heavy'
          : undefined
      : undefined;


  // Effect to clean up when combat style changes or component unmounts
  useEffect(() => {
    return () => {
      // Ensure we're not leaving stale npc locked state on unmount
      if (!selectedForm) {
        unlockNpc();
      }
    };
  }, [unlockNpc, selectedForm]);

  // Handle npc selection
  const handleSelectNpc = (npc: NpcSummary) => {
    setSelectedNpc(npc);
    setSelectedForm(null);
    setOpen(false);

    if (onSelectNpc) {
      onSelectNpc(npc);
    }
  };

  // Handle form selection and update calculator params
  const handleSelectForm = (form: NpcForm) => {
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

    // Update the calculator params with the selected npc's defense stats
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
            console.log('[DEBUG] Verified melee npc stats after update:', {
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
            console.log('[DEBUG] Verified ranged npc stats after update:', {
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
            console.log('[DEBUG] Verified magic npc stats after update:', {
              target_magic_level: magicParams.target_magic_level,
              target_magic_defence: magicParams.target_magic_defence,
              target_defence_type: magicParams.target_defence_type
            });
          }
        }
      }, 0);
    }

    // Lock npc inputs
    lockNpc();
    
    // Show success notification
    toast.success(`Target stats updated: ${form.form_name || form.npc_id}`);

    if (onSelectForm) {
      onSelectForm(form);
    }
  };

  // Reset npc selection
  const handleResetNpc = () => {
    setSelectedNpc(null);
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
    
    unlockNpc();
    
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
        <CardDescription>Select a npc to calculate DPS against</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {npcLocked && (
          <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
            <AlertDescription>
              Target stats from npc are being used. Manual target stat inputs are disabled.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Npc selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Npc</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedNpc ? selectedNpc.name : "Select a npc..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <div className="flex h-9 items-center gap-2 border-b px-3">
                  <CommandPrimitive.Input
                    placeholder="Search npcs..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <CommandEmpty>No npc found.</CommandEmpty>
                <CommandGroup>
                  <CommandList>
                    {isLoading && searchTerm ? (
                      <div className="flex items-center justify-center p-4">
                        <LogoSpinner className="mr-2 h-4 w-4" />
                        Loading...
                      </div>
                    ) : (
                      dedupeNpcs(
                        searchTerm.length > 0 ? searchResults ?? [] : storeNpcs
                      ).map((npc) => (
                        <CommandItem
                          key={npc.id}
                          value={npc.name}
                          onSelect={() => handleSelectNpc(npc)}
                        >
                          {npc.name}
                          {npc.raid_group && (
                            <Badge variant="outline" className="ml-2">
                              {npc.raid_group}
                            </Badge>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandList>
                  { (isLoading && !searchTerm) || initialLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <LogoSpinner className="mr-2 h-4 w-4" />
                    </div>
                  ) : null}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Form selector */}
        {selectedNpc && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Form/Phase</label>
            {isLoadingDetails ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <LogoSpinner className="mr-2 h-4 w-4" />
                Loading npc details...
              </div>
            ) : (<div className="flex items-center gap-2">
                <Select
                  value={selectedForm?.id.toString() || ''}
                  onValueChange={(value: string) => {
                      const form = combinedNpcDetails?.forms?.find(f => f.id.toString() === value);
                      if (form) {
                          handleSelectForm(form);
                      }
                  }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a form/phase" />
                </SelectTrigger>
                <SelectContent>
                  {(combinedNpcDetails?.forms ?? []).map((form) => (
                    <SelectItem key={form.id} value={form.id.toString()}>
                      {form.form_name} (Combat Lvl: {form.combat_level || 'Unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                <Button variant="outline" size="sm" onClick={handleResetNpc}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Display the selected npc stats if a form is selected */}
        {selectedForm && (
          <div className="pt-2 space-y-2 flex flex-col items-center">
            {(selectedForm.icons?.[0] || selectedForm.image_url) && (
              <img
                src={selectedForm.icons?.[0] || selectedForm.image_url}
                alt={`${selectedForm.form_name} image`}
                className="w-24 h-auto object-contain"
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
              {selectedForm.elemental_weakness_type && (
                <div>
                  <span className="text-muted-foreground">Magic Weakness:</span>{' '}
                  <span className="font-medium">
                    {selectedForm.elemental_weakness_type}
                    {selectedForm.elemental_weakness_percent ? ` (${selectedForm.elemental_weakness_percent}%)` : ''}
                  </span>
                </div>
              )}
              {rangedWeakness && (
                <div>
                  <span className="text-muted-foreground">Ranged Weakness:</span>{' '}
                  <span className="font-medium">{rangedWeakness}</span>
                </div>
              )}
              
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
                  <div>
                    <span className="text-xs text-muted-foreground">Size:</span>{' '}
                    <span className="text-xs font-medium">
                      {selectedForm.size ?? 'Unknown'}
                    </span>
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