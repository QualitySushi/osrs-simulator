'use client';
import { SpecialAttackOptions } from '@/components/features/calculator/SpecialAttackOptions';
import { PassiveEffectOptions } from '@/components/features/calculator/PassiveEffectOptions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Special Attacks & Passive Effects',
  description: 'Browse every supported special attack and passive item effect.',
  alternates: {
    canonical: '/effects',
  },
  openGraph: {
    title: 'Special Attacks & Passive Effects',
    description: 'Browse every supported special attack and passive item effect.',
    url: '/effects',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Special Attacks & Passive Effects',
    description: 'Browse every supported special attack and passive item effect.',
  },
};

export default function EffectsPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16 space-y-6">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Special Attacks &amp; Passive Effects
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Browse all supported special attacks and passive item effects.
      </p>
      <SpecialAttackOptions />
      <PassiveEffectOptions />
    </main>
  );
}
