'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '@/utils/safeStorage';
import { bossesApi, itemsApi } from '@/services/api';
import { Boss, BossForm, Item } from '@/types/calculator';

interface ReferenceDataState {
  bosses: Boss[];
  bossForms: Record<number, BossForm[]>;
  items: Item[];
  initialized: boolean;
  timestamp: number;
  initData: () => Promise<void>;
  addBosses: (b: Boss[]) => void;
  addBossForms: (id: number, forms: BossForm[]) => void;
  addItems: (i: Item[]) => void;
}

const REFERENCE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useReferenceDataStore = create<ReferenceDataState>()(
  persist(
    (set, get) => ({
      bosses: [],
      bossForms: {},
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
            for (const b of data) {
              try {
                const forms = await bossesApi.getBossForms(b.id);
                if (forms.length) {
                  set((state) => ({ bossForms: { ...state.bossForms, [b.id]: forms } }));
                }
              } catch {
                /* ignore */
              }
            }
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
        bosses: state.bosses,
        bossForms: state.bossForms,
        items: state.items,
        timestamp: state.timestamp,
      }),
      onRehydrateStorage: (state) => (stored) => {
        if (!stored) return;
        const expired = Date.now() - stored.timestamp > REFERENCE_TTL_MS;
        if (expired) {
          state.setState({ bosses: [], bossForms: {}, items: [], initialized: false, timestamp: Date.now() });
        } else {
          state.setState({ initialized: true });
        }
      },
    }
  )
);
