'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    // Optionally send this path to analytics service
    console.warn('Page not found:', pathname);
  }, [pathname]);

  return (
    <main id="main" className="container mx-auto py-8 px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-muted-foreground mb-8">
        Sorry, we couldn&apos;t find the page you were looking for.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded"
      >
        Go back home
      </Link>
    </main>
  );
}
