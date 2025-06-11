'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '@/utils/safeStorage';
import {
  bossesApi,
  itemsApi,
  specialAttacksApi,
  passiveEffectsApi,
} from '@/services/api';
import {
  BossForm,
  BossSummary,
  ItemSummary,
  SpecialAttack,
  PassiveEffect,
} from '@/types/calculator';

interface ReferenceDataState {
  bosses: BossSummary[];
  bossForms: Record<number, BossForm[]>;
  items: ItemSummary[];
  specialAttacks: Record<string, SpecialAttack>;
  passiveEffects: Record<string, PassiveEffect>;
  initialized: boolean;
  loading: boolean;
  /** Progress of initial data loading between 0 and 1 */
  progress: number;
  timestamp: number;
  initData: () => Promise<void>;
  addBosses: (b: BossSummary[]) => void;
  addBossForms: (id: number, forms: BossForm[]) => void;
  addItems: (i: ItemSummary[]) => void;
  setSpecialAttacks: (a: Record<string, SpecialAttack>) => void;
  setPassiveEffects: (e: Record<string, PassiveEffect>) => void;
}

const REFERENCE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useReferenceDataStore = create<ReferenceDataState>()(
  persist(
    (set, get) => ({
      bosses: [],
      bossForms: {},
      items: [],
      specialAttacks: {},
      passiveEffects: {},
      initialized: false,
      loading: false,
      progress: 0,
      timestamp: 0,
      async initData() {
        if (get().initialized || get().loading) return;
        set({ loading: true, progress: 0, timestamp: Date.now() });
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
        set({ progress: 0.25 });
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
        set({ progress: 0.5 });
        const [specialAttacks, passiveEffects] = await Promise.all([
          specialAttacksApi.getAll().catch(() => ({})),
          passiveEffectsApi.getAll().catch(() => ({})),
        ]);

        set({ progress: 0.75 });

        set({
          bosses,
          items,
          specialAttacks,
          passiveEffects,
          initialized: true,
          loading: false,
          progress: 1,
        });
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
      setSpecialAttacks(a) {
        set({ specialAttacks: a });
      },
      setPassiveEffects(e) {
        set({ passiveEffects: e });
      },
    }),
    {
      name: 'osrs-reference-data',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        bosses: state.bosses,
        bossForms: state.bossForms,
        items: state.items,
        specialAttacks: state.specialAttacks,
        passiveEffects: state.passiveEffects,
        timestamp: state.timestamp,
      }),
      onRehydrateStorage: (state) => (stored) => {
        if (!stored) return;
        const expired = Date.now() - stored.timestamp > REFERENCE_TTL_MS;
        if (expired) {
          state.setState({ bosses: [], bossForms: {}, items: [], specialAttacks: {}, passiveEffects: {}, initialized: false, loading: false, progress: 0, timestamp: Date.now() });
        } else {
          state.setState({
            bosses: stored.bosses || [],
            bossForms: stored.bossForms || {},
            items: stored.items || [],
            specialAttacks: stored.specialAttacks || {},
            passiveEffects: stored.passiveEffects || {},
            initialized: false,
            loading: false,
            progress: 0,
          });
        }
      },
    }
  )
);
