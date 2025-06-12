'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
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
import { useDebounce } from '@/hooks/useDebounce';
import { npcsApi } from '@/services/api';
import { Npc, NpcSummary, NpcForm } from '@/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { cn } from '@/lib/utils';

// Helper to normalize npc names and remove variant markers
const canonicalName = (name: string) =>
  name
    .split('#')[0]
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase();

const dedupeNpcs = (npcs: NpcSummary[]): NpcSummary[] => {
  const seen = new Map<string, NpcSummary>();
  for (const npc of npcs) {
    const key = canonicalName(npc.name);
    if (!seen.has(key)) {
      seen.set(key, npc);
    }
  }
  return Array.from(seen.values());
};

interface DirectNpcSelectorProps {
  onSelectNpc?: (npc: NpcSummary) => void;
  onSelectForm?: (form: NpcForm | null) => void;
  className?: string;
}

export function DirectNpcSelector({ onSelectNpc, onSelectForm, className }: DirectNpcSelectorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [selectedNpc, setSelectedNpc] = useState<NpcSummary | null>(null);
  const [selectedForm, setSelectedForm] = useState<NpcForm | null>(null);
  const storeNpcs = useReferenceDataStore((s) => s.npcs);
  const storeNpcForms = useReferenceDataStore((s) => s.npcForms);
  const initData = useReferenceDataStore((s) => s.initData);
  const addNpces = useReferenceDataStore((s) => s.addNpces);
  const addNpcForms = useReferenceDataStore((s) => s.addNpcForms);
  const { params, setParams, lockNpc, unlockNpc, npcLocked } = useCalculatorStore();
  const { toast } = useToast();
  const commandRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    initData();
  }, [initData]);

  const {
    data: searchResults,
    isLoading,
  } = useQuery({
    queryKey: ['npc-search', debouncedQuery],
    queryFn: () => npcsApi.searchNpces(debouncedQuery),
    enabled: debouncedQuery.length > 0,
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

  const formHasStats = (form: NpcForm) =>
    form.defence_level !== undefined && form.defence_level !== null;

  const rangedWeakness = selectedForm &&
    typeof selectedForm.defence_ranged_light === 'number' &&
    typeof selectedForm.defence_ranged_heavy === 'number'
      ? selectedForm.defence_ranged_light < selectedForm.defence_ranged_heavy
        ? 'Light'
        : selectedForm.defence_ranged_heavy < selectedForm.defence_ranged_light
          ? 'Heavy'
          : undefined
      : undefined;


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
    setSearchOpen(false);
    setSearchQuery(npc.name);

    if (onSelectNpc) {
      onSelectNpc(npc);
    }
  };

  // Handle form selection and update calculator params
  const handleSelectForm = (form: NpcForm) => {
    setSelectedForm(form);

    // Update the calculator params with the selected npc's defense stats
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
    
    unlockNpc();
    
    // Show toast notification
    toast.info("Target selection reset");
    
    // Notify parent that form is reset
    if (onSelectForm) {
      onSelectForm(null);
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader>
        <CardTitle>Target Selection</CardTitle>
        <CardDescription>Select a npc to calculate DPS against</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {npcLocked && (
          <Alert className="mb-4">
            <AlertDescription>
              Target stats from npc are being used. Manual target stat inputs are disabled.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Direct search input without dropdown button */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Npc</label>
          <div className="relative" ref={commandRef}>
            <Command className="rounded-lg border shadow-md pl-7">
              <CommandInput
                placeholder="Search npcs..."
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
                  <CommandEmpty>No npc found.</CommandEmpty>
                  <CommandGroup>
                    {isLoading && searchQuery ? (
                      <div className="flex items-center justify-center p-4">
                        <LogoSpinner className="mr-2 h-4 w-4" />
                        Loading...
                      </div>
                    ) : (
                      dedupeNpcs(
                        searchQuery.length > 0 ? searchResults ?? [] : storeNpcs
                      )
                        .filter(npc => {
                          const forms = storeNpcForms[npc.id];
                          return !forms || forms.some(formHasStats);
                        })
                        .map((npc) => (
                        <CommandItem
                          key={npc.id}
                          value={npc.name}
                          onSelect={() => handleSelectNpc(npc)}
                          className="cursor-pointer"
                        >
                          <span>{npc.name}</span>
                          {npc.raid_group && (
                            <Badge variant="outline" className="ml-2">
                              {npc.raid_group}
                            </Badge>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                  { (isLoading && !searchQuery) || (storeNpcs.length === 0 && !searchQuery) ? (
                    <div className="flex items-center justify-center p-2">
                      <LogoSpinner className="mr-2 h-4 w-4" />
                    </div>
                  ) : null}
                </CommandList>
              )}
            </Command>
          </div>
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
            ) : (<div className="flex items-center gap-2 w-full justify-between">
              <Select
                value={selectedForm?.id.toString() || ''}
                onValueChange={(value: string) => {
                  const form = combinedNpcDetails?.forms?.find(f => f.id.toString() === value);
                  if (form) {
                    handleSelectForm(form);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a form/phase" />
                </SelectTrigger>
                <SelectContent>
                  {(combinedNpcDetails?.forms ?? [])
                    .filter(formHasStats)
                    .map((form) => (
                      <SelectItem key={form.id} value={form.id.toString()}>
                        {form.form_name || `${combinedNpcDetails?.name} (${form.combat_level || 'Unknown'})`}
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

        {/* Display the selected npc stats */}
        {selectedForm && (
          <div className="pt-2 space-y-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-md flex flex-col items-center">
            {(selectedForm.icons?.[0] || selectedForm.image_url) && (
              <img
                src={selectedForm.icons?.[0] || selectedForm.image_url}
                alt={`${selectedForm.form_name} image`}
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
                    <span className="text-xs font-medium">{selectedForm.size ?? 'Unknown'}</span>
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