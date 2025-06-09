'use client';

import { create } from 'zustand';
import { bossesApi, itemsApi } from '@/services/api';
import { Boss, Item } from '@/types/calculator';

interface ReferenceDataState {
  bosses: Boss[];
  items: Item[];
  initialized: boolean;
  initData: () => Promise<void>;
  addBosses: (b: Boss[]) => void;
  addItems: (i: Item[]) => void;
}

export const useReferenceDataStore = create<ReferenceDataState>((set, get) => ({
  bosses: [],
  items: [],
  initialized: false,
  async initData() {
    if (get().initialized) return;
    set({ initialized: true });
    const pageSize = 50;
    let page = 1;
    // Fetch bosses
    while (true) {
      try {
        const data = await bossesApi.getAllBosses({ page, page_size: pageSize });
        if (!data.length) break;
        set(state => ({ bosses: [...state.bosses, ...data] }));
        if (data.length < pageSize) break;
        page += 1;
      } catch {
        break;
      }
    }
    page = 1;
    // Fetch items (combat only for dropdowns)
    while (true) {
      try {
        const data = await itemsApi.getAllItems({
          page,
          page_size: pageSize,
          combat_only: true,
          tradeable_only: false,
        });
        if (!data.length) break;
        set(state => ({ items: [...state.items, ...data] }));
        if (data.length < pageSize) break;
        page += 1;
      } catch {
        break;
      }
    }
  },
  addBosses(b) {
    set(state => ({ bosses: [...state.bosses, ...b] }));
  },
  addItems(i) {
    set(state => ({ items: [...state.items, ...i] }));
  },
}));
