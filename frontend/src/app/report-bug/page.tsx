import type { Metadata } from 'next';
import ReportBugClientPage from './ClientPage';

export const metadata: Metadata = {
  title: 'Report a Bug',
  description: 'Found an issue? Submit a bug report to help improve ScapeLab.',
  alternates: {
    canonical: '/report-bug',
  },
  openGraph: {
    title: 'Report a Bug',
    description: 'Found an issue? Submit a bug report to help improve ScapeLab.',
    url: '/report-bug',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Report a Bug',
    description: 'Found an issue? Submit a bug report to help improve ScapeLab.',
  },
};

export default function ReportBugPage() {
  return <ReportBugClientPage />;
}
