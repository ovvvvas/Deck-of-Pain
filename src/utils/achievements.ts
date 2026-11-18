import { computeSessionKcal } from '../components/SessionBreakdown';
import type { Preset, WorkoutLog } from '../types/workout';
import {
  computeStreak,
  getPresetMovementNames,
  getWeekStartTimestamp,
} from './deck';

export type BadgeCategory =
  | 'Volume'
  | 'Decks'
  | 'Streaks'
  | 'Speed & RPE'
  | 'Endurance'
  | 'Protocols'
  | 'Movements';

export type BadgeIconKind =
  | 'zap'
  | 'layers'
  | 'flame'
  | 'trophy'
  | 'target'
  | 'award'
  | 'gauge'
  | 'heart'
  | 'compass'
  | 'dumbbell'
  | 'joker';

export interface Achievement {
  id: string;
  category: BadgeCategory;
  title: string;
  description: string;
  icon: BadgeIconKind;
  current: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: number;
  isQuest?: boolean;
}

function calendarDayStart(timestamp: number): number {
  const d = new Date(timestamp);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function computeLongestStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(logs.map((entry) => calendarDayStart(entry.d)))
  ).sort((a, b) => a - b);

  const dayMs = 24 * 60 * 60 * 1000;
  let longest = 1;
  let run = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const diffDays = Math.round((uniqueDays[i] - uniqueDays[i - 1]) / dayMs);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else if (diffDays > 1) {
      run = 1;
    }
  }
  return Math.max(longest, computeStreak(logs));
}

interface Telemetry {
  totalReps: number;
  maxSingleReps: number;
  sessions: number;
  fullDecks: number;
  blitzDecks: number;
  longestStreak: number;
  maxWeeklyReps: number;
  bestFullSecs: number;
  bestBlitzSecs: number;
  maxRpm: number;
  rpeLoggedCount: number;
  targetRpeHitCount: number;
  totalKcal: number;
  lowestFullFadePct: number;
  standardClears: number;
  advancedClears: number;
  advancedFullClears: number;
  distinctProtocols: number;
  doubleJokerSessions: number;
  movementReps: Record<string, number>;
}

function computeFadePct(log: WorkoutLog): number | null {
  if (!log.cs || log.cs.length < 6) return null;
  const paces = log.cs.map((r) => r[2] / Math.max(1, r[1]));
  const phase = Math.max(1, Math.floor(paces.length / 3));
  const first =
    paces.slice(0, phase).reduce((a, b) => a + b, 0) / phase;
  const lastSlice = paces.slice(paces.length - phase);
  const last =
    lastSlice.reduce((a, b) => a + b, 0) / Math.max(1, lastSlice.length);
  if (first <= 0.01) return null;
  return (last / first - 1) * 100;
}

interface BadgeSpec {
  id: string;
  category: BadgeCategory;
  title: string;
  description: string;
  icon: BadgeIconKind;
  target: number;
  isQuest?: boolean;
  progress: (t: Telemetry) => number;
  isUnlocked?: (t: Telemetry) => boolean;
}

// 15 Volume badges: hard lifetime reps (1,000 -> 1,000,000) & tough single-deck totals
const VOLUME_THRESHOLDS = [
  1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000,
];
const SINGLE_REP_THRESHOLDS = [400, 500, 650, 800, 1000];

// 13 Deck badges: serious consistency & full deck volume
const SESSION_THRESHOLDS = [10, 25, 50, 100, 250, 500];
const FULL_DECK_THRESHOLDS = [1, 10, 25, 50, 100];
const BLITZ_DECK_THRESHOLDS = [10, 50];

// 9 Streak & Weekly Volume badges
const STREAK_THRESHOLDS = [7, 14, 21, 30, 60, 100, 365];
const WEEKLY_REP_THRESHOLDS = [2500, 5000];

// 9 Endurance badges (5 kcal + 2 fade + 2 advanced full clears)
const KCAL_THRESHOLDS = [2500, 5000, 10000, 25000, 50000];

// 36 Movement mastery badges: 9 signature movements × 4 tough tiers (500 -> 10,000)
const MOVEMENT_TIERS = [500, 2000, 5000, 10000] as const;

