'use client';

import { create } from 'zustand';
// No persistence to avoid localStorage quota errors
import { bossesApi, itemsApi } from '@/services/api';
import { Boss, BossForm, Item } from '@/types/calculator';
import { safeStorage } from '@/utils/safeStorage';

// Clean up old persisted data that could exceed the quota
safeStorage.removeItem('osrs-reference-data');

interface ReferenceDataState {
  bosses: Boss[];
  bossForms: Record<number, BossForm[]>;
  items: Item[];
  initialized: boolean;
  initData: () => Promise<void>;
  addBosses: (b: Boss[]) => void;
  addBossForms: (id: number, forms: BossForm[]) => void;
  addItems: (i: Item[]) => void;
}


export const useReferenceDataStore = create<ReferenceDataState>()(
  (set, get) => ({
    bosses: [],
    bossForms: {},
    items: [],
    initialized: false,
    async initData() {
      if (get().initialized) return;
      set({ initialized: true });
      const pageSize = 50;
      let page = 1;
        while (true) {
          try {
            const data = await bossesApi.getBossesWithForms({ page, page_size: pageSize });
            if (!data.length) break;
            set((state) => ({ bosses: [...state.bosses, ...data] }));
            const formsMap: Record<number, BossForm[]> = {};
            for (const b of data) {
              if (b.forms && b.forms.length) {
                formsMap[b.id] = b.forms;
              }
            }
            if (Object.keys(formsMap).length) {
              set((state) => ({ bossForms: { ...state.bossForms, ...formsMap } }));
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
        set((state) => {
          const map = new Map(state.bosses.map((boss) => [boss.id, boss]));
          b.forEach((boss) => map.set(boss.id, boss));
          return { bosses: Array.from(map.values()) };
        });
      },
      addBossForms(id, forms) {
        set((state) => ({ bossForms: { ...state.bossForms, [id]: forms } }));
      },
      addItems(i) {
        set((state) => {
          const map = new Map(state.items.map((item) => [item.id, item]));
          i.forEach((item) => map.set(item.id, item));
          return { items: Array.from(map.values()) };
        });
      },
    })
);

