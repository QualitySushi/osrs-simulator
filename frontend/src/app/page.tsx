// Home page with hero section and embedded calculator
import { ImprovedDpsCalculator } from '@/components/features/calculator/ImprovedDpsCalculator';
import HomeHero from '@/components/layout/HomeHero';

export default function Home() {
  return (
    <>
      <HomeHero />
      <main id="main" className="container mx-auto py-8 px-4 pb-16">
        <ImprovedDpsCalculator />
      </main>
    </>
  );
}
