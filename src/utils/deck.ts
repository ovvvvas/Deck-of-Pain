import { t } from '../data/i18n';
import type {
  Card,
  FaceOverrides,
  Preset,
  Rank,
  SuitIndex,
  WorkoutLog,
} from '../types/workout';

export const SUITS = ['♠', '♥', '♦', '♣'] as const;

export const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export const isRedSuit = (suitIndex: number): boolean =>
  suitIndex === 1 || suitIndex === 2;

export function baseRepsForRank(rank: Rank): number {
  if (rank === 'A') return 15;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return Number(rank) || 0;
}

export function cardReps(
  rank: Rank,
  scale: number,
  faceOverrides?: FaceOverrides
): number {
  if (rank === '2') {
    return 2;
  }
  if (
    faceOverrides &&
    (rank === 'A' || rank === 'K' || rank === 'Q' || rank === 'J') &&
    faceOverrides[rank] != null
  ) {
    return faceOverrides[rank]!;
  }
  const base = baseRepsForRank(rank);
  const scaled = Math.round(base * scale);
  return Math.min(19, Math.max(2, scaled));
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function buildDeck(
  config: { scale: number; jr?: number; jrs?: [number, number]; jokers?: [string, string]; fx?: FaceOverrides },
  halfDeck: boolean
): Card[] {
  const jokerRepsArr = config.jrs ?? [config.jr ?? 50, config.jr ?? 50];
  const deck: Card[] = [];

  for (let suit = 0; suit < 4; suit++) {
    for (const rank of RANKS) {
      deck.push({
        r: rank,
        s: suit as SuitIndex,
        reps: cardReps(rank, config.scale, config.fx),
      });
    }
  }

  if (jokerRepsArr[0] > 0) {
    deck.push({ r: 'JK', s: 4, j: true, reps: jokerRepsArr[0], jokerIndex: 0 });
  }
  if (jokerRepsArr[1] > 0) {
    deck.push({ r: 'JK', s: 4, j: true, reps: jokerRepsArr[1], jokerIndex: 1 });
  }

  if (!halfDeck) {
    return shuffleInPlace(deck);
  }

  const suitCounts = shuffleInPlace([7, 7, 6, 6]);
  const halfCards = ([0, 1, 2, 3] as SuitIndex[]).flatMap((suit) =>
    shuffleInPlace(deck.filter((c) => c.s === suit)).slice(0, suitCounts[suit])
  );

  const jokers = shuffleInPlace(deck.filter((c) => c.j));
  if (jokers[0]) halfCards.push(jokers[0]);

  return shuffleInPlace(halfCards);
}

export function totalDeckReps(deck: Card[]): number {
  return deck.reduce((sum, card) => sum + card.reps, 0);
}

export function fullDeckReps(config: {
  scale: number;
  jr?: number;
  jrs?: [number, number];
  fx?: FaceOverrides;
}): number {
  const jokerRepsArr = config.jrs ?? [config.jr ?? 50, config.jr ?? 50];
  const standardReps =
    4 *
    RANKS.reduce(
      (sum, rank) => sum + cardReps(rank, config.scale, config.fx),
      0
    );
  const j1 = jokerRepsArr[0] > 0 ? jokerRepsArr[0] : 0;
  const j2 = jokerRepsArr[1] > 0 ? jokerRepsArr[1] : 0;
  return standardReps + j1 + j2;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function calendarDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function computeStreak(logs: WorkoutLog[]): number {
  const days = new Set(logs.map((entry) => calendarDayKey(entry.d)));
  let count = 0;
  const cursor = new Date();
  if (!days.has(calendarDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(calendarDayKey(cursor.getTime()))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function getWeekStartTimestamp(timestamp = Date.now()): number {
  const d = new Date(timestamp);
  const diffToMonday = (d.getDay() + 6) % 7;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - diffToMonday
  ).getTime();
}

export function computeWeeklyReps(
  logs: WorkoutLog[],
  nowMs = Date.now()
): { reps: number; sessions: number } {
  const weekStart = getWeekStartTimestamp(nowMs);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  let reps = 0;
  let sessions = 0;
  for (const log of logs) {
    if (log.d >= weekStart && log.d < weekEnd) {
      reps += log.reps;
      sessions++;
    }
  }
  return { reps, sessions };
}

export function exerciseName(preset: Preset, card: Card): string {
  if (card.j || card.s === 4) {
    const jIndex = card.jokerIndex ?? 0;
    const jNames = preset.jokers || [preset.joker || 'Burpees', preset.joker || 'Burpees'];
    return t(jNames[jIndex] || preset.joker || 'Burpees');
  }
  const raw = preset.ex[card.s] || 'Movement';
  return t(raw);
}

export function cleanLogEntry(entry: WorkoutLog): WorkoutLog {
  if (
    entry.cs &&
    !(
      Array.isArray(entry.cs) &&
      entry.cs.every(
        (row) =>
          Array.isArray(row) &&
          row.length >= 3 &&
          row.slice(0, 3).every((val) => typeof val === 'number' && Number.isFinite(val))
      )
    )
  ) {
    const { cs: _invalid, ...rest } = entry;
    return rest;
  }
  return entry;
}

export function getPresetMovementNames(
  presetName: string,
  presets: Preset[],
  savedMoves?: string[]
): string[] {
  if (savedMoves && savedMoves.length >= 4) {
    return savedMoves;
  }
  const found = presets.find((p) => p.name === presetName);
  const suits = found
    ? [...found.ex]
    : ['Suit 1', 'Suit 2', 'Suit 3', 'Suit 4'];
  const j1 = found?.jokers?.[0] || found?.joker || 'Burpees';
  const j2 = found?.jokers?.[1] || found?.joker || 'Jump Squats';
  return [...suits, j1, j2];
}

export const JOKER_SVG = './joker-icon.svg';
