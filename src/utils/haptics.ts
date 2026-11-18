export type HapticPattern = number | number[];

export type WorkoutMilestone = 25 | 50 | 75 | 'final';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function vibratePattern(pattern: HapticPattern): boolean {
  if (!hapticsEnabled || !isHapticsSupported()) return false;
  try {
    return navigator.vibrate(pattern) !== false;
  } catch {
    return false;
  }
}

export const haptics = {
  /** Crisp single pulse when a standard card is dealt; double-pulse for Joker cards. */
  cardDealt: (isJoker = false): boolean =>
    vibratePattern(isJoker ? [22, 35, 38] : 16),

  /** Subtle tap for secondary controls (undo, rest skip). */
  tap: (): boolean => vibratePattern(10),

  /** Multi-pulse athletic rhythm for workout progress milestones (25%, 50%, 75%, Final Card). */
  milestone: (): boolean => vibratePattern([32, 45, 52, 45, 80]),

  /** Sharp double-pulse for rest completion or hold-to-quit alert. */
  alert: (): boolean => vibratePattern([35, 30, 35]),

  /** Celebratory triple-pulse when the entire deck is cleared. */
  complete: (): boolean => vibratePattern([45, 50, 45, 50, 120]),
};

/**
 * Computes which milestone (if any) was newly crossed when advancing from
 * `prevRepsDone` to `nextRepsDone` and moving onto `nextCardIndex` of `totalCards`.
 * Marks all crossed thresholds in `fired` so none fire more than once.
 */
export function consumeCrossedMilestone(params: {
  prevRepsDone: number;
  nextRepsDone: number;
  totalReps: number;
  nextCardIndex: number;
  totalCards: number;
  fired: Set<WorkoutMilestone>;
}): WorkoutMilestone | null {
  const {
    prevRepsDone,
    nextRepsDone,
    totalReps,
    nextCardIndex,
    totalCards,
    fired,
  } = params;

  if (totalReps <= 0 || nextCardIndex >= totalCards) return null;

  const prevPct = (prevRepsDone / totalReps) * 100;
  const nextPct = (nextRepsDone / totalReps) * 100;

  let reached: WorkoutMilestone | null = null;
  const pctMilestones: (25 | 50 | 75)[] = [75, 50, 25];

  for (const pct of pctMilestones) {
    if (prevPct < pct && nextPct >= pct && !fired.has(pct)) {
      fired.add(pct);
      if (reached === null) {
        reached = pct;
      }
    }
  }

  if (totalCards > 2 && nextCardIndex === totalCards - 1 && !fired.has('final')) {
    fired.add('final');
    if (reached === null) {
      reached = 'final';
    }
  }

  return reached;
}

/**
 * Pre-marks percentage milestones already surpassed in a resumed session so
 * resuming mid-workout doesn't retroactively fire earlier milestone alerts.
 */
export function seedPassedMilestones(
  repsDone: number,
  totalReps: number,
  cardIndex: number,
  totalCards: number
): Set<WorkoutMilestone> {
  const fired = new Set<WorkoutMilestone>();
  if (totalReps > 0) {
    const pct = (repsDone / totalReps) * 100;
    if (pct >= 25) fired.add(25);
    if (pct >= 50) fired.add(50);
    if (pct >= 75) fired.add(75);
  }
  if (totalCards > 2 && cardIndex >= totalCards - 1) {
    fired.add('final');
  }
  return fired;
}
