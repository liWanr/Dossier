'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'settings-v1';

export type ColorMode = 'default' | 'colorblind';
export type ThemePref = 'auto' | 'light' | 'dark';

interface PersistedSettings {
  colorMode: ColorMode;
  highContrast: boolean;
  theme: ThemePref;
}

interface SettingsStore extends PersistedSettings {
  // Resolved theme actually being applied right now (auto → light or dark).
  resolvedTheme: 'light' | 'dark';
  setColorMode: (m: ColorMode) => void;
  setHighContrast: (v: boolean) => void;
  setTheme: (t: ThemePref) => void;
  hydrate: () => void;
}

const DEFAULT: PersistedSettings = { colorMode: 'default', highContrast: false, theme: 'auto' };

function load(): PersistedSettings {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      colorMode: parsed.colorMode === 'colorblind' ? 'colorblind' : 'default',
      highContrast: !!parsed.highContrast,
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : 'auto',
    };
  } catch {
    return DEFAULT;
  }
}

function save(s: PersistedSettings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Apply theme to the document by setting `data-theme="light|dark"` on <html>.
// All Tailwind dark: variants key off this attribute via @custom-variant in
// globals.css.
function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'auto') return pref;
  if (typeof window === 'undefined') return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolved;
  // Hint to UA for native form controls and scroll bars
  document.documentElement.style.colorScheme = resolved;
}

let _mqListener: ((e: MediaQueryListEvent) => void) | null = null;
function bindAutoListener(get: () => SettingsStore, set: (p: Partial<SettingsStore>) => void) {
  if (typeof window === 'undefined') return;
  if (_mqListener) {
    try { window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', _mqListener); } catch { /* ignore */ }
    _mqListener = null;
  }
  if (get().theme !== 'auto') return;
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    _mqListener = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      applyTheme(resolved);
      set({ resolvedTheme: resolved });
    };
    mq.addEventListener('change', _mqListener);
  } catch { /* ignore */ }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT,
  resolvedTheme: 'light',
  setColorMode: (colorMode) => {
    set({ colorMode });
    const { highContrast, theme } = get();
    save({ colorMode, highContrast, theme });
  },
  setHighContrast: (highContrast) => {
    set({ highContrast });
    const { colorMode, theme } = get();
    save({ colorMode, highContrast, theme });
  },
  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
    const { colorMode, highContrast } = get();
    save({ colorMode, highContrast, theme });
    bindAutoListener(get, set);
  },
  hydrate: () => {
    const persisted = load();
    const resolved = resolveTheme(persisted.theme);
    applyTheme(resolved);
    set({ ...persisted, resolvedTheme: resolved });
    bindAutoListener(get, set);
  },
}));
