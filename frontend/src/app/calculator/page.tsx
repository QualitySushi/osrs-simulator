import { ImprovedDpsCalculator } from '@/components/features/calculator/ImprovedDpsCalculator';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DPS Calculator',
  description: 'Calculate max hits and DPS for any Old School RuneScape setup.',
  alternates: {
    canonical: '/calculator',
  },
  openGraph: {
    title: 'DPS Calculator',
    description: 'Calculate max hits and DPS for any Old School RuneScape setup.',
    url: '/calculator',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DPS Calculator',
    description: 'Calculate max hits and DPS for any Old School RuneScape setup.',
  },
};

export default function CalculatorPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16">
      <ImprovedDpsCalculator />
    </main>
  );
}
