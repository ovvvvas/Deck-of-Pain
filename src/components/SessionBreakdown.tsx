import React, { useMemo } from 'react';
import { t } from '../data/i18n';
import { MOVEMENT_KCAL } from '../data/movements';
import type { CardSplit, WorkoutLog } from '../types/workout';
import { formatDuration } from '../utils/deck';
import { SuitGlyph } from './SuitIcon';

export function computeSessionKcal(
  log: WorkoutLog,
  movementNames: string[]
): number {
  if (typeof log.kcal === 'number' && log.kcal > 0) {
    return log.kcal;
  }
  if (!log.cs || log.cs.length === 0) {
    return Math.round(log.reps * 0.42);
  }
  let total = 0;
  for (const split of log.cs) {
    const suitIdx = split[0];
    const reps = split[1];
    const moveName = movementNames[suitIdx] || 'Movement';
    const kcalPerRep = MOVEMENT_KCAL[moveName] ?? 0.45;
    total += reps * kcalPerRep;
  }
  return Math.round(total);
}

interface MovementBreakdownListProps {
  splits: CardSplit[];
  movementNames: string[];
}

export const MovementBreakdownList: React.FC<MovementBreakdownListProps> = ({
  splits,
  movementNames,
}) => {
  const stats = useMemo(() => {
    const map = new Map<
      number,
      { suitIdx: number; name: string; reps: number; secs: number; timings: number[] }
    >();

    movementNames.forEach((name, idx) => {
      map.set(idx, { suitIdx: idx, name, reps: 0, secs: 0, timings: [] });
    });

    for (const split of splits) {
      const suitIdx = split[0];
      const reps = split[1];
      const workSecs = split[2];
      const entry = map.get(suitIdx) || {
        suitIdx,
        name: movementNames[suitIdx] || 'Movement',
        reps: 0,
        secs: 0,
        timings: [],
      };
      entry.reps += reps;
      entry.secs += workSecs;
      if (reps > 0) {
        const perRep = workSecs / reps;
        for (let i = 0; i < reps; i++) {
          entry.timings.push(perRep);
        }
      }
      map.set(suitIdx, entry);
    }

    const targets = [5, 10, 20, 50, 100];
    return Array.from(map.values())
      .filter((item) => item.reps > 0)
      .map((item) => {
        const avgSecsPerRep =
          item.reps > 0 ? Number((item.secs / item.reps).toFixed(1)) : 0;
        const rolling = targets
          .filter((tCount) => item.timings.length >= tCount)
          .map((tCount) => {
            const windowReps = item.timings.slice(0, tCount);
            const avg =
              windowReps.reduce((a, b) => a + b, 0) / windowReps.length;
            return { count: tCount, avg: Number(avg.toFixed(1)) };
          });
        return {
          ...item,
          avgSecsPerRep,
          rolling,
        };
      });
  }, [splits, movementNames]);

  if (stats.length === 0) {
    return (
      <p className="mut text-sm">
        {t('Nothing drawn yet. Complete a card and it shows up here with its split.')}
      </p>
    );
  }

  return (
    <div className="surface-inset rounded-2xl p-4 space-y-3 text-start">
      <h3 className="text-xs font-bold uppercase tracking-wider mut">
        {t('Movement Breakdown')}
      </h3>
      <div className="space-y-3">
        {stats.map((item) => (
          <div
            key={`${item.suitIdx}-${item.name}`}
            className="space-y-1.5 pb-2.5 border-b last:border-b-0 last:pb-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm gap-1.5 min-w-0">
              <span className="font-bold flex items-center gap-1.5 min-w-0 truncate">
                <SuitGlyph suit={item.suitIdx} />
                <span className="truncate">{t(item.name)}</span>
              </span>
              <div className="flex items-center gap-2 mono shrink-0">
                <span>
                  {item.reps} {t('reps')}
                </span>
                <span className="mut">{formatDuration(item.secs * 1000)}</span>
                <span className="font-bold">{item.avgSecsPerRep}s/rep</span>
              </div>
            </div>

            {item.rolling.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-[11px] mono mut">
                {item.rolling.map((ra, idx) => (
                  <React.Fragment key={ra.count}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span>
                      {ra.count}r: <strong style={{ color: 'var(--tx)' }}>{ra.avg}s</strong>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
