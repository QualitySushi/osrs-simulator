import type { Metadata } from 'next';
import ImportClientPage from './ClientPage';

export const metadata: Metadata = {
  title: 'Import Profile',
  description: 'Load a saved combat profile using a shareable seed.',
  alternates: {
    canonical: '/import',
  },
  openGraph: {
    title: 'Import Profile',
    description: 'Load a saved combat profile using a shareable seed.',
    url: '/import',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Import Profile',
    description: 'Load a saved combat profile using a shareable seed.',
  },
};

export default function ImportPage() {
  return <ImportClientPage />;
}
