'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { SonnerProvider } from '@/components/ui/sonner-provider';
import { ThemeProvider } from '@/context/theme-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <SonnerProvider />
      </QueryClientProvider>
    </ThemeProvider>
  );
}