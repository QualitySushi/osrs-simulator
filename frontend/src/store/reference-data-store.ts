'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { bossesApi, itemsApi } from '@/services/api';
import { Boss, Item } from '@/types/calculator';

interface ReferenceDataState {
  bosses: Boss[];
  items: Item[];
  initialized: boolean;
  timestamp: number;
  initData: () => Promise<void>;
  addBosses: (b: Boss[]) => void;
  addItems: (i: Item[]) => void;
}

const REFERENCE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useReferenceDataStore = create<ReferenceDataState>()(
  persist(
    (set, get) => ({
      bosses: [],
      items: [],
      initialized: false,
      timestamp: 0,
      async initData() {
        if (get().initialized) return;
        set({ initialized: true, timestamp: Date.now() });
        const pageSize = 50;
        let page = 1;
        while (true) {
          try {
            const data = await bossesApi.getAllBosses({ page, page_size: pageSize });
            if (!data.length) break;
            set((state) => ({ bosses: [...state.bosses, ...data] }));
            if (data.length < pageSize) break;
            page += 1;
          } catch {
            break;
          }
        }
        page = 1;
        while (true) {
          try {
            const data = await itemsApi.getAllItems({
              page,
              page_size: pageSize,
              combat_only: true,
              tradeable_only: false,
            });
            if (!data.length) break;
            set((state) => ({ items: [...state.items, ...data] }));
            if (data.length < pageSize) break;
            page += 1;
          } catch {
            break;
          }
        }
      },
      addBosses(b) {
        set((state) => ({ bosses: [...state.bosses, ...b] }));
      },
      addItems(i) {
        set((state) => ({ items: [...state.items, ...i] }));
      },
    }),
    {
      name: 'osrs-reference-data',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bosses: state.bosses,
        items: state.items,
        timestamp: state.timestamp,
      }),
      onRehydrateStorage: (state) => (stored) => {
        if (!stored) return;
        const expired = Date.now() - stored.timestamp > REFERENCE_TTL_MS;
        if (expired) {
          state.setState({ bosses: [], items: [], initialized: false, timestamp: Date.now() });
        } else {
          state.setState({ initialized: true });
        }
      },
    }
  )
);