const MOVEMENT_QUEST_DEFS: {
  id: string;
  label: string;
  moves: string[];
}[] = [
  { id: 'pushups', label: 'Push-ups', moves: ['Push-ups'] },
  { id: 'squats', label: 'Air Squats', moves: ['Air Squats'] },
  { id: 'pullups', label: 'Pull-ups', moves: ['Pull-ups'] },
  { id: 'burpees', label: 'Burpees', moves: ['Burpees'] },
  { id: 'situps', label: 'Sit-ups', moves: ['Sit-ups'] },
  {
    id: 'lunges',
    label: 'Lunges',
    moves: ['Reverse Lunges', 'Walking Lunges'],
  },
  { id: 'dips', label: 'Dips', moves: ['Dips'] },
  { id: 'jumpsquats', label: 'Jump Squats', moves: ['Jump Squats'] },
  { id: 'vups', label: 'V-ups', moves: ['V-ups'] },
];

export const BADGE_SPECS: BadgeSpec[] = [
  // 1. Volume & Single-Session Milestones (15)
  ...VOLUME_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `reps-${n}`,
    category: 'Volume',
    title:
      n === 1000000 ? 'Million Rep Legend' : `${n.toLocaleString()} total reps`,
    description: `Accumulate ${n.toLocaleString()} lifetime reps across sessions.`,
    icon: n >= 25000 ? 'trophy' : 'award',
    target: n,
    progress: (tel) => tel.totalReps,
  })),
  ...SINGLE_REP_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `single-${n}`,
    category: 'Volume',
    title: `${n.toLocaleString()} reps in one deck`,
    description: `Complete at least ${n.toLocaleString()} reps in a single workout.`,
    icon: 'zap',
    target: n,
    isQuest: true,
    progress: (tel) => tel.maxSingleReps,
  })),

  // 2. Sessions & Decks (13)
  ...SESSION_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `sess-${n}`,
    category: 'Decks',
    title: `${n} sessions`,
    description: `Finish ${n} total deck workout sessions.`,
    icon: n >= 100 ? 'trophy' : 'zap',
    target: n,
    progress: (tel) => tel.sessions,
  })),
  ...FULL_DECK_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `full-${n}`,
    category: 'Decks',
    title: n === 1 ? 'Deck Conqueror' : `${n} full decks`,
    description:
      n === 1
        ? 'Clear a complete 52+ card deck.'
        : `Clear ${n} full 52+ card decks.`,
    icon: 'layers',
    target: n,
    progress: (tel) => tel.fullDecks,
  })),
  ...BLITZ_DECK_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `blitz-${n}`,
    category: 'Decks',
    title: `${n} blitz decks`,
    description: `Complete ${n} Half-Deck Blitz sessions.`,
    icon: 'zap',
    target: n,
    progress: (tel) => tel.blitzDecks,
  })),

  // 3. Streaks & Weekly Grit (9)
  ...STREAK_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `streak-${n}`,
    category: 'Streaks',
    title: n === 365 ? 'Iron Year (365d)' : `${n}-day streak`,
    description: `Train on ${n} consecutive calendar days.`,
    icon: n >= 30 ? 'trophy' : 'flame',
    target: n,
    progress: (tel) => tel.longestStreak,
  })),
  ...WEEKLY_REP_THRESHOLDS.map<BadgeSpec>((n) => ({
    id: `week-${n}`,
    category: 'Streaks',
    title:
      n === 5000
        ? 'Weekly Juggernaut (5,000)'
        : `Weekly Grinder (${n.toLocaleString()})`,
    description: `Log at least ${n.toLocaleString()} reps inside a single calendar week.`,
    icon: n >= 5000 ? 'trophy' : 'target',
    target: n,
    isQuest: true,
    progress: (tel) => tel.maxWeeklyReps,
  })),

  // 4. Speed, Pace & RPE Discipline (12)
  ...[30, 25, 20, 15].map<BadgeSpec>((mins) => ({
    id: `speed-full-${mins}`,
    category: 'Speed & RPE',
    title: `Full deck under ${mins}m`,
    description: `Clear a full 52+ card deck in under ${mins} minutes.`,
    icon: 'gauge',
    target: 1,
    isQuest: true,
    progress: (tel) => (tel.bestFullSecs <= mins * 60 ? 1 : 0),
  })),
  ...[12, 8].map<BadgeSpec>((mins) => ({
    id: `speed-blitz-${mins}`,
    category: 'Speed & RPE',
    title: `Blitz under ${mins}m`,
    description: `Clear a Half-Deck Blitz in under ${mins} minutes.`,
    icon: 'gauge',
    target: 1,
    isQuest: true,
    progress: (tel) => (tel.bestBlitzSecs <= mins * 60 ? 1 : 0),
  })),
  ...[25, 35, 45].map<BadgeSpec>((rpm) => ({
    id: `pace-${rpm}`,
    category: 'Speed & RPE',
    title: `${rpm}+ reps/min pace`,
    description: `Sustain an average of at least ${rpm} reps per minute across a session.`,
    icon: 'zap',
    target: rpm,
    isQuest: true,
    progress: (tel) => Math.floor(tel.maxRpm),
  })),
  {
    id: 'rpe-25-logs',
    category: 'Speed & RPE',
    title: '25 RPE Check-ins',
    description: 'Track perceived exertion across 25 completed workouts.',
    icon: 'gauge',
    target: 25,
    progress: (tel) => tel.rpeLoggedCount,
  },
  {
    id: 'target-rpe-hit-5',
    category: 'Speed & RPE',
    title: 'Precision Pacer (5x)',
    description: 'Match your pre-set Target RPE across 5 separate workouts.',
    icon: 'target',
    target: 5,
    isQuest: true,
    progress: (tel) => tel.targetRpeHitCount,
  },
  {
    id: 'target-rpe-hit-15',
    category: 'Speed & RPE',
    title: 'Human Metronome (15x)',
    description: 'Match your pre-set Target RPE across 15 separate workouts.',
    icon: 'award',
    target: 15,
    isQuest: true,
    progress: (tel) => tel.targetRpeHitCount,
  },

  // 5. Calorie & Endurance Quests (9)
  ...KCAL_THRESHOLDS.map<BadgeSpec>((kcal) => ({
    id: `kcal-${kcal}`,
    category: 'Endurance',
    title: `${kcal.toLocaleString()} kcal burned`,
    description: `Burn an estimated ${kcal.toLocaleString()} total kcal across sessions.`,
    icon: 'flame',
    target: kcal,
    progress: (tel) => tel.totalKcal,
  })),
  {
    id: 'fade-iron-10',
    category: 'Endurance',
    title: 'Iron Engine (<10% fade)',
    description: 'Finish a full deck with under 10% pace fade.',
    icon: 'heart',
    target: 1,
    isQuest: true,
    progress: (tel) => (tel.lowestFullFadePct < 10 ? 1 : 0),
  },
  {
    id: 'fade-steel-3',
    category: 'Endurance',
    title: 'Machine Pace (<3% fade)',
    description: 'Finish a full deck with under 3% pace fade from start to finish.',
    icon: 'award',
    target: 1,
    isQuest: true,
    progress: (tel) => (tel.lowestFullFadePct < 3 ? 1 : 0),
  },
  {
    id: 'adv-full-5',
    category: 'Endurance',
    title: '5 Advanced Full Decks',
    description: 'Clear 5 complete full decks on Advanced difficulty.',
    icon: 'trophy',
    target: 5,
    isQuest: true,
    progress: (tel) => tel.advancedFullClears,
  },
  {
    id: 'adv-full-25',
    category: 'Endurance',
    title: '25 Advanced Full Decks',
    description: 'Clear 25 complete full decks on Advanced difficulty.',
    icon: 'trophy',
    target: 25,
    isQuest: true,
    progress: (tel) => tel.advancedFullClears,
  },

  // 6. Protocol Mastery & High-Stakes Quests (7)
  {
    id: 'lvl-standard-10',
    category: 'Protocols',
    title: '10 Standard Decks',
    description: 'Complete 10 sessions on Standard difficulty.',
    icon: 'compass',
    target: 10,
    progress: (tel) => tel.standardClears,
  },
  {
    id: 'lvl-advanced-10',
    category: 'Protocols',
    title: '10 Advanced Decks',
    description: 'Complete 10 sessions on Advanced difficulty.',
    icon: 'award',
    target: 10,
    isQuest: true,
    progress: (tel) => tel.advancedClears,
  },
  {
    id: 'lvl-advanced-50',
    category: 'Protocols',
    title: '50 Advanced Decks',
    description: 'Complete 50 sessions on Advanced difficulty.',
    icon: 'trophy',
    target: 50,
    isQuest: true,
    progress: (tel) => tel.advancedClears,
  },
  {
    id: 'proto-variety-8',
    category: 'Protocols',
    title: '8 protocols cleared',
    description: 'Train using 8 distinct workout protocols.',
    icon: 'compass',
    target: 8,
    isQuest: true,
    progress: (tel) => tel.distinctProtocols,
  },
  {
    id: 'proto-variety-15',
    category: 'Protocols',
    title: '15 protocols cleared',
    description: 'Master 15 distinct workout protocols.',
    icon: 'trophy',
    target: 15,
    isQuest: true,
    progress: (tel) => tel.distinctProtocols,
  },
  {
    id: 'joker-master-10',
    category: 'Protocols',
    title: '10 Double-Joker Decks',
    description: 'Clear 10 sessions featuring both Joker cards.',
    icon: 'joker',
    target: 10,
    isQuest: true,
    progress: (tel) => tel.doubleJokerSessions,
  },
  {
    id: 'joker-master-50',
    category: 'Protocols',
    title: '50 Double-Joker Decks',
    description: 'Clear 50 sessions featuring both Joker cards.',
    icon: 'joker',
    target: 50,
    isQuest: true,
    progress: (tel) => tel.doubleJokerSessions,
  },

  // 7. Movement Mastery Quests: 500 to 10,000 per movement (36)
  ...MOVEMENT_QUEST_DEFS.flatMap<BadgeSpec>((def) =>
    MOVEMENT_TIERS.map((tier) => ({
      id: `move-${def.id}-${tier}`,
      category: 'Movements',
      title: `${def.label} ${tier.toLocaleString()}`,
      description: `Complete ${tier.toLocaleString()} cumulative ${def.label.toLowerCase()} reps.`,
      icon: tier >= 5000 ? 'trophy' : 'dumbbell',
      target: tier,
      isQuest: true,
      progress: (tel) =>
        def.moves.reduce((sum, m) => sum + (tel.movementReps[m] || 0), 0),
    }))
  ),
];

