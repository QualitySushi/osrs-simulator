'use client';

import { BestInSlotCalculator } from '@/components/features/calculator/BestInSlotCalculator';

export default function BestInSlotPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Best in Slot Finder
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Quickly determine the optimal gear for your stats and target.
      </p>
      <BestInSlotCalculator />
    </main>
  );
}
