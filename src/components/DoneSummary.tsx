import React, { useEffect, useMemo, useState } from 'react';
import { Check, Timer } from 'lucide-react';
import { t } from '../data/i18n';
import type { Preset, WorkoutLog } from '../types/workout';
import { formatDuration, getPresetMovementNames } from '../utils/deck';
import { suggestRestAdjustment } from '../utils/recovery';
import { sfx } from '../utils/sound';
import { Charts } from './Charts';
import { ConfettiBurst } from './ConfettiBurst';
import { MovementBreakdownList, computeSessionKcal } from './SessionBreakdown';

interface DoneSummaryProps {
  log: WorkoutLog;
  allLogs: WorkoutLog[];
  presets: Preset[];
  preset?: Preset;
  skipConfetti: boolean;
  onSelectRpe: (rpe: number) => void;
  onApplyRestAdjustment?: (presetId: string, nextRestSecs: number) => void;
  onStartCooldown: () => void;
  onReturnHome: () => void;
}

type DebriefTab = 'overview' | 'charts' | 'movements';

export const DoneSummary: React.FC<DoneSummaryProps> = ({
  log,
  allLogs,
  presets,
  preset,
  skipConfetti,
  onSelectRpe,
  onApplyRestAdjustment,
  onStartCooldown,
  onReturnHome,
}) => {
  const [activeTab, setActiveTab] = useState<DebriefTab>('overview');
  const [appliedRest, setAppliedRest] = useState<number | null>(null);

  useEffect(() => {
    setAppliedRest(null);
  }, [log.rpe]);

  const restAdvice = useMemo(
    () =>
      preset
        ? suggestRestAdjustment({ currentRestSecs: preset.rest, log })
        : null,
    [preset, log]
  );

  const sameModeLogs = allLogs.filter(
    (entry) =>
      entry !== log &&
      entry.half === log.half &&
      entry.preset === log.preset &&
      (entry.lv || 's') === (log.lv || 's')
  );
  const isNewRecord =
    sameModeLogs.length > 0 && sameModeLogs.every((entry) => entry.secs > log.secs);

  const movementNames = getPresetMovementNames(
    log.preset,
    presets,
    log.moves
  );
  const repsPerMin = Math.round(log.reps / Math.max(log.secs / 60, 1 / 60));
  const calculatedKcal = computeSessionKcal(log, movementNames);
  const hasSplits = Boolean(log.cs && log.cs.length > 0);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6">
      {!skipConfetti && <ConfettiBurst />}

      <div className="surface-card rounded-3xl p-5 sm:p-8 max-w-2xl w-full text-center">
        <div className="text-3xl mb-1.5" aria-hidden="true">
          <span className="red">♥</span>♠<span className="red">♦</span>♣
        </div>
        <h1 className="disp text-5xl sm:text-6xl font-black mb-1">
          {t('Deck cleared.')}
        </h1>
        <p className="mut text-sm mb-5">
          {t(log.preset)} · {log.half ? t('Half-Deck Blitz') : t('Full Deck')}
        </p>

        {/* 4 KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="surface-inset rounded-2xl p-3">
            <div className="mono text-xl sm:text-2xl font-bold">
              {formatDuration(log.secs * 1000)}
            </div>
            <div className="mut text-xs">{t('time')}</div>
          </div>
          <div className="surface-inset rounded-2xl p-3">
            <div className="mono text-xl sm:text-2xl font-bold">{log.reps}</div>
            <div className="mut text-xs">{t('reps')}</div>
          </div>
          <div className="surface-inset rounded-2xl p-3">
            <div className="mono text-xl sm:text-2xl font-bold">{repsPerMin}</div>
            <div className="mut text-xs">{t('reps/min')}</div>
          </div>
          <div className="surface-inset rounded-2xl p-3">
            <div
              className="mono text-xl sm:text-2xl font-bold"
              style={{ color: 'var(--ac)' }}
            >
              {calculatedKcal}
            </div>
            <div className="mut text-xs">{t('≈ kcal')}</div>
          </div>
        </div>

        {isNewRecord && (
          <p className="font-bold text-sm mb-4" style={{ color: 'var(--ac)' }}>
            {t('New personal record for this mode.')}
          </p>
        )}

        {/* Tab Switcher */}
        {hasSplits && (
          <div
            className="grid grid-cols-3 gap-1.5 p-1 surface-inset rounded-2xl mb-5"
            role="tablist"
            aria-label={t('Session analysis')}
          >
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'charts', label: 'Charts' },
                { id: 'movements', label: 'Movements' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`btn !min-h-[40px] !min-w-0 !px-1.5 sm:!px-3 !rounded-xl text-xs sm:text-sm ${
                  activeTab === tab.id ? 'btn-active' : 'btn-ghost'
                }`}
                onClick={() => {
                  sfx.pop();
                  setActiveTab(tab.id);
                }}
              >
                <span className="truncate">{t(tab.label)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <div>
            <p className="mut text-sm mb-4">
              {t(
                'Debrief: drink water, stretch what burns, and note which suit hurt most.'
              )}
            </p>

            <div className="mb-5">
              <div className="mut text-sm mb-2">
                {t('How hard was it? 1 is easy, 10 is all-out.')}
                {typeof log.targetRpe === 'number' && (
                  <span className="mono font-semibold ms-1.5" style={{ color: 'var(--ac)' }}>
                    ({t('Target RPE')}: {log.targetRpe}/10)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpeVal) => (
                  <button
                    key={rpeVal}
                    type="button"
                    aria-pressed={log.rpe === rpeVal}
                    className={`btn !px-0 !min-w-0 w-full ${
                      log.rpe === rpeVal ? 'btn-active' : ''
                    }`}
                    onClick={() => onSelectRpe(rpeVal)}
                  >
                    {rpeVal}
                  </button>
                ))}
              </div>
            </div>

            {preset && restAdvice && (
              <div className="surface-inset rounded-2xl p-3.5 mb-5 text-start space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mut">
                    <Timer
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--ac)' }}
                      aria-hidden="true"
                    />
                    <span>{t('Recovery advisor')}</span>
                  </span>
                  {typeof log.rpe === 'number' && (
                    <span className="mono text-xs font-bold">
                      {restAdvice.currentRest}
                      {t('unit-s')} →{' '}
                      <span
                        style={{
                          color:
                            restAdvice.deltaSecs !== 0 ? 'var(--ac)' : 'var(--tx)',
                        }}
                      >
                        {restAdvice.suggestedRest}
                        {t('unit-s')}
                      </span>
                      {restAdvice.deltaSecs !== 0 && (
                        <span className="mut ms-1">
                          ({restAdvice.deltaSecs > 0 ? '+' : ''}
                          {restAdvice.deltaSecs}
                          {t('unit-s')})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <p className="mut text-xs leading-relaxed">
                  {t(restAdvice.reason)}
                </p>

                {restAdvice.deltaSecs !== 0 && onApplyRestAdjustment && (
                  <button
                    type="button"
                    disabled={appliedRest === restAdvice.suggestedRest}
                    className={`btn !min-h-[40px] w-full sm:w-auto text-xs ${
                      appliedRest === restAdvice.suggestedRest
                        ? 'btn-active'
                        : 'btn-cta'
                    }`}
                    onClick={() => {
                      sfx.pop();
                      onApplyRestAdjustment(preset.id, restAdvice.suggestedRest);
                      setAppliedRest(restAdvice.suggestedRest);
                    }}
                  >
                    {appliedRest === restAdvice.suggestedRest ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {t('Applied')} ({restAdvice.suggestedRest}
                          {t('unit-s')})
                        </span>
                      </>
                    ) : (
                      <span>
                        {t('Apply')} {restAdvice.suggestedRest}
                        {t('unit-s')} {t('for next session')}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'charts' && log.cs && (
          <div className="text-start mb-5">
            <Charts splits={log.cs} movementNames={movementNames} />
          </div>
        )}

        {activeTab === 'movements' && log.cs && (
          <div className="mb-5">
            <MovementBreakdownList
              splits={log.cs}
              movementNames={movementNames}
            />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            className="btn w-full"
            onClick={onStartCooldown}
          >
            {t('Cool-down stretch (2 min)')}
          </button>
          <button
            type="button"
            className="btn btn-cta w-full"
            onClick={onReturnHome}
          >
            {t('Back to the deck')}
          </button>
        </div>
      </div>
    </div>
  );
};
