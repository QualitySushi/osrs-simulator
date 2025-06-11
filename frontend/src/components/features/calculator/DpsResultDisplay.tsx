'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { CalculatorParams, DpsResult } from '@/types/calculator';
import { safeFixed } from '@/utils/format';

interface DpsResultDisplayProps {
  params: CalculatorParams;
  results: DpsResult;
  appliedPassiveEffects: any | null;
}

export function DpsResultDisplay({ params, results, appliedPassiveEffects }: DpsResultDisplayProps) {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-bold border-b pb-2 flex items-center justify-center section-heading">
        <Calculator className="h-5 w-5 mr-2 text-primary" />
        Calculation Results
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30 border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Total DPS</div>
            <div className="text-3xl font-bold text-primary">
              {safeFixed(results.dps, 2)}
            </div>
            {results.special_attack_dps !== undefined && (
              <div className="text-xs text-muted-foreground">
                Base {safeFixed(results.mainhand_dps ?? 0, 2)} + Special{' '}
                {safeFixed(results.special_attack_dps, 2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Max Hit</div>
            <div className="text-3xl font-bold text-primary">{results.max_hit}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Hit Chance</div>
            <div className="text-3xl font-bold text-primary">{safeFixed(results.hit_chance * 100, 1)}%</div>
          </CardContent>
        </Card>
        {results.special_attack_dps !== undefined && (
          <Card className="bg-muted/30 border">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Special Attacks</div>
              <div className="text-3xl font-bold text-primary">{results.special_attacks ?? 0}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
