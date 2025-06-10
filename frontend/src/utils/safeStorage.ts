import { StateStorage } from 'zustand/middleware';

/**
 * A wrapper around browser localStorage that gracefully handles quota errors.
 */
export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn('Failed to persist state', err);
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  }
};
