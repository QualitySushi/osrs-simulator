import { DpsCalculator} from '@/components/features/calculator/DpsCalculator';

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-8">
        OSRS DPS Calculator
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Calculate damage-per-second for Old School RuneScape combat styles.
        Select your combat style, equipment, and target to optimize your loadout.
      </p>
      <DpsCalculator />
    </main>
  );
}