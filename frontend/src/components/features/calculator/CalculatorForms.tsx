'use client';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToggleBox } from '@/components/ui/toggle-box';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { MeleeForm } from './MeleeForm';
import { RangedForm } from './RangedForm';
import { MagicForm } from './MagicForm';
import { PlayerLevel } from './PlayerLevel';
import SpecialAttackForm from './SpecialAttackForm';
import { CombatStyle } from '@/types/calculator';

interface CalculatorFormsProps {
  activeTab: CombatStyle;
  onTabChange: (style: CombatStyle) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

export function CalculatorForms({
  activeTab,
  onTabChange,
  onCalculate,
  isCalculating,
}: CalculatorFormsProps) {
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="w-full mb-6">
      <PlayerLevel />
      <div className="flex items-center gap-4 mt-4 mb-4">
        <ToggleBox
          id="manual-toggle"
          pressed={showManual}
          onPressedChange={setShowManual}
        />
        <Label htmlFor="manual-toggle">Enable Manual Overrides</Label>
        
      </div>
      {showManual && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as CombatStyle)}
          className="w-full"
        >
          <TabsContent value="melee">
            <MeleeForm />
          </TabsContent>
          <TabsContent value="ranged">
            <RangedForm />
          </TabsContent>
          <TabsContent value="magic">
            <MagicForm />
          </TabsContent>
        </Tabs>
        <div className="mt-6">
          <SpecialAttackForm />
        </div>
      )}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={onCalculate}
          disabled={isCalculating}
          className="w-full max-w-md text-base py-2"
        >
          {isCalculating ? 'Calculating...' : 'Calculate DPS'}
        </Button>
      </div>
    </div>
  );
}
