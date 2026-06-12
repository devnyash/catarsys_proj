import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'catarsys_theme';
const SETTINGS_KEY = 'catarsys_settings';

function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch (e) {}
  // Fall back to the value saved by the settings page, if any.
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system')) {
        return s.theme;
      }
    }
  } catch (e) {}
  return 'dark';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return theme;
}

export function applyThemeToDom(theme: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

function persist(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {}
  // Keep the settings object in sync so the rest of the app stays consistent.
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    s.theme = theme;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) {}
}

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  resolved: resolveTheme(getStoredTheme()),
  setTheme: (theme) => {
    persist(theme);
    applyThemeToDom(theme);
    set({ theme, resolved: resolveTheme(theme) });
  },
  toggleTheme: () => {
    const current = get().theme;
    const next: Theme = resolveTheme(current) === 'dark' ? 'light' : 'dark';
    persist(next);
    applyThemeToDom(next);
    set({ theme: next, resolved: resolveTheme(next) });
  },
}));

// Apply the stored theme as early as the module is imported.
if (typeof window !== 'undefined') {
  applyThemeToDom(getStoredTheme());
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') {
        applyThemeToDom('system');
        useThemeStore.setState({ resolved: resolveTheme('system') });
      }
    });
  }
}
