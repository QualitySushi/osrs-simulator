import { PresetSelector } from '@/components/features/calculator/PresetSelector';
import { Visualizations } from '@/components/features/calculator/Visualizations';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presets & Visualizations',
  description: 'Manage saved loadouts and visualize their performance.',
  alternates: {
    canonical: '/presets',
  },
  openGraph: {
    title: 'Presets & Visualizations',
    description: 'Manage saved loadouts and visualize their performance.',
    url: '/presets',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Presets & Visualizations',
    description: 'Manage saved loadouts and visualize their performance.',
  },
};

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
