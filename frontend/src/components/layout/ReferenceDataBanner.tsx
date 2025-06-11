'use client';

import { Loader2 } from 'lucide-react';
import { useReferenceDataStore } from '@/store/reference-data-store';

export function ReferenceDataBanner() {
  const loading = useReferenceDataStore((s) => s.loading);
  const initialized = useReferenceDataStore((s) => s.initialized);

  if (!loading && initialized) return null;

  return (
    <div className="w-full bg-muted text-muted-foreground text-sm py-1 flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Loading game data...</span>
    </div>
  );
}
