'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle } from '@/app/types/calculator';
import { MeleeForm } from './MeleeForm';

export function DpsCalculator() {
  const { toast } = useToast();
  const { params, setResults, results, switchCombatStyle } = useCalculatorStore();
  const [activeTab, setActiveTab] = useState<CombatStyle>(params.combat_style);

  // Calculate DPS mutation
  const calculateMutation = useMutation({
    mutationFn: calculatorApi.calculateDps,
    onSuccess: (data) => {
      setResults(data);
      toast.success(`DPS Calculated: Max hit: ${data.max_hit}, DPS: ${data.dps.toFixed(2)}`);
    },
    onError: (error) => {
      toast.error('Calculation Failed: There was an error calculating DPS.');
      console.error('Calculation error:', error);
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as CombatStyle);
    switchCombatStyle(value as CombatStyle);
  };

  const handleCalculate = () => {
    calculateMutation.mutate(params);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">OSRS DPS Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="melee">Melee</TabsTrigger>
            <TabsTrigger value="ranged">Ranged</TabsTrigger>
            <TabsTrigger value="magic">Magic</TabsTrigger>
          </TabsList>

          <TabsContent value="melee">
            <MeleeForm />
          </TabsContent>

          <TabsContent value="ranged">
            <div className="p-4 text-center">Ranged form will go here</div>
          </TabsContent>

          <TabsContent value="magic">
            <div className="p-4 text-center">Magic form will go here</div>
          </TabsContent>

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleCalculate} 
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? 'Calculating...' : 'Calculate DPS'}
            </Button>
          </div>
        </Tabs>

        {results && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">DPS</div>
                <div className="text-2xl font-bold">{results.dps.toFixed(2)}</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Max Hit</div>
                <div className="text-2xl font-bold">{results.max_hit}</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Hit Chance</div>
                <div className="text-2xl font-bold">{(results.hit_chance * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}