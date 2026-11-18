import React, { useMemo } from 'react';
import { BarChart3, Check } from 'lucide-react';
import { t } from '../data/i18n';
import type { Language, WorkoutLog } from '../types/workout';
import { getWeekStartTimestamp } from '../utils/deck';

export interface WeeklyBucket {
  weekStart: number;
  reps: number;
  sessions: number;
}

export function computeWeeklySeries(
  logs: WorkoutLog[],
  weeks = 12,
  nowMs = Date.now()
): WeeklyBucket[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = getWeekStartTimestamp(nowMs);
  const firstWeekStart = currentWeekStart - (weeks - 1) * weekMs;

  const buckets: WeeklyBucket[] = Array.from({ length: weeks }, (_, idx) => ({
    weekStart: firstWeekStart + idx * weekMs,
    reps: 0,
    sessions: 0,
  }));

  for (const log of logs) {
    const logWeek = getWeekStartTimestamp(log.d);
    const idx = Math.round((logWeek - firstWeekStart) / weekMs);
    if (idx >= 0 && idx < weeks) {
      buckets[idx].reps += log.reps;
      buckets[idx].sessions++;
    }
  }

  return buckets;
}

interface WeeklyVolumeChartProps {
  logs: WorkoutLog[];
  weeklyGoal: number;
  lang: Language;
}

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({
  logs,
  weeklyGoal,
  lang,
}) => {
  const series = useMemo(() => computeWeeklySeries(logs, 12), [logs]);

  const safeGoal = Math.max(250, weeklyGoal);
  const currentWeek = series[series.length - 1];
  const currentPct = Math.min(
    999,
    Math.round((currentWeek.reps / safeGoal) * 100)
  );
  const total12wReps = series.reduce((sum, w) => sum + w.reps, 0);
  const avgWeeklyReps = Math.round(total12wReps / 12);
  const goalsMet = series.filter((w) => w.reps >= safeGoal).length;

  const formatWeek = (timestamp: number) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));

  const maxDataReps = Math.max(
    safeGoal,
    ...series.map((w) => w.reps)
  );
  // Add 12% headroom above highest value or goal
  const yMax = Math.max(500, Math.ceil((maxDataReps * 1.12) / 100) * 100);

  const width = 540;
  const height = 160;
  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 14;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = plotW / series.length;
  const barW = Math.min(28, slotW * 0.62);

  const toY = (val: number) =>
    padT + plotH - (Math.min(yMax, Math.max(0, val)) / yMax) * plotH;

  const goalY = toY(safeGoal);
  const midMark = Math.round(yMax / 2 / 100) * 100;

  return (
    <div className="surface-card rounded-3xl p-4 sm:p-6 min-w-0 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--ac)' }}
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold">{t('Weekly volume (12w)')}</h2>
        </div>
        <span className="mut text-xs mono flex items-center gap-1">
          {currentWeek.reps >= safeGoal && (
            <Check
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--ac)' }}
              aria-hidden="true"
            />
          )}
          <span>
            {t('Weekly goal')}: {safeGoal.toLocaleString()}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div
            className="mono font-bold text-base sm:text-lg"
            style={
              currentWeek.reps >= safeGoal ? { color: 'var(--ac)' } : undefined
            }
          >
            {currentWeek.reps.toLocaleString()}
          </div>
          <div className="mut text-[11px] truncate">
            {t('This week')} ({currentPct}%)
          </div>
        </div>
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div className="mono font-bold text-base sm:text-lg">
            {avgWeeklyReps.toLocaleString()}
          </div>
          <div className="mut text-[11px] truncate">{t('12-week avg')}</div>
        </div>
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div className="mono font-bold text-base sm:text-lg">
            {goalsMet}/12
          </div>
          <div className="mut text-[11px] truncate">{t('Goal weeks')}</div>
        </div>
      </div>

      {total12wReps === 0 ? (
        <p className="mut text-xs">
          {t(
            'Complete workouts to chart your 12-week rep volume alongside your weekly goal.'
          )}
        </p>
      ) : (
        <div className="surface-inset rounded-2xl p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            role="img"
            aria-label={`${t('Weekly volume (12w)')}: ${currentWeek.reps.toLocaleString()} / ${safeGoal.toLocaleString()}`}
          >
            {/* Horizontal grid lines */}
            {[yMax, midMark, 0].map((mark) => {
              const y = toY(mark);
              return (
                <g key={mark}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="var(--mut)"
                    className="mono"
                  >
                    {mark >= 1000
                      ? `${(mark / 1000).toFixed(mark % 1000 === 0 ? 0 : 1)}k`
                      : mark}
                  </text>
                </g>
              );
            })}

            {/* Weekly Goal Dashed Threshold */}
            <line
              x1={padL}
              y1={goalY}
              x2={width - padR}
              y2={goalY}
              stroke="var(--ac)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity={0.75}
            />

            {/* 12 Weekly Bars */}
            {series.map((bucket, idx) => {
              const x = padL + idx * slotW + (slotW - barW) / 2;
              const barH =
                bucket.reps > 0
                  ? Math.max(4, (bucket.reps / yMax) * plotH)
                  : 2;
              const y = padT + plotH - barH;
              const hitGoal = bucket.reps >= safeGoal;
              const isCurrent = idx === series.length - 1;
              const pct = Math.round((bucket.reps / safeGoal) * 100);

              return (
                <rect
                  key={bucket.weekStart}
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="4"
                  style={{
                    fill:
                      bucket.reps === 0
                        ? 'var(--border)'
                        : hitGoal
                        ? 'var(--ac)'
                        : 'var(--mut)',
                    opacity:
                      bucket.reps === 0
                        ? 0.5
                        : hitGoal
                        ? 1
                        : isCurrent
                        ? 0.72
                        : 0.45,
                  }}
                >
                  <title>
                    {`${formatWeek(bucket.weekStart)}: ${bucket.reps.toLocaleString()} ${t(
                      'reps'
                    )} (${pct}% · ${bucket.sessions} ${t('sessions')})`}
                  </title>
                </rect>
              );
            })}
          </svg>

          <div className="flex justify-between items-center mut text-[11px] mono mt-1.5">
            <span>{formatWeek(series[0].weekStart)}</span>
            <span>{formatWeek(series[Math.floor(series.length / 2)].weekStart)}</span>
            <span className="font-semibold" style={{ color: 'var(--tx)' }}>
              {t('This week')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
