'use client';

import { Loader2, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';

export function ReferenceDataBanner() {
  const loading = useReferenceDataStore((s) => s.loading);
  const initialized = useReferenceDataStore((s) => s.initialized);
  const error = useReferenceDataStore((s) => s.error);
  const progress = useReferenceDataStore((s) => s.progress);

  const [visible, setVisible] = useState(loading || !initialized);

  useEffect(() => {
    if (loading) {
      setVisible(true);
    } else if (initialized && !error) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    } else if (error) {
      setVisible(true);
    }
  }, [loading, initialized, error]);

  if (!visible) return null;

  const done = initialized && !loading && !error;

  const bannerClass = done
    ? 'bg-green-600 text-green-50'
    : error
    ? 'bg-red-600 text-red-50'
    : 'bg-muted text-muted-foreground';

  return (
    <div
      className={`w-full text-sm py-1 flex flex-col items-center justify-center gap-1 ${bannerClass}`}
    >
      <div className="flex items-center gap-2">
        {done ? (
          <Check className="h-4 w-4" />
        ) : error ? (
          <X className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <span>
          {done
            ? 'Game data loaded'
            : error
            ? 'Failed to load game data'
            : 'Loading game data...'}
        </span>
      </div>
      {!done && (
        <div className="w-48 h-1 bg-gray-500 rounded">
          <div
            className={`h-full rounded ${error ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
