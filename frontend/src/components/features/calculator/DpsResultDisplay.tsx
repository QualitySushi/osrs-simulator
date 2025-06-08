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
      <h2 className="text-xl font-bold border-b pb-2 flex items-center justify-center section-heading">
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
    </div>
  );
}
