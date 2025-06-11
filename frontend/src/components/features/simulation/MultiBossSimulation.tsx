'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, X } from 'lucide-react';
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
import { bossesApi, calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Boss,
  BossForm,
  CalculatorParams,
  DpsResult,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
} from '@/types/calculator';

interface SimulationEntry {
  boss: Boss;
  result: DpsResult;
}


export function MultiBossSimulation() {
  const params = useCalculatorStore((s) => s.params);
  const loadout = useCalculatorStore((s) => s.loadout);

  const [selectedBosses, setSelectedBosses] = useState<Boss[]>([]);
  const [selectedRaid, setSelectedRaid] = useState<Raid | ''>('');
  const [raidConfig, setRaidConfig] = useState<RaidScalingConfig>({ teamSize: 1 });
  const [results, setResults] = useState<SimulationEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const storeBosses = useReferenceDataStore((s) => s.bosses);
  const storeBossForms = useReferenceDataStore((s) => s.bossForms);
  const initData = useReferenceDataStore((s) => s.initData);
  const addBosses = useReferenceDataStore((s) => s.addBosses);
  const addBossForms = useReferenceDataStore((s) => s.addBossForms);
  const [bossIcons, setBossIcons] = useState<Record<number, string>>({});

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    const map: Record<number, string> = {};
    storeBosses.forEach((b) => {
      if (b.icon_url) map[b.id] = b.icon_url;
    });
    setBossIcons(map);
  }, [storeBosses]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['sim-boss-search', debouncedSearch],
    queryFn: () => bossesApi.searchBosses(debouncedSearch, 50),
    enabled: debouncedSearch.length > 0,
    staleTime: Infinity,
    onSuccess: (d) => addBosses(d),
  });

  useEffect(() => {
    if (!selectedRaid) {
      setSelectedBosses([]);
      return;
    }
    const raidName = RAID_NAME_MAP[selectedRaid];
    const bossesForRaid = storeBosses.filter((b) => b.raid_group === raidName);
    setSelectedBosses(bossesForRaid);
  }, [selectedRaid, storeBosses]);

  const filteredBosses = (searchTerm.length > 0 ? searchResults ?? [] : storeBosses).filter(
    (b) => !selectedRaid || b.raid_group === RAID_NAME_MAP[selectedRaid]
  );

  const addBoss = (boss: Boss) => {
    if (selectedBosses.find((b) => b.id === boss.id)) return;
    setSelectedBosses([...selectedBosses, boss]);
    setOpen(false);
    setSearchTerm('');
  };

  const removeBoss = (id: number) => {
    setSelectedBosses(selectedBosses.filter((b) => b.id !== id));
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
    return cleaned;
  };

  const applyFormStats = (form: BossForm, base: CalculatorParams): CalculatorParams => {
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

  const buildParams = (form: BossForm): CalculatorParams => {
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
    for (const boss of selectedBosses) {
      try {
        let forms = storeBossForms[boss.id];
        if (!forms) {
          const details = await bossesApi.getBossById(boss.id);
          forms = details.forms || [];
          addBossForms(boss.id, forms);
        }
        const form = forms[0];
        if (!form) continue;
        const simParams = buildParams(form);
        const result = await calculatorApi.calculateDps(simParams);
        sims.push({ boss, result });
      } catch (e) {
        console.error('Simulation failed for', boss.name, e);
      }
    }
    setResults(sims);
    setIsRunning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Multi-Boss Simulation</CardTitle>
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
          <label className="text-sm font-medium">Add Bosses</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Select bosses
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <div className="flex h-9 items-center gap-2 border-b px-3">
                  <CommandInput
                    placeholder="Search bosses..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <CommandEmpty>No boss found.</CommandEmpty>
                <CommandGroup>
                  <CommandList>
                    {isLoading && searchTerm ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      filteredBosses.map((boss) => (
                        <CommandItem key={boss.id} value={boss.name} onSelect={() => addBoss(boss)}>
                          {bossIcons[boss.id] && (
                            <img
                              src={bossIcons[boss.id]}
                              alt={`${boss.name} icon`}
                              className="w-4 h-4 mr-2 inline-block"
                            />
                          )}
                          {boss.name}
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
        {selectedBosses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedBosses.map((b) => (
              <Badge key={b.id} variant="secondary" className="flex items-center gap-1">
                {b.name}
                <button onClick={() => removeBoss(b.id)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={runSimulation} disabled={selectedBosses.length === 0 || isRunning}>
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Run Simulation
        </Button>
        {results.length > 0 && (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Boss</TableHead>
                <TableHead className="text-right">DPS</TableHead>
                <TableHead className="text-right">Max Hit</TableHead>
                <TableHead className="text-right">Hit Chance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ boss, result }) => (
                <TableRow key={boss.id}>
                  <TableCell className="font-medium">
                    {bossIcons[boss.id] && (
                      <img
                        src={bossIcons[boss.id]}
                        alt={`${boss.name} icon`}
                        className="w-4 h-4 mr-1 inline-block"
                      />
                    )}
                    {boss.name}
                  </TableCell>
                  <TableCell className="text-right">{result.dps.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{result.max_hit}</TableCell>
                  <TableCell className="text-right">{(result.hit_chance * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default MultiBossSimulation;
