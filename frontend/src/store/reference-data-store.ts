'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '@/utils/safeStorage';
import {
  npcsApi,
  itemsApi,
  specialAttacksApi,
  passiveEffectsApi,
} from '@/services/api';
import {
  NpcForm,
  NpcSummary,
  ItemSummary,
  SpecialAttack,
  PassiveEffect,
} from '@/types/calculator';

interface ReferenceDataState {
  npcs: NpcSummary[];
  npcForms: Record<number, NpcForm[]>;
  items: ItemSummary[];
  specialAttacks: Record<string, SpecialAttack>;
  passiveEffects: Record<string, PassiveEffect>;
  initialized: boolean;
  loading: boolean;
  /** Progress of initial data loading between 0 and 1 */
  progress: number;
  /** Indicates if loading failed */
  error: boolean;
  timestamp: number;
  initData: () => Promise<void>;
  addNpces: (b: NpcSummary[]) => void;
  addNpcForms: (id: number, forms: NpcForm[]) => void;
  addItems: (i: ItemSummary[]) => void;
  setSpecialAttacks: (a: Record<string, SpecialAttack>) => void;
  setPassiveEffects: (e: Record<string, PassiveEffect>) => void;
}

const REFERENCE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useReferenceDataStore = create<ReferenceDataState>()(
  persist(
    (set, get) => ({
      npcs: [],
      npcForms: {},
      items: [],
      specialAttacks: {},
      passiveEffects: {},
      initialized: false,
      loading: false,
      error: false,
      progress: 0,
      timestamp: 0,
      async initData() {
        if (get().initialized || get().loading) return;
        set({ loading: true, progress: 0, timestamp: Date.now(), error: false });
        const pageSize = 50;
        let page = 1;
        const npcs: NpcSummary[] = [];
        let error = false;
        while (true) {
          try {
            const data = await npcsApi.getAllNpces({ page, page_size: pageSize });
            if (!data.length) break;
            npcs.push(...data);
            if (data.length < pageSize) break;
            page += 1;
          } catch {
            error = true;
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
            error = true;
            break;
          }
        }
        set({ progress: 0.5 });
        const [specialAttacks, passiveEffects] = await Promise.all([
          specialAttacksApi.getAll().catch(() => {
            error = true;
            return {};
          }),
          passiveEffectsApi.getAll().catch(() => {
            error = true;
            return {};
          }),
        ]);

        set({ progress: 0.75 });

        set({
          npcs,
          items,
          specialAttacks,
          passiveEffects,
          initialized: !error,
          loading: false,
          error,
          progress: 1,
        });
      },
      addNpces(b) {
        set((state) => ({ npcs: [...state.npcs, ...b] }));
      },
      addNpcForms(id, forms) {
        const hasStats = (f: NpcForm) =>
          f.defence_level !== undefined && f.defence_level !== null;
        set((state) => ({
          npcForms: { ...state.npcForms, [id]: forms.filter(hasStats) }
        }));
      },
      addItems(i) {
        set((state) => ({ items: [...state.items, ...i.filter(it => it.has_combat_stats)] }));
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
        npcs: state.npcs,
        npcForms: state.npcForms,
        items: state.items,
        specialAttacks: state.specialAttacks,
        passiveEffects: state.passiveEffects,
        timestamp: state.timestamp,
      }),
      onRehydrateStorage: (state) => (stored) => {
        if (!stored) return;
        const expired = Date.now() - stored.timestamp > REFERENCE_TTL_MS;
        if (expired) {
          state.setState({ npcs: [], npcForms: {}, items: [], specialAttacks: {}, passiveEffects: {}, initialized: false, loading: false, progress: 0, error: false, timestamp: Date.now() });
        } else {
          state.setState({
            npcs: stored.npcs || [],
            npcForms: stored.npcForms || {},
            items: stored.items || [],
            specialAttacks: stored.specialAttacks || {},
            passiveEffects: stored.passiveEffects || {},
            initialized: false,
            loading: false,
            progress: 0,
            error: false,
          });
        }
      },
    }
  )
);
