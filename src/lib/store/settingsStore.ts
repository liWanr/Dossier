'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'settings-v1';

export type ColorMode = 'default' | 'colorblind';

interface PersistedSettings {
  colorMode: ColorMode;
  highContrast: boolean;
}

interface SettingsStore extends PersistedSettings {
  setColorMode: (m: ColorMode) => void;
  setHighContrast: (v: boolean) => void;
  hydrate: () => void;
}

const DEFAULT: PersistedSettings = { colorMode: 'default', highContrast: false };

function load(): PersistedSettings {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      colorMode: parsed.colorMode === 'colorblind' ? 'colorblind' : 'default',
      highContrast: !!parsed.highContrast,
    };
  } catch {
    return DEFAULT;
  }
}

function save(s: PersistedSettings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT,
  setColorMode: (colorMode) => {
    set({ colorMode });
    const { highContrast } = get();
    save({ colorMode, highContrast });
  },
  setHighContrast: (highContrast) => {
    set({ highContrast });
    const { colorMode } = get();
    save({ colorMode, highContrast });
  },
  hydrate: () => {
    const persisted = load();
    set(persisted);
  },
}));
