import HomeHero from '@/components/layout/HomeHero';
import { InitReferenceData } from '@/components/layout/InitReferenceData';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | ScapeLab',
  description: 'Tools for optimizing your Old School RuneScape gameplay',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Home - ScapeLab',
    description: 'Tools for optimizing your Old School RuneScape gameplay',
    url: '/',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home | ScapeLab',
    description: 'Tools for optimizing your Old School RuneScape gameplay',
  },
};

export default function Home() {
  return (
    <>
      <HomeHero />
      <InitReferenceData />
      <main id="main" className="container mx-auto py-8 px-4 pb-16 text-center">
        <p className="text-lg">Choose a tool from the navigation above or the buttons below to get started.</p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Link href="/calculator">
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Calculator</CardTitle>
                <CardDescription>DPS and max hit calculations</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/best-in-slot">
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Best in Slot</CardTitle>
                <CardDescription>Find optimal gear</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/simulate">
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Simulation</CardTitle>
                <CardDescription>Run combat scenarios</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/import">
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Import</CardTitle>
                <CardDescription>Load saved setups</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </>
  );
}
