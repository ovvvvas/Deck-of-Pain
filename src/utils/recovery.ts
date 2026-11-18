import type { WorkoutLog } from '../types/workout';

export interface RestSuggestion {
  currentRest: number;
  suggestedRest: number;
  deltaSecs: number;
  direction: 'lengthen' | 'shorten' | 'keep';
  reason: string;
}

const clampRest = (secs: number): number =>
  Math.min(300, Math.max(5, Math.round(secs / 5) * 5));

export function suggestRestAdjustment(params: {
  currentRestSecs: number;
  log: Pick<WorkoutLog, 'secs' | 'half' | 'rpe' | 'targetRpe'>;
}): RestSuggestion {
  const currentRest = clampRest(params.currentRestSecs);
  const { secs, half, rpe, targetRpe } = params.log;

  if (typeof rpe !== 'number') {
    return {
      currentRest,
      suggestedRest: currentRest,
      deltaSecs: 0,
      direction: 'keep',
      reason: 'Rate RPE above to get a rest interval suggestion.',
    };
  }

  const isLong = secs >= (half ? 1200 : 2400);
  const isFast = secs <= (half ? 600 : 1200);
  const overTarget = typeof targetRpe === 'number' && rpe >= targetRpe + 2;
  const underTarget = typeof targetRpe === 'number' && rpe <= targetRpe - 2;

  let rawDelta = 0;
  let reason = 'Recovery is right on target — keep your current rest interval.';

  if (rpe >= 9 || (rpe === 8 && (isLong || overTarget))) {
    rawDelta = rpe >= 9 && isLong ? 15 : 10;
    reason = 'High RPE and session fatigue suggest longer recovery between cards.';
  } else if (rpe === 8 || (rpe === 7 && isLong)) {
    rawDelta = 5;
    reason = 'Elevated exertion on a demanding deck — add a small recovery buffer.';
  } else if (rpe <= 4 || (rpe === 5 && underTarget)) {
    rawDelta = isFast ? -10 : -5;
    reason = 'Low perceived exertion shows spare capacity — shorten rest to boost density.';
  } else if (rpe === 5 && isFast) {
    rawDelta = -5;
    reason = 'Smooth pace and moderate effort — trim rest slightly for sharper conditioning.';
  }

  const suggestedRest = clampRest(currentRest + rawDelta);
  const deltaSecs = suggestedRest - currentRest;
  const direction: RestSuggestion['direction'] =
    deltaSecs > 0 ? 'lengthen' : deltaSecs < 0 ? 'shorten' : 'keep';

  return {
    currentRest,
    suggestedRest,
    deltaSecs,
    direction,
    reason:
      deltaSecs === 0 && rawDelta !== 0
        ? 'Recovery is right on target — keep your current rest interval.'
        : reason,
  };
}
