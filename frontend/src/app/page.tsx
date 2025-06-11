// page.tsx - Updated version with proper bottom padding on main content
import { ImprovedDpsCalculator } from '@/components/features/calculator/ImprovedDpsCalculator';

export default function Home() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16"> {/* Added extra bottom padding */}
      <h1 className="text-4xl font-bold text-center mb-8">
        ScapeLab DPS Calculator
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Calculate damage-per-second for Old School RuneScape combat styles.
        Select your combat style, equipment, and target to optimize your loadout.
      </p>
      <ImprovedDpsCalculator />
    </main>
  );
}