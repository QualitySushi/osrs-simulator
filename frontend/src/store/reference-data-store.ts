'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '@/utils/safeStorage';
import { bossesApi, itemsApi } from '@/services/api';
import { BossForm, BossSummary, ItemSummary } from '@/types/calculator';

interface ReferenceDataState {
  bosses: BossSummary[];
  bossForms: Record<number, BossForm[]>;
  items: ItemSummary[];
  initialized: boolean;
  loading: boolean;
  timestamp: number;
  initData: () => Promise<void>;
  addBosses: (b: BossSummary[]) => void;
  addBossForms: (id: number, forms: BossForm[]) => void;
  addItems: (i: ItemSummary[]) => void;
}

const REFERENCE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useReferenceDataStore = create<ReferenceDataState>()(
  persist(
    (set, get) => ({
      bosses: [],
      bossForms: {},
      items: [],
      initialized: false,
      loading: false,
      timestamp: 0,
      async initData() {
        if (get().initialized || get().loading) return;
        set({ loading: true, timestamp: Date.now() });
        const pageSize = 50;
        let page = 1;
        const bosses: BossSummary[] = [];
        while (true) {
          try {
            const data = await bossesApi.getAllBosses({ page, page_size: pageSize });
            if (!data.length) break;
            bosses.push(...data);
            if (data.length < pageSize) break;
            page += 1;
          } catch {
            break;
          }
        }
        page = 1;
        const items: ItemSummary[] = [];
        while (true) {
          try {
            const data = await itemsApi.getAllItems({
              page,
              page_size: pageSize,
              combat_only: true,
              tradeable_only: false,
            });
            if (!data.length) break;
            items.push(...data);
            if (data.length < pageSize) break;
            page += 1;
          } catch {
            break;
          }
        }
        set({ bosses, items, initialized: true, loading: false });
      },
      addBosses(b) {
        set((state) => ({ bosses: [...state.bosses, ...b] }));
      },
      addBossForms(id, forms) {
        set((state) => ({ bossForms: { ...state.bossForms, [id]: forms } }));
      },
      addItems(i) {
        set((state) => ({ items: [...state.items, ...i] }));
      },
    }),
    {
      name: 'osrs-reference-data',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        bosses: state.bosses.map(b => ({ id: b.id, name: b.name })),
        items: state.items.map(i => ({ id: i.id, name: i.name })),
        timestamp: state.timestamp,
      }),
      onRehydrateStorage: (state) => (stored) => {
        if (!stored) return;
        const expired = Date.now() - stored.timestamp > REFERENCE_TTL_MS;
        if (expired) {
          state.setState({ bosses: [], bossForms: {}, items: [], initialized: false, loading: false, timestamp: Date.now() });
        } else {
          state.setState({ bosses: stored.bosses, items: stored.items, initialized: false, loading: false });
        }
      },
    }
  )
);
