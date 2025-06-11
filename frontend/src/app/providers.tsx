'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { SonnerProvider } from '@/components/ui/sonner-provider';
import { ClearCacheOnLoad } from '@/components/layout/ClearCacheOnLoad';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClearCacheOnLoad />
      {children}
      <SonnerProvider />
    </QueryClientProvider>
  );
}