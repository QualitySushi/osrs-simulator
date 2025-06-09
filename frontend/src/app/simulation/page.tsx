'use client';

import { useState } from 'react';
import { DirectBossSelector } from '@/components/features/calculator/DirectBossSelector';
import { Table, TableHead, TableBody, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { calculatorApi, itemsApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/hooks/use-toast';
import {
  BossForm,
  DpsResult,
  Item,
  CalculatorParams,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
  BossFormSelection,
} from '@/types/calculator';

function calculateBonuses(params: CalculatorParams, loadout: Record<string, Item | null>) {
  let meleeAtk = 0,
    meleeStr = 0,
    rangedAtk = 0,
    rangedStr = 0,
    magicAtk = 0,
    magicDmg = 0;
  const type = (params as any).attack_type || 'slash';
  Object.values(loadout).forEach((item) => {
    if (!item?.combat_stats) return;
    const { attack_bonuses = {}, other_bonuses = {} } = item.combat_stats;
    meleeAtk += attack_bonuses[type as keyof typeof attack_bonuses] || 0;
    meleeStr += (other_bonuses as any).strength || 0;
    rangedAtk += attack_bonuses.ranged || 0;
    rangedStr += (other_bonuses as any)['ranged strength'] || 0;
    magicAtk += attack_bonuses.magic || 0;
    const dmg = (other_bonuses as any)['magic damage'];
    if (typeof dmg === 'string' && dmg.includes('%')) {
      magicDmg += parseFloat(dmg) / 100;
    } else if (typeof dmg === 'number') {
      magicDmg += dmg;
    }
  });
  const next = { ...params } as any;
  if (params.combat_style === 'melee') {
    next.melee_attack_bonus = meleeAtk;
    next.melee_strength_bonus = meleeStr;
  } else if (params.combat_style === 'ranged') {
    next.ranged_attack_bonus = rangedAtk;
    next.ranged_strength_bonus = rangedStr;
  } else {
    next.magic_attack_bonus = magicAtk;
    next.magic_damage_bonus = magicDmg;
  }
  return next as CalculatorParams;
}

interface SimulationResult {
  boss: BossForm;
  result: DpsResult;
  upgrades: Record<string, { best_item: Item; improvement: number }>;
  bisDps: number | null;
}

function applyBossForm(params: CalculatorParams, form: BossForm): CalculatorParams {
  const newParams: any = { ...params };
  const style = params.combat_style;
  if (style === 'melee') {
    const atkType = (params as MeleeCalculatorParams).attack_type || 'slash';
    let defBonus = 0;
    let defType = 'defence_slash';
    if (atkType === 'stab') {
      defBonus = form.defence_stab ?? 0;
      defType = 'defence_stab';
    } else if (atkType === 'slash') {
      defBonus = form.defence_slash ?? 0;
      defType = 'defence_slash';
    } else if (atkType === 'crush') {
      defBonus = form.defence_crush ?? 0;
      defType = 'defence_crush';
    }
    newParams.target_defence_level = form.defence_level || 1;
    newParams.target_defence_bonus = defBonus;
    newParams.original_defence_level = form.defence_level || 1;
    newParams.target_defence_type = defType;
  } else if (style === 'ranged') {
    newParams.target_defence_level = form.defence_level || 1;
    newParams.target_defence_bonus = form.defence_ranged_standard || 0;
    newParams.original_defence_level = form.defence_level || 1;
    newParams.target_defence_type = 'defence_ranged_standard';
  } else if (style === 'magic') {
    newParams.target_magic_level = form.magic_level || 1;
    newParams.target_magic_defence = form.defence_magic || 0;
    newParams.target_defence_level = form.defence_level || 1;
    newParams.target_defence_bonus = form.defence_magic || 0;
    newParams.original_defence_level = form.defence_level || 1;
    newParams.target_defence_type = 'defence_magic';
  }
  return newParams;
}

async function simulateBosses(params: CalculatorParams, bosses: BossForm[]) {
  // Send explicit boss_id/form_id pairs so the backend can simulate the
  // selected form instead of always using the first one.
  const selections = bosses.map((b) => ({ boss_id: b.boss_id, form_id: b.id }));
  const simResults = await calculatorApi.simulateBosses(params, selections);
  const results: SimulationResult[] = [];
  for (const form of bosses) {
    const p = applyBossForm(params, form);
    try {
      const upgradesResp = await calculatorApi.getUpgradeSuggestions(form.boss_id, p);
      let bisDps: number | null = null;
      try {
        const bis = await calculatorApi.getBis(p);
        const bisParams = calculateBonuses(p, bis as any);
        const bisResult = await calculatorApi.calculateDps(bisParams);
        bisDps = bisResult.dps;
      } catch (err) {
        console.error('Failed to fetch BIS DPS', err);
      }
      results.push({ boss: form, result: simResults[form.id], upgrades: upgradesResp.upgrades || {}, bisDps });
    } catch (err) {
      console.error('Failed to fetch upgrades', err);
      results.push({ boss: form, result: simResults[form.id], upgrades: {}, bisDps: null });
    }
  }
  return results;
}

export default function SimulationPage() {
  const params = useCalculatorStore((s) => s.params);
  const [selectedBosses, setSelectedBosses] = useState<BossForm[]>([]);
  const [currentBoss, setCurrentBoss] = useState<BossForm | null>(null);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [seed, setSeed] = useState('');
  const { toast } = useToast();
  const handleAddBoss = () => {
    if (currentBoss) {
      setSelectedBosses((b) => [...b, currentBoss]);
      setCurrentBoss(null);
    }
  };

  const handleRemoveBoss = (id: number) => {
    setSelectedBosses((b) => b.filter((f) => f.id !== id));
  };

  const handleImport = async () => {
    try {
      const jsonStr = atob(seed.trim());
      const data = JSON.parse(jsonStr);
      const { equipment, equipped_armor, equipped_weapon, ...params } = data;

      const rawLoadout: Record<string, number | null> =
        equipment || { ...(equipped_armor || {}), ...(equipped_weapon || {}) } || {};
      const processedLoadout: Record<string, Item | null> = {};

      await Promise.all(
        Object.entries(rawLoadout).map(async ([slot, itemId]) => {
          if (!itemId) {
            processedLoadout[slot] = null;
            return;
          }
          try {
            const fullItem = await itemsApi.getItemById(itemId as number);
            processedLoadout[slot] = fullItem;
          } catch {
            processedLoadout[slot] = null;
          }
        })
      );

      useCalculatorStore.getState().setParams(params);
      useCalculatorStore.getState().setLoadout(processedLoadout);
      toast.success('Seed imported');
    } catch (e) {
      toast.error('Invalid seed');
    }
  };

  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      const res = await simulateBosses(params, selectedBosses);
      setResults(res);
    } catch (err) {
      console.error(err);
      toast.error('Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4 space-y-4">
      <h1 className="text-2xl font-bold">Boss Simulation</h1>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <img src="/images/RuneLite.a9810730.webp" alt="RuneLite" className="w-5 h-5" />
          Paste RuneLite Export Seed
        </label>
        <textarea
          className="w-full border p-2 rounded"
          rows={2}
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Base64 seed"
        />
        <Button onClick={handleImport} size="sm">Import Seed</Button>
      </div>
      <DirectBossSelector onSelectForm={setCurrentBoss} className="max-w-xl" />
      <div className="flex gap-2">
        <Button onClick={handleAddBoss} disabled={!currentBoss}>Add Boss</Button>
        <Button onClick={handleSimulate} disabled={selectedBosses.length === 0 || isSimulating}>
          {isSimulating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simulate
        </Button>
      </div>
      {selectedBosses.length > 0 && (
        <ul className="list-disc pl-6 space-y-1">
          {selectedBosses.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <span>{b.form_name || `Boss ${b.id}`}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveBoss(b.id)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {results && (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Boss</TableHead>
              <TableHead>DPS</TableHead>
              <TableHead>BIS DPS</TableHead>
              <TableHead>Max Hit</TableHead>
              <TableHead>Upgrade Suggestions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(({ boss, result, upgrades, bisDps }) => (
              <TableRow key={boss.id}>
                <TableCell>{boss.form_name || `Boss ${boss.id}`}</TableCell>
                <TableCell>{result.dps.toFixed(2)}</TableCell>
                <TableCell>{bisDps !== null ? bisDps.toFixed(2) : 'N/A'}</TableCell>
                <TableCell>{result.max_hit}</TableCell>
                <TableCell>
                  {Object.keys(upgrades).length > 0 ? (
                    <ul className="list-disc pl-4">
                      {Object.entries(upgrades)
                        .sort((a, b) => b[1].improvement - a[1].improvement)
                        .map(([slot, info], idx) => (
                          <li
                            key={slot}
                            className={
                              idx === 0 ? 'font-semibold text-green-700 dark:text-green-400' : ''
                            }
                          >
                            <a
                              href={`https://oldschool.runescape.wiki/w/${encodeURIComponent(
                                info.best_item.name
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {slot}: {info.best_item.name} (+{info.improvement.toFixed(2)} DPS)
                            </a>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
