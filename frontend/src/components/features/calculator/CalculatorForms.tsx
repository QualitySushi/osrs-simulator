'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sword, Target, Zap } from 'lucide-react';
import { MeleeForm } from './MeleeForm';
import { RangedForm } from './RangedForm';
import { MagicForm } from './MagicForm';
import { CombatStyle } from '@/types/calculator';

interface CalculatorFormsProps {
  activeTab: CombatStyle;
  onTabChange: (style: CombatStyle) => void;
  onCalculate: () => void;
  onReset: () => void;
  isCalculating: boolean;
}

export function CalculatorForms({
  activeTab,
  onTabChange,
  onCalculate,
  onReset,
  isCalculating,
}: CalculatorFormsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as CombatStyle)} className="w-full mb-6">
      <TabsList className="grid grid-cols-4 mb-6">
        <TabsTrigger value="melee" className="flex items-center justify-center">
          <Sword className="h-4 w-4 mr-2" />
          Melee
        </TabsTrigger>
        <TabsTrigger value="ranged" className="flex items-center justify-center">
          <Target className="h-4 w-4 mr-2" />
          Ranged
        </TabsTrigger>
        <TabsTrigger value="magic" className="flex items-center justify-center">
          <Zap className="h-4 w-4 mr-2" />
          Magic
        </TabsTrigger>
        <Button variant="outline" className="flex items-center justify-center" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </TabsList>
      <TabsContent value="melee">
        <MeleeForm />
      </TabsContent>
      <TabsContent value="ranged">
        <RangedForm />
      </TabsContent>
      <TabsContent value="magic">
        <MagicForm />
      </TabsContent>
      <div className="mt-6 flex justify-center">
        <Button onClick={onCalculate} disabled={isCalculating} className="w-full max-w-md text-base py-2">
          {isCalculating ? 'Calculating...' : 'Calculate DPS'}
        </Button>
      </div>
    </Tabs>
  );
}
