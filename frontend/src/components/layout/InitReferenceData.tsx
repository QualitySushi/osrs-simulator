'use client';
import { useEffect } from 'react';
import { useReferenceDataStore } from '@/store/reference-data-store';

export function InitReferenceData() {
  const initData = useReferenceDataStore((s) => s.initData);

  useEffect(() => {
    initData();
  }, [initData]);

  return null;
}
