'use client';
import { ImprovedDpsCalculator } from '@/components/features/calculator/ImprovedDpsCalculator';
import { BossDpsTable } from '@/components/features/calculator/BossDpsTable';
import { UpgradeList } from '@/components/features/calculator/UpgradeList';

export default function SimulationPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16">
      <h1 className="text-4xl font-bold text-center mb-8">DPS Simulation</h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Calculate DPS and explore gear upgrades. Run a calculation then view suggested improvements.
      </p>
      <ImprovedDpsCalculator />
      <div className="mt-8 space-y-6">
        <BossDpsTable />
        <UpgradeList />
      </div>
    </main>
  );
}