export function computeAchievements(
  logs: WorkoutLog[],
  presets: Preset[] = []
): Achievement[] {
  const chronological = logs.slice().sort((a, b) => a.d - b.d);
  const unlockTimestamps: Record<string, number> = {};

  // Single-pass incremental telemetry for O(N) performance even at 500+ sessions
  const tel: Telemetry = {
    totalReps: 0,
    maxSingleReps: 0,
    sessions: 0,
    fullDecks: 0,
    blitzDecks: 0,
    longestStreak: 0,
    maxWeeklyReps: 0,
    bestFullSecs: Infinity,
    bestBlitzSecs: Infinity,
    maxRpm: 0,
    rpeLoggedCount: 0,
    targetRpeHitCount: 0,
    totalKcal: 0,
    lowestFullFadePct: Infinity,
    standardClears: 0,
    advancedClears: 0,
    advancedFullClears: 0,
    distinctProtocols: 0,
    doubleJokerSessions: 0,
    movementReps: {},
  };

  const dayMs = 24 * 60 * 60 * 1000;
  let prevDayStart: number | null = null;
  let activeStreakRun = 0;
  const protoSet = new Set<string>();
  const weekTotals: Record<number, number> = {};

  for (const log of chronological) {
    tel.sessions++;
    tel.totalReps += log.reps;
    if (log.reps > tel.maxSingleReps) tel.maxSingleReps = log.reps;

    // Streak progression (calendar days)
    const dayStart = calendarDayStart(log.d);
    if (prevDayStart === null) {
      activeStreakRun = 1;
    } else {
      const diff = Math.round((dayStart - prevDayStart) / dayMs);
      if (diff === 1) {
        activeStreakRun++;
      } else if (diff > 1) {
        activeStreakRun = 1;
      }
    }
    prevDayStart = dayStart;
    if (activeStreakRun > tel.longestStreak) {
      tel.longestStreak = activeStreakRun;
    }

    // Weekly rep accumulation
    const weekStart = getWeekStartTimestamp(log.d);
    const updatedWeekReps = (weekTotals[weekStart] || 0) + log.reps;
    weekTotals[weekStart] = updatedWeekReps;
    if (updatedWeekReps > tel.maxWeeklyReps) {
      tel.maxWeeklyReps = updatedWeekReps;
    }

    if (log.half) {
      tel.blitzDecks++;
      if (log.secs < tel.bestBlitzSecs) tel.bestBlitzSecs = log.secs;
    } else {
      tel.fullDecks++;
      if (log.secs < tel.bestFullSecs) tel.bestFullSecs = log.secs;
      const fade = computeFadePct(log);
      if (fade !== null && fade < tel.lowestFullFadePct) {
        tel.lowestFullFadePct = fade;
      }
    }

    const rpm = log.reps / Math.max(log.secs / 60, 1 / 60);
    if (rpm > tel.maxRpm) tel.maxRpm = rpm;

    if (typeof log.rpe === 'number') {
      tel.rpeLoggedCount++;
      if (typeof log.targetRpe === 'number' && log.rpe === log.targetRpe) {
        tel.targetRpeHitCount++;
      }
    }

    const moves = getPresetMovementNames(log.preset, presets, log.moves);
    tel.totalKcal += computeSessionKcal(log, moves);

    const lv = log.lv || 's';
    if (lv === 's') tel.standardClears++;
    else if (lv === 'a') {
      tel.advancedClears++;
      if (!log.half) tel.advancedFullClears++;
    }

    protoSet.add(log.preset);
    tel.distinctProtocols = protoSet.size;

    if (log.cs && log.cs.length > 0) {
      let jCards = 0;
      for (const split of log.cs) {
        const suitIdx = split[0];
        const reps = split[1];
        if (suitIdx >= 4) jCards++;
        const moveName = moves[suitIdx];
        if (moveName) {
          tel.movementReps[moveName] = (tel.movementReps[moveName] || 0) + reps;
        }
      }
      if (jCards >= 2) tel.doubleJokerSessions++;
    } else if (log.cards >= 54) {
      tel.doubleJokerSessions++;
    }

    for (const spec of BADGE_SPECS) {
      if (unlockTimestamps[spec.id] !== undefined) continue;
      const cur = spec.progress(tel);
      const met = spec.isUnlocked ? spec.isUnlocked(tel) : cur >= spec.target;
      if (met) {
        unlockTimestamps[spec.id] = log.d;
      }
    }
  }

  // Reconcile current active streak in case computeStreak includes today/yesterday rules
  tel.longestStreak = Math.max(tel.longestStreak, computeStreak(chronological));

  const nowFallback = chronological[chronological.length - 1]?.d ?? Date.now();

  return BADGE_SPECS.map((spec) => {
    const rawCurrent = Math.max(0, spec.progress(tel));
    const unlocked = spec.isUnlocked
      ? spec.isUnlocked(tel)
      : rawCurrent >= spec.target;
    const unlockedAt = unlocked
      ? unlockTimestamps[spec.id] ?? nowFallback
      : undefined;

    return {
      id: spec.id,
      category: spec.category,
      title: spec.title,
      description: spec.description,
      icon: spec.icon,
      current: Math.min(rawCurrent, spec.target),
      target: spec.target,
      unlocked,
      unlockedAt,
      isQuest: spec.isQuest,
    };
  });
}

export function getRecentAchievedBadges(
  achievements: Achievement[],
  limit = 5
): Achievement[] {
  return achievements
    .filter((b) => b.unlocked)
    .slice()
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
    .slice(0, limit);
}

export function getNextQuests(
  achievements: Achievement[],
  limit = 3
): Achievement[] {
  return achievements
    .filter((b) => !b.unlocked)
    .slice()
    .sort((a, b) => {
      const ratioA = a.current / Math.max(1, a.target);
      const ratioB = b.current / Math.max(1, b.target);
      return ratioB - ratioA;
    })
    .slice(0, limit);
}
