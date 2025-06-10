'use client';
export const dynamic = 'force-dynamic';

import MultiBossSimulation from '@/components/features/simulation/MultiBossSimulation';


export default function SimulatePage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16">
      <h1 className="text-4xl font-bold mb-6 text-center">Multi-Boss Simulation</h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Test your current gear and stats against a group of bosses to see how your setup performs.
      </p>
      <MultiBossSimulation />
    </main>
  );
}
