'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { safeStorage } from '@/utils/safeStorage';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'osrs-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = safeStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored === 'dark' ? 'dark' : 'light';
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const applyTheme = (value: Theme) => {
    safeStorage.setItem(STORAGE_KEY, value);
    setThemeState(value);
    document.documentElement.classList.toggle('dark', value === 'dark');
  };

  const toggleTheme = () => applyTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
