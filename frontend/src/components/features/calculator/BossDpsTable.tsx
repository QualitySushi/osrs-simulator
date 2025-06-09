'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useCalculatorStore } from '@/store/calculator-store';
import { calculatorApi } from '@/services/api';
import { useEffect, useState } from 'react';
import { Item, CalculatorParams } from '@/types/calculator';

function calculateBonuses(params: CalculatorParams, loadout: Record<string, Item | null>) {
  let meleeAtk = 0, meleeStr = 0;
  let rangedAtk = 0, rangedStr = 0;
  let magicAtk = 0, magicDmg = 0;
  const type = (params as any).attack_type || 'slash';
  Object.values(loadout).forEach((item) => {
    if (!item?.combat_stats) return;
    const { attack_bonuses = {}, other_bonuses = {} } = item.combat_stats;
    meleeAtk += attack_bonuses[type as keyof typeof attack_bonuses] || 0;
    meleeStr += other_bonuses.strength || 0;
    rangedAtk += attack_bonuses.ranged || 0;
    rangedStr += other_bonuses['ranged strength'] || 0;
    magicAtk += attack_bonuses.magic || 0;
    const dmg = other_bonuses['magic damage'];
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

export function BossDpsTable() {
  const params = useCalculatorStore((s) => s.params);
  const loadout = useCalculatorStore((s) => s.loadout);
  const currentResults = useCalculatorStore((s) => s.results);

  const [bisDps, setBisDps] = useState<number | null>(null);

  useEffect(() => {
    async function run() {
      if (!currentResults) return;
      try {
        const bis = await calculatorApi.getBis(params);
        const bisParams = calculateBonuses(params, bis as any);
        const result = await calculatorApi.calculateDps(bisParams);
        setBisDps(result.dps);
      } catch (err) {
        console.error(err);
      }
    }
    run();
  }, [params, loadout, currentResults]);

  if (!currentResults) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Boss DPS</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setup</TableHead>
              <TableHead className="text-right">DPS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Current</TableCell>
              <TableCell className="text-right font-medium">{currentResults.dps.toFixed(2)}</TableCell>
            </TableRow>
            {bisDps !== null && (
              <TableRow>
                <TableCell>Best-in-slot</TableCell>
                <TableCell className="text-right font-medium">{bisDps.toFixed(2)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
