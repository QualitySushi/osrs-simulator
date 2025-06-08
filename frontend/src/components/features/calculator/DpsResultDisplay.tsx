'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { CalculatorParams, DpsResult } from '@/types/calculator';

interface DpsResultDisplayProps {
  params: CalculatorParams;
  results: DpsResult;
  appliedPassiveEffects: any | null;
}

export function DpsResultDisplay({ params, results, appliedPassiveEffects }: DpsResultDisplayProps) {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-bold border-b pb-2 flex items-center section-heading">
        <Calculator className="h-5 w-5 mr-2 text-primary" />
        Calculation Results
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30 border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">DPS</div>
            <div className="text-3xl font-bold text-primary">{results.dps.toFixed(2)}</div>
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
            <div className="text-3xl font-bold text-primary">{(results.hit_chance * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      {appliedPassiveEffects && appliedPassiveEffects.isApplicable && (
        <Card className="bg-muted/30 border mt-4">
          <CardContent className="pt-6">
            <h3 className="text-base font-medium mb-2">Applied Passive Effects</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {appliedPassiveEffects.accuracy !== 1.0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Accuracy Bonus:</span>{' '}
                  <span className="font-medium text-green-500">+{((appliedPassiveEffects.accuracy - 1) * 100).toFixed(1)}%</span>
                </div>
              )}
              {appliedPassiveEffects.damage !== 1.0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Damage Bonus:</span>{' '}
                  <span className="font-medium text-green-500">+{((appliedPassiveEffects.damage - 1) * 100).toFixed(1)}%</span>
                </div>
              )}
              {appliedPassiveEffects.maxHit > 0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Max Hit Bonus:</span>{' '}
                  <span className="font-medium text-green-500">+{appliedPassiveEffects.maxHit}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
