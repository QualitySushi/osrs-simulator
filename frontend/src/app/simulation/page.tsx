'use client';

import { useState } from 'react';
import { DirectBossSelector } from '@/components/features/calculator/DirectBossSelector';
import { Table, TableHead, TableBody, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import {
  BossForm,
  DpsResult,
  Item,
  CalculatorParams,
  MeleeCalculatorParams,
  RangedCalculatorParams,
  MagicCalculatorParams,
} from '@/types/calculator';

interface SimulationResult {
  boss: BossForm;
  result: DpsResult;
  upgrades: Record<string, Item | undefined>;
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
  const bossIds = bosses.map((b) => b.id);
  const simResults = await calculatorApi.simulateBosses(params, bossIds);
  const results: SimulationResult[] = [];
  for (const form of bosses) {
    const p = applyBossForm(params, form);
    const upgradesResp = await calculatorApi.getUpgradeSuggestions(form.id, p);
    const headItem = upgradesResp.upgrades?.head?.best_item as Item | undefined;
    results.push({ boss: form, result: simResults[form.id], upgrades: { head: headItem } as any });
  }
  return results;
}

export default function SimulationPage() {
  const params = useCalculatorStore((s) => s.params);
  const [selectedBosses, setSelectedBosses] = useState<BossForm[]>([]);
  const [currentBoss, setCurrentBoss] = useState<BossForm | null>(null);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const handleAddBoss = () => {
    if (currentBoss) {
      setSelectedBosses((b) => [...b, currentBoss]);
      setCurrentBoss(null);
    }
  };

  const handleSimulate = async () => {
    const res = await simulateBosses(params, selectedBosses);
    setResults(res);
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4 space-y-4">
      <h1 className="text-2xl font-bold">Boss Simulation</h1>
      <DirectBossSelector onSelectForm={setCurrentBoss} className="max-w-xl" />
      <div className="flex gap-2">
        <Button onClick={handleAddBoss} disabled={!currentBoss}>Add Boss</Button>
        <Button onClick={handleSimulate} disabled={selectedBosses.length === 0}>Simulate</Button>
      </div>
      {selectedBosses.length > 0 && (
        <ul className="list-disc pl-6">
          {selectedBosses.map((b) => (
            <li key={b.id}>{b.form_name || `Boss ${b.id}`}</li>
          ))}
        </ul>
      )}

      {results && (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Boss</TableHead>
              <TableHead>DPS</TableHead>
              <TableHead>Max Hit</TableHead>
              <TableHead>Upgrade Suggestion (Head Slot)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(({ boss, result, upgrades }) => (
              <TableRow key={boss.id}>
                <TableCell>{boss.form_name || `Boss ${boss.id}`}</TableCell>
                <TableCell>{result.dps.toFixed(2)}</TableCell>
                <TableCell>{result.max_hit}</TableCell>
                <TableCell>{upgrades.head ? upgrades.head.name : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
