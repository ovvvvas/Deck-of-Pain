import React, { useState } from 'react';
import { Check, Pencil, Target } from 'lucide-react';
import { t } from '../data/i18n';
import { sfx } from '../utils/sound';
import { Stepper } from './Stepper';

interface WeeklyGoalCardProps {
  weeklyReps: number;
  weeklySessions: number;
  weeklyGoal: number;
  onChangeGoal: (nextGoal: number) => void;
}

const GOAL_PRESETS = [1000, 2500, 5000] as const;

export const WeeklyGoalCard: React.FC<WeeklyGoalCardProps> = ({
  weeklyReps,
  weeklySessions,
  weeklyGoal,
  onChangeGoal,
}) => {
  const [editing, setEditing] = useState(false);

  const safeGoal = Math.max(250, weeklyGoal);
  const rawPct = (weeklyReps / safeGoal) * 100;
  const pct = Math.min(100, Math.round(rawPct));
  const remaining = Math.max(0, safeGoal - weeklyReps);
  const reached = weeklyReps >= safeGoal;

  // SVG Ring geometry
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, weeklyReps / safeGoal));

  return (
    <section
      className="surface-card rounded-2xl p-3 sm:p-4 flex flex-col justify-center gap-2.5 min-w-0 w-full"
      aria-label={t('Weekly goal')}
    >
      {!editing ? (
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          {/* Progress Ring */}
          <div className="relative shrink-0 w-[72px] h-[72px] sm:w-[84px] sm:h-[84px]">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full -rotate-90"
              role="img"
              aria-label={`${t('Weekly goal')}: ${pct}%`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--ac)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.35s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="mono text-xs sm:text-sm font-bold"
                style={reached ? { color: 'var(--ac)' } : undefined}
              >
                {pct}%
              </span>
            </div>
          </div>

          {/* Goal Copy & Edit Trigger */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Target
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--ac)' }}
                  aria-hidden="true"
                />
                <span className="mut text-xs font-semibold uppercase tracking-wider truncate">
                  {t('Weekly goal')}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost !min-h-[34px] !min-w-[34px] !px-2 text-xs shrink-0"
                aria-label={t('Edit goal')}
                title={t('Edit goal')}
                onClick={() => {
                  sfx.pop();
                  setEditing(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mono font-bold text-base sm:text-lg leading-tight truncate">
              {weeklyReps.toLocaleString()}{' '}
              <span className="mut text-xs font-normal">
                / {safeGoal.toLocaleString()} {t('reps')}
              </span>
            </div>

            <div className="text-xs flex items-center gap-1.5 truncate min-w-0">
              {reached ? (
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: 'var(--ac)' }}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('Goal reached!')}</span>
                </span>
              ) : (
                <span className="mut truncate">
                  <span className="mono">{remaining.toLocaleString()}</span>{' '}
                  {t('reps left')} · {weeklySessions} {t('sessions')}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="mut text-xs font-semibold uppercase tracking-wider truncate">
              {t('Weekly target (reps)')}
            </span>
            <button
              type="button"
              className="btn btn-active !min-h-[34px] !min-w-0 !px-3 text-xs shrink-0"
              onClick={() => {
                sfx.pop();
                setEditing(false);
              }}
            >
              {t('Done')}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <Stepper
              value={safeGoal}
              min={250}
              max={25000}
              step={250}
              minWidth={52}
              label="weekly rep goal"
              onChange={onChangeGoal}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {GOAL_PRESETS.map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  className={`btn !min-h-[36px] !min-w-0 !px-2.5 mono text-xs ${
                    safeGoal === presetVal ? 'btn-active' : ''
                  }`}
                  onClick={() => {
                    sfx.pop();
                    onChangeGoal(presetVal);
                  }}
                >
                  {presetVal.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
