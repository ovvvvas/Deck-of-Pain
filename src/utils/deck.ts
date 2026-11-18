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
  _scale = 1,
  faceOverrides?: FaceOverrides
): number {
  const isFace = rank === 'A' || rank === 'K' || rank === 'Q' || rank === 'J';
  if (isFace && faceOverrides && faceOverrides[rank] != null) {
    return faceOverrides[rank]!;
  }
  return baseRepsForRank(rank);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function hasStreakAt(arr: Card[], idx: number): boolean {
  const s = arr[idx].s;
  const n = arr.length;
  if (idx >= 2 && arr[idx - 1].s === s && arr[idx - 2].s === s) return true;
  if (idx >= 1 && idx + 1 < n && arr[idx - 1].s === s && arr[idx + 1].s === s) return true;
  if (idx + 2 < n && arr[idx + 1].s === s && arr[idx + 2].s === s) return true;
  return false;
}

/**
 * Smooths suit order so no single movement/suit repeats more than twice consecutively,
 * preventing 3–5 back-to-back sets of the same exercise while keeping draw order unpredictable.
 */
function smoothSuitStreaks(cards: Card[]): Card[] {
  const out = [...cards];
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 2; i < out.length; i++) {
      if (out[i].s === out[i - 1].s && out[i].s === out[i - 2].s) {
        for (let offset = 1; offset < out.length; offset++) {
          const candidates = [i + offset, i - offset];
          let swapped = false;
          for (const j of candidates) {
            if (j < 0 || j >= out.length || out[j].s === out[i].s) continue;
            [out[i], out[j]] = [out[j], out[i]];
            if (!hasStreakAt(out, i) && !hasStreakAt(out, j)) {
              swapped = true;
              changed = true;
              break;
            }
            [out[i], out[j]] = [out[j], out[i]];
          }
          if (swapped) break;
        }
      }
    }
    if (!changed) break;
  }
  return out;
}

function randomIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function buildDeck(
  config: { scale: number; jr?: number; jrs?: [number, number]; jokers?: [string, string]; fx?: FaceOverrides },
  halfDeck: boolean
): Card[] {
  const jokerRepsArr = config.jrs ?? [config.jr ?? 40, config.jr ?? 40];
  const suitCards: Card[] = [];

  for (let suit = 0; suit < 4; suit++) {
    for (const rank of RANKS) {
      suitCards.push({
        r: rank,
        s: suit as SuitIndex,
        reps: cardReps(rank, config.scale, config.fx),
      });
    }
  }

  const activeJokers: Card[] = [];
  if (jokerRepsArr[0] > 0) {
    activeJokers.push({ r: 'JK', s: 4, j: true, reps: jokerRepsArr[0], jokerIndex: 0 });
  }
  if (jokerRepsArr[1] > 0) {
    activeJokers.push({ r: 'JK', s: 4, j: true, reps: jokerRepsArr[1], jokerIndex: 1 });
  }

  if (!halfDeck) {
    const paced = smoothSuitStreaks(shuffleInPlace(suitCards));
    const orderedJokers = shuffleInPlace([...activeJokers]);
    if (orderedJokers.length === 2) {
      const firstPos = randomIntInclusive(6, Math.floor(paced.length * 0.45));
      paced.splice(firstPos, 0, orderedJokers[0]);
      const secondPos = randomIntInclusive(
        Math.ceil(paced.length * 0.56),
        paced.length - 3
      );
      paced.splice(secondPos, 0, orderedJokers[1]);
    } else if (orderedJokers.length === 1) {
      const pos = randomIntInclusive(10, paced.length - 8);
      paced.splice(pos, 0, orderedJokers[0]);
    }
    return paced;
  }

  // Half-Deck Blitz: sample balanced tiers (Low 2-5, Mid 6-9, High 10-A) per suit
  const lowRanks = new Set<Rank>(['2', '3', '4', '5']);
  const midRanks = new Set<Rank>(['6', '7', '8', '9']);
  const suitCounts = shuffleInPlace([7, 7, 6, 6]);

  const halfSuitCards = ([0, 1, 2, 3] as SuitIndex[]).flatMap((suit) => {
    const ofSuit = suitCards.filter((c) => c.s === suit);
    const lows = shuffleInPlace(ofSuit.filter((c) => lowRanks.has(c.r)));
    const mids = shuffleInPlace(ofSuit.filter((c) => midRanks.has(c.r)));
    const highs = shuffleInPlace(
      ofSuit.filter((c) => !lowRanks.has(c.r) && !midRanks.has(c.r))
    );

    const picked = [...lows.slice(0, 2), ...mids.slice(0, 2), ...highs.slice(0, 2)];
    if (suitCounts[suit] === 7) {
      const leftovers = shuffleInPlace([lows[2], mids[2], highs[2]].filter(Boolean));
      if (leftovers[0]) picked.push(leftovers[0]);
    }
    return picked;
  });

  const pacedHalf = smoothSuitStreaks(shuffleInPlace(halfSuitCards));
  if (activeJokers.length > 0) {
    const pickedJoker = shuffleInPlace([...activeJokers])[0];
    const pos = randomIntInclusive(7, Math.max(7, pacedHalf.length - 7));
    pacedHalf.splice(pos, 0, pickedJoker);
  }

  return pacedHalf;
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
  const jokerRepsArr = config.jrs ?? [config.jr ?? 40, config.jr ?? 40];
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
