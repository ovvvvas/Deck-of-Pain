import type { ThemeAccentId, ThemeMode } from '../types/workout';

export interface ThemeAccentOption {
  id: ThemeAccentId;
  label: string;
  swatchLight: string;
  swatchDark: string;
}

export const DEFAULT_THEME_MODE: ThemeMode = 'system';
export const DEFAULT_ACCENT_ID: ThemeAccentId = 'ember';

export const THEME_ACCENTS: ThemeAccentOption[] = [
  { id: 'ember', label: 'Ember', swatchLight: '#e04f26', swatchDark: '#ff6b3d' },
  { id: 'crimson', label: 'Crimson', swatchLight: '#c81e32', swatchDark: '#e12d44' },
  { id: 'cobalt', label: 'Cobalt', swatchLight: '#1d5fd6', swatchDark: '#3576ef' },
  { id: 'emerald', label: 'Emerald', swatchLight: '#0e8a5c', swatchDark: '#139b68' },
  { id: 'teal', label: 'Teal', swatchLight: '#0c7c85', swatchDark: '#0f949e' },
  { id: 'bronze', label: 'Bronze', swatchLight: '#b45309', swatchDark: '#c96912' },
  { id: 'violet', label: 'Violet', swatchLight: '#6d3ae0', swatchDark: '#8252f2' },
  { id: 'rose', label: 'Rose', swatchLight: '#be185d', swatchDark: '#db2777' },
];

export function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isValidAccentId(value: unknown): value is ThemeAccentId {
  return (
    typeof value === 'string' &&
    THEME_ACCENTS.some((option) => option.id === value)
  );
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemPrefersDark: boolean
): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemPrefersDark ? 'dark' : 'light';
}
