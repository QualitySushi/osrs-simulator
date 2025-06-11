'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { CalculatorForms } from '../CalculatorForms';
import { CombatStyleTabs } from '../CombatStyleTabs';
import { DpsResultDisplay } from '../DpsResultDisplay';
import { CalculatorParams, DpsResult } from '@/types/calculator';
import { CombatStyle } from '@/types/calculator';

interface HeaderProps {
  activeTab: CombatStyle;
  onTabChange: (tab: CombatStyle) => void;
  onReset: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  params: CalculatorParams;
  results: DpsResult | null;
  appliedPassiveEffects: any | null;
}

export function Header({
  activeTab,
  onTabChange,
  onReset,
  onCalculate,
  isCalculating,
  params,
  results,
  appliedPassiveEffects,
}: HeaderProps) {
  return (
    <Card className="w-full bg-card border border-border shadow-md">
      <CardHeader className="border-b border-border pb-4 flex flex-row justify-between items-center">
        <CombatStyleTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          onReset={onReset}
        />
      </CardHeader>
      <CardContent className="pt-6">
        <Alert className="mb-6 bg-muted/40">
          <Info className="h-5 w-5 mr-2 text-primary" />
          <AlertDescription>
            Select your combat style, equipment, prayers, and target to calculate optimal DPS setup.
          </AlertDescription>
        </Alert>
        <CalculatorForms
          activeTab={activeTab}
          onTabChange={onTabChange}
          onCalculate={onCalculate}
          isCalculating={isCalculating}
        />
        {results && (
          <DpsResultDisplay
            params={params}
            results={results}
            appliedPassiveEffects={appliedPassiveEffects}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default Header;
