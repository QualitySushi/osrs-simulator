'use client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat Assistant',
  description: 'Interact with a bot to plan your setups and generate seeds.',
  alternates: {
    canonical: '/assistant',
  },
  openGraph: {
    title: 'Chat Assistant',
    description: 'Interact with a bot to plan your setups and generate seeds.',
    url: '/assistant',
    siteName: 'ScapeLab',
    images: ['/favicon.ico'],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat Assistant',
    description: 'Interact with a bot to plan your setups and generate seeds.',
  },
};

export default function AssistantPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4 pb-16">
      <h1 className="text-4xl font-bold mb-6 text-center">Chat Assistant</h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        This area will eventually let you chat with a bot to plan your next move and generate shareable seeds.
      </p>
      <div className="border rounded p-8 text-center">
        <p className="text-lg">Coming soon...</p>
      </div>
    </main>
  );
}
