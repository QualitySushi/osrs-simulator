'use client';

import { Loader2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';

export function ReferenceDataBanner() {
  const loading = useReferenceDataStore((s) => s.loading);
  const initialized = useReferenceDataStore((s) => s.initialized);
  const progress = useReferenceDataStore((s) => s.progress);

  const [visible, setVisible] = useState(loading || !initialized);

  useEffect(() => {
    if (loading) {
      setVisible(true);
    } else if (initialized) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [loading, initialized]);

  if (!visible) return null;

  const done = initialized && !loading;

  return (
    <div
      className={`w-full text-sm py-1 flex flex-col items-center justify-center gap-1 ${done ? 'bg-green-600 text-green-50' : 'bg-muted text-muted-foreground'}`}
    >
      <div className="flex items-center gap-2">
        {done ? (
          <Check className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <span>{done ? 'Game data loaded' : 'Loading game data...'}</span>
      </div>
      {!done && (
        <div className="w-48 h-1 bg-gray-500 rounded">
          <div className="h-full bg-green-500 rounded" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
