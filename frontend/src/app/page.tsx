import { DpsCalculator } from '@/components/features/calculator/DpsCalculator';

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">
        OSRS DPS Calculator
      </h1>
      <DpsCalculator />
    </main>
  );
}