export type Language = 'en' | 'fa';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeAccentId =
  | 'ember'
  | 'crimson'
  | 'cobalt'
  | 'emerald'
  | 'teal'
  | 'bronze'
  | 'violet'
  | 'rose';

export type LevelKey = 'b' | 's' | 'a';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JK';

/** Suit index: 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs, 4=Joker */
export type SuitIndex = 0 | 1 | 2 | 3 | 4;

export type FaceOverrides = Partial<Record<'A' | 'K' | 'Q' | 'J', number>>;

export interface LevelConfig {
  name: string;
  multiplier: number;
  faceOverrides?: FaceOverrides;
}

export interface Preset {
  id: string;
  name: string;
  cat: string;
  tag: string;
  desc: string;
  ex: [string, string, string, string];
  rest: number;
  scale: number;
  joker?: string;
  jr?: number;
  jokers?: [string, string];
  jrs?: [number, number];
  favorite?: boolean;
  /** Temporary runtime memory of last non-zero joker reps when toggled off */
  jl?: number;
}

export interface Card {
  r: Rank;
  s: SuitIndex;
  reps: number;
  j?: boolean;
  jokerIndex?: number;
}

/** Tuple: [suitIndex, reps, workSeconds, restSeconds] */
export type CardSplit = [number, number, number, number];

export interface WorkoutLog {
  d: number;
  lv?: LevelKey;
  preset: string;
  half: boolean;
  secs: number;
  reps: number;
  cards: number;
  rpe?: number;
  targetRpe?: number;
  cs?: CardSplit[];
  moves?: string[];
  kcal?: number;
}

export interface SavedSession {
  lv: LevelKey;
  pid: string;
  half: boolean;
  deck: Card[];
  idx: number;
  splits: number[];
  rs: number[];
  el: number;
  cur: number;
  pz: boolean;
  targetRpe?: number;
}

export interface UserSettings {
  theme?: ThemeMode;
  accent?: ThemeAccentId;
  mute?: boolean;
  pid?: string;
  half?: boolean;
  auto?: boolean;
  level?: LevelKey;
  warm?: boolean;
  lang?: Language;
  targetRpe?: number;
  favoriteMovements?: string[];
  weeklyGoal?: number;
}

export interface GuidedStep {
  n: string;
  cue: string;
}

export interface TourStep {
  title: string;
  bullets: string[];
}
