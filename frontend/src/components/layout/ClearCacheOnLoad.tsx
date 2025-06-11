'use client';

import { useEffect } from 'react';

/**
 * Clears localStorage and Cache Storage when the
 * NEXT_PUBLIC_FORCE_CLEAR_CACHE environment variable is set to "true".
 * This is useful when testers have stale persisted data.
 */
export function ClearCacheOnLoad() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FORCE_CLEAR_CACHE === 'true') {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(key => caches.delete(key));
        });
      }
    }
  }, []);

  return null;
}
