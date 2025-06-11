'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import RaidScalingPanel, { RaidScalingConfig } from './RaidScalingPanel';
import { Raid, RAID_OPTIONS, RAID_NAME_MAP } from '@/types/raid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { npcsApi, calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { safeFixed } from '@/utils/format';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import {
  Npc,
  NpcForm,
  CalculatorParams,
  DpsResult,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
} from '@/types/calculator';

interface SimulationEntry {
  npc: Npc;
  result: DpsResult;
}


export function MultiNpcSimulation() {
  const params = useCalculatorStore((s) => s.params);
  const loadout = useCalculatorStore((s) => s.loadout);
  const { toast } = useToast();

  const [selectedNpces, setSelectedNpces] = useState<Npc[]>([]);
  const [selectedRaid, setSelectedRaid] = useState<Raid | ''>('');
  const [raidConfig, setRaidConfig] = useState<RaidScalingConfig>({ teamSize: 1 });
  const [results, setResults] = useState<SimulationEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const storeNpcs = useReferenceDataStore((s) => s.npcs);
  const storeNpcForms = useReferenceDataStore((s) => s.npcForms);
  const initData = useReferenceDataStore((s) => s.initData);
  const addNpces = useReferenceDataStore((s) => s.addNpces);
  const addNpcForms = useReferenceDataStore((s) => s.addNpcForms);
  const [npcIcons, setNpcIcons] = useState<Record<number, string>>({});

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    const map: Record<number, string> = {};
    storeNpcs.forEach((b) => {
      if (b.icon_url) map[b.id] = b.icon_url;
    });
    setNpcIcons(map);
  }, [storeNpcs]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['sim-npc-search', debouncedSearch],
    queryFn: () => npcsApi.searchNpces(debouncedSearch, 50),
    enabled: debouncedSearch.length > 0,
    staleTime: Infinity,
    onSuccess: (d) => addNpces(d),
    onError: (e: any) => toast.error(`Npc search failed: ${e.message}`),
  });

  useEffect(() => {
    if (!selectedRaid) {
      setSelectedNpces([]);
      return;
    }
    const raidName = RAID_NAME_MAP[selectedRaid];
    const npcsForRaid = storeNpcs.filter((b) => b.raid_group === raidName);
    setSelectedNpces(npcsForRaid);
  }, [selectedRaid, storeNpcs]);

  const filteredNpces = (searchTerm.length > 0 ? searchResults ?? [] : storeNpcs).filter(
    (b) => !selectedRaid || b.raid_group === RAID_NAME_MAP[selectedRaid]
  );

  const addNpc = (npc: Npc) => {
    if (selectedNpces.find((b) => b.id === npc.id)) return;
    setSelectedNpces([...selectedNpces, npc]);
    setOpen(false);
    setSearchTerm('');
  };

  const removeNpc = (id: number) => {
    setSelectedNpces(selectedNpces.filter((b) => b.id !== id));
  };

  const sanitizeParams = (p: CalculatorParams): CalculatorParams => {
    const { selected_spell, ...cleaned } = p as any;
    if (!cleaned.target_defence_type) {
      if (p.combat_style === 'melee') {
        cleaned.target_defence_type = `defence_${cleaned.attack_type || 'slash'}`;
      } else if (p.combat_style === 'ranged') {
        cleaned.target_defence_type = 'defence_ranged_standard';
      } else if (p.combat_style === 'magic') {
        cleaned.target_defence_type = 'defence_magic';
      }
    }
    if (p.combat_style === 'magic') {
      delete cleaned.attack_style_bonus_attack;
      delete cleaned.attack_style_bonus_strength;
      cleaned.magic_level = Number(cleaned.magic_level);
      cleaned.magic_boost = Number(cleaned.magic_boost);
      cleaned.magic_prayer = Number(cleaned.magic_prayer);
      cleaned.base_spell_max_hit = Number(cleaned.base_spell_max_hit);
      cleaned.magic_attack_bonus = Number(cleaned.magic_attack_bonus);
      cleaned.magic_damage_bonus = Number(cleaned.magic_damage_bonus);
      cleaned.target_magic_level = Number(cleaned.target_magic_level);
      cleaned.target_magic_defence = Number(cleaned.target_magic_defence);
      cleaned.attack_speed = Number(cleaned.attack_speed);
    }
    if (!cleaned.special_attack_cost) delete cleaned.special_attack_cost;
    if (cleaned.special_multiplier === 1.0) delete cleaned.special_multiplier;
    if (cleaned.special_accuracy_multiplier === 1.0)
      delete cleaned.special_accuracy_multiplier;
    if (cleaned.special_attack_speed === undefined)
      delete cleaned.special_attack_speed;
    if (cleaned.special_damage_multiplier === undefined)
      delete cleaned.special_damage_multiplier;
    if (cleaned.special_accuracy_modifier === undefined)
      delete cleaned.special_accuracy_modifier;
    if (cleaned.special_energy_cost === undefined) delete cleaned.special_energy_cost;
    if (cleaned.special_regen_rate === 10 / 30) delete cleaned.special_regen_rate;
    if (cleaned.initial_special_energy === 100) delete cleaned.initial_special_energy;
    return cleaned;
  };

  const applyFormStats = (form: NpcForm, base: CalculatorParams): CalculatorParams => {
    const updated = { ...base } as any;
    if (base.combat_style === 'melee') {
      let defenceBonus = 0;
      let targetType = '';
      const atkType = (base as MeleeCalculatorParams).attack_type || 'slash';
      if (atkType === 'stab') {
        defenceBonus = form.defence_stab ?? 0;
        targetType = 'defence_stab';
      } else if (atkType === 'slash') {
        defenceBonus = form.defence_slash ?? 0;
        targetType = 'defence_slash';
      } else if (atkType === 'crush') {
        defenceBonus = form.defence_crush ?? 0;
        targetType = 'defence_crush';
      }
      updated.target_defence_level = form.defence_level || 1;
      updated.target_defence_bonus = defenceBonus;
      updated.original_defence_level = form.defence_level || 1;
      updated.target_defence_type = targetType;
    } else if (base.combat_style === 'ranged') {
      updated.target_defence_level = form.defence_level || 1;
      updated.target_defence_bonus = form.defence_ranged_standard || 0;
      updated.original_defence_level = form.defence_level || 1;
      updated.target_defence_type = 'defence_ranged_standard';
    } else if (base.combat_style === 'magic') {
      updated.target_magic_level = form.magic_level || 1;
      updated.target_magic_defence = form.defence_magic || 0;
      updated.target_defence_level = form.defence_level || 1;
      updated.target_defence_bonus = form.defence_magic || 0;
      updated.original_defence_level = form.defence_level || 1;
      updated.target_defence_type = 'defence_magic';
    }
    return updated as CalculatorParams;
  };

  const buildParams = (form: NpcForm): CalculatorParams => {
    let p = applyFormStats(form, params);
    let clean = sanitizeParams(p);
    if (loadout) {
      const twistedBowEquipped =
        (loadout['2h'] && loadout['2h']!.name.toLowerCase().includes('twisted bow')) ||
        (loadout['mainhand'] && loadout['mainhand']!.name.toLowerCase().includes('twisted bow'));
      if (twistedBowEquipped && clean.combat_style === 'ranged') {
        (clean as any).weapon_name = 'twisted bow';
        if (form.magic_level) (clean as any).target_magic_level = form.magic_level;
        (clean as any).ranged_attack_bonus = (p as any).ranged_attack_bonus;
        (clean as any).ranged_strength_bonus = (p as any).ranged_strength_bonus;
      }
      const tumekenShadowEquipped =
        (loadout['2h'] && loadout['2h']!.name.toLowerCase().includes('tumeken')) ||
        (loadout['mainhand'] && loadout['mainhand']!.name.toLowerCase().includes('tumeken'));
      if (tumekenShadowEquipped && clean.combat_style === 'magic') {
        (clean as any).shadow_bonus = 0.5;
      }
    }
    return clean;
  };

  const runSimulation = async () => {
    setIsRunning(true);
    const sims: SimulationEntry[] = [];
      for (const npc of selectedNpces) {
        try {
          let forms = storeNpcForms[npc.id];
        if (!forms) {
          const details = await npcsApi.getNpcById(npc.id);
          forms = details.forms || [];
          addNpcForms(npc.id, forms);
        }
        const form = forms[0];
        if (!form) continue;
        const simParams = buildParams(form);
        const result = await calculatorApi.calculateDps(simParams);
          sims.push({ npc, result });
        } catch (e: any) {
          toast.error(`Simulation failed for ${npc.name}: ${e.message}`);
          console.error('Simulation failed for', npc.name, e);
        }
      }
    setResults(sims);
    setIsRunning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Multi-Npc Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Raid</label>
          <Select value={selectedRaid} onValueChange={(v) => setSelectedRaid(v as Raid)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select raid" />
            </SelectTrigger>
            <SelectContent>
              {RAID_OPTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Npces</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Select npcs
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <div className="flex h-9 items-center gap-2 border-b px-3">
                  <CommandInput
                    placeholder="Search npcs..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                      filteredNpces.map((npc) => (
                        <CommandItem
                          key={npc.id}
                          value={npc.name}
                          onSelect={() => addNpc(npc)}
                        >
                          {npc.name}
                        </CommandItem>
                      ))
                    )}
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {selectedRaid && (
          <RaidScalingPanel raid={selectedRaid as Raid} config={raidConfig} onChange={setRaidConfig} />
        )}
        {selectedNpces.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedNpces.map((b) => (
              <Badge key={b.id} variant="secondary" className="flex items-center gap-1">
                {b.name}
                <button onClick={() => removeNpc(b.id)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={runSimulation} disabled={selectedNpces.length === 0 || isRunning}>
          {isRunning && <LogoSpinner className="mr-2 h-4 w-4" />}Run Simulation
        </Button>
        {results.length > 0 && (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Npc</TableHead>
                <TableHead className="text-right">DPS</TableHead>
                <TableHead className="text-right">Max Hit</TableHead>
                <TableHead className="text-right">Hit Chance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ npc, result }) => (
                <TableRow key={npc.id}>
                  <TableCell className="font-medium">
                    {npcIcons[npc.id] && (
                      <img
                        src={npcIcons[npc.id]}
                        alt={`${npc.name} icon`}
                        className="w-4 h-4 mr-1 inline-block"
                      />
                    )}
                    {npc.name}
                  </TableCell>
                  <TableCell className="text-right">{safeFixed(result.dps, 2)}</TableCell>
                  <TableCell className="text-right">{result.max_hit}</TableCell>
                  <TableCell className="text-right">{safeFixed(result.hit_chance * 100, 1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default MultiNpcSimulation;
