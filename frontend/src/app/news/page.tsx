import type { Metadata } from 'next';
import NewsClientPage from './ClientPage';

export const metadata: Metadata = {
  title: 'News',
  description: 'Read community news and announcements for ScapeLab.',
  alternates: {
    canonical: '/news',
  },
  openGraph: {
    title: 'News',
    description: 'Read community news and announcements for ScapeLab.',
    url: '/news',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'News',
    description: 'Read community news and announcements for ScapeLab.',
  },
};

export default function NewsPage() {
  return <NewsClientPage />;
}
