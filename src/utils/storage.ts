import { LEVELS } from '../data/movements';
import type { Preset, SavedSession, UserSettings, WorkoutLog } from '../types/workout';
import { cardReps, cleanLogEntry } from './deck';

export function loadWorkoutLogs(): WorkoutLog[] {
  try {
    const raw = JSON.parse(localStorage.getItem('dop-log') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (entry) =>
          entry &&
          typeof entry.secs === 'number' &&
          typeof entry.reps === 'number' &&
          typeof entry.preset === 'string'
      )
      .map(cleanLogEntry);
  } catch {
    return [];
  }
}

export function saveWorkoutLogs(logs: WorkoutLog[]): void {
  try {
    localStorage.setItem('dop-log', JSON.stringify(logs));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadUserSettings(): UserSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem('dop-set') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem('dop-set', JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadSavedSession(presets: Preset[]): SavedSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('dop-sess') || 'null');
    if (
      parsed &&
      Array.isArray(parsed.deck) &&
      parsed.deck.length > 0 &&
      Array.isArray(parsed.splits) &&
      typeof parsed.idx === 'number' &&
      presets.some((p) => p.id === parsed.pid)
    ) {
      const sess = parsed as SavedSession;
      const lvlCfg = LEVELS[sess.lv in LEVELS ? sess.lv : 's'];
      sess.deck = sess.deck.map((card) =>
        card.j ? card : { ...card, reps: cardReps(card.r, 1, lvlCfg.faceOverrides) }
      );
      return sess;
    }
    localStorage.removeItem('dop-sess');
  } catch {
    // Ignore invalid session data
  }
  return null;
}

export function persistSavedSession(session: SavedSession): void {
  try {
    localStorage.setItem('dop-sess', JSON.stringify(session));
  } catch {
    // Ignore storage quota issues
  }
}

export function clearSavedSession(): void {
  try {
    localStorage.removeItem('dop-sess');
  } catch {
    // Ignore storage errors
  }
}
