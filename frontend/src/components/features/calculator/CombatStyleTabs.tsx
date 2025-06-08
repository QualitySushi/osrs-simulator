'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sword, Target, Zap } from 'lucide-react';
import { CombatStyle } from '@/types/calculator';

interface CombatStyleTabsProps {
  activeTab: CombatStyle;
  onTabChange: (style: CombatStyle) => void;
  onReset: () => void;
}

export function CombatStyleTabs({ activeTab, onTabChange, onReset }: CombatStyleTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as CombatStyle)}
      className="w-full"
    >
      <TabsList className="grid grid-cols-4 mb-6">
        <TabsTrigger
          value="melee"
          onClick={() => onTabChange('melee')}
          className="flex items-center justify-center"
        >
          <Sword className="h-4 w-4 mr-2" />
          Melee
        </TabsTrigger>
        <TabsTrigger
          value="ranged"
          onClick={() => onTabChange('ranged')}
          className="flex items-center justify-center"
        >
          <Target className="h-4 w-4 mr-2" />
          Ranged
        </TabsTrigger>
        <TabsTrigger
          value="magic"
          onClick={() => onTabChange('magic')}
          className="flex items-center justify-center"
        >
          <Zap className="h-4 w-4 mr-2" />
          Magic
        </TabsTrigger>
        <Button variant="outline" className="flex items-center justify-center" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </TabsList>
    </Tabs>
  );
}

export default CombatStyleTabs;
