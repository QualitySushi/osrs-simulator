import { BestInSlotCalculator } from '@/components/features/calculator/BestInSlotCalculator';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Best in Slot Finder',
  description: 'Determine the optimal gear setup for your stats and target.',
  alternates: {
    canonical: '/best-in-slot',
  },
  openGraph: {
    title: 'Best in Slot Finder',
    description: 'Determine the optimal gear setup for your stats and target.',
    url: '/best-in-slot',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best in Slot Finder',
    description: 'Determine the optimal gear setup for your stats and target.',
  },
};

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
