'use client';
import { PresetSelector } from '@/components/features/calculator/PresetSelector';
import { Visualizations } from '@/components/features/calculator/Visualizations';

export default function PresetsPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16 space-y-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Presets & Visualizations</h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Manage your saved setups and view their performance.
      </p>
      <PresetSelector className="flex-grow" />
      <Visualizations />
    </main>
  );
}
