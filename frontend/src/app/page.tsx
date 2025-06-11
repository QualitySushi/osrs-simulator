import HomeHero from '@/components/layout/HomeHero';
import { InitReferenceData } from '@/components/layout/InitReferenceData';
import { ReferenceDataOverlay } from '@/components/layout/ReferenceDataOverlay';
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
  const articleSummaries = [
    {
      id: 1,
      title: 'Yama Storms Into Gielinor',
      author: 'ScapeLab Reporter',
      date: '2025-05-14',
      image: '/landscape-placeholder.svg',
    },
    {
      id: 2,
      title: 'Community Cheers for Stackable Clues',
      author: 'ScapeLab Reporter',
      date: '2025-05-30',
      image: '/landscape-placeholder.svg',
    },
    {
      id: 3,
      title: 'A Mixed June for OSRS Events',
      author: 'ScapeLab Reporter',
      date: '2025-06-08',
      image: '/landscape-placeholder.svg',
    },
    {
      id: 4,
      title: "Reddit's Latest Running Jokes",
      author: 'ScapeLab Reporter',
      date: '2025-06-10',
      image: '/landscape-placeholder.svg',
    },
  ];
  return (
    <>
      <HomeHero />
      <InitReferenceData />
      <ReferenceDataOverlay />
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
        <h2 className="mt-16 mb-6 text-2xl font-bold">Latest News</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {articleSummaries.map(article => (
            <Link key={article.id} href={`/news#article-${article.id}`}>
              <Card className="hover:border-primary transition-colors text-left">
                <img
                  src={article.image}
                  alt=""
                  className="w-full h-32 object-cover rounded-t"
                />
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    {article.title}
                  </CardTitle>
                  <CardDescription>
                    {article.author} - {new Date(article.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
