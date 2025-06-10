import { StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

/**
 * Zustand storage backed by IndexedDB using idb-keyval.
 * Falls back silently if operations fail.
 */
export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      return await get<string | null>(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    try {
      await set(name, value);
    } catch (err) {
      console.warn('Failed to persist state', err);
    }
  },
  async removeItem(name) {
    try {
      await del(name);
    } catch {
      /* ignore */
    }
  }
};
