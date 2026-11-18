import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, BarChart3 } from 'lucide-react';
import { t } from '../data/i18n';
import { LEVELS } from '../data/movements';
import type { Language, WorkoutLog } from '../types/workout';
import { formatDuration } from '../utils/deck';
import { sfx } from '../utils/sound';
import { Modal } from './Modal';

interface PerformanceCompareModalProps {
  logs: WorkoutLog[];
  lang: Language;
  onClose: () => void;
}

export function buildComparisonMetrics(a: WorkoutLog, b: WorkoutLog) {
  const aCards = Math.max(1, a.cards);
  const bCards = Math.max(1, b.cards);
  const aSecPerCard = a.secs / aCards;
  const bSecPerCard = b.secs / bCards;
  const aRpm = a.reps / Math.max(a.secs / 60, 1 / 60);
  const bRpm = b.reps / Math.max(b.secs / 60, 1 / 60);

  return {
    repDiff: b.reps - a.reps,
    secPerCardA: aSecPerCard,
    secPerCardB: bSecPerCard,
    secPerCardDiff: bSecPerCard - aSecPerCard,
    rpmA: aRpm,
    rpmB: bRpm,
    rpeDiff:
      typeof a.rpe === 'number' && typeof b.rpe === 'number'
        ? b.rpe - a.rpe
        : null,
  };
}

export const PerformanceCompareModal: React.FC<PerformanceCompareModalProps> = ({
  logs,
  lang,
  onClose,
}) => {
  // Default Session A to previous (logs[1]) and Session B to latest (logs[0])
  const [idxA, setIdxA] = useState<number>(() => (logs.length > 1 ? 1 : 0));
  const [idxB, setIdxB] = useState<number>(0);

  const safeIdxA = Math.min(idxA, Math.max(0, logs.length - 1));
  const safeIdxB = Math.min(idxB, Math.max(0, logs.length - 1));
  const sessionA = logs[safeIdxA];
  const sessionB = logs[safeIdxB];

  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));

  const formatOption = (entry: WorkoutLog) =>
    `${formatDate(entry.d)} · ${t(entry.preset)} · ${entry.reps} ${t('reps')} · ${formatDuration(
      entry.secs * 1000
    )}${typeof entry.rpe === 'number' ? ` · RPE ${entry.rpe}` : ''}`;

  const metrics = useMemo(
    () => (sessionA && sessionB ? buildComparisonMetrics(sessionA, sessionB) : null),
    [sessionA, sessionB]
  );

  // Build RPE chronological slice spanning Session A & Session B
  const rpeProgression = useMemo(() => {
    if (!sessionA || !sessionB) return [];
    const minTs = Math.min(sessionA.d, sessionB.d);
    const maxTs = Math.max(sessionA.d, sessionB.d);
    const ratedBetween = logs
      .filter(
        (l): l is WorkoutLog & { rpe: number } =>
          typeof l.rpe === 'number' && l.d >= minTs && l.d <= maxTs
      )
      .slice()
      .sort((x, y) => x.d - y.d);
    if (ratedBetween.length >= 2) return ratedBetween;

    // Fallback to just rated selected sessions in chronological order
    return [sessionA, sessionB]
      .filter((l): l is WorkoutLog & { rpe: number } => typeof l.rpe === 'number')
      .sort((x, y) => x.d - y.d);
  }, [logs, sessionA, sessionB]);

  if (!sessionA || !sessionB || !metrics) {
    return (
      <Modal label={t('Analyze Performance')} onClose={onClose} widthClass="max-w-2xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold">{t('Analyze Performance')}</h2>
          <button type="button" className="btn !min-h-[38px]" onClick={onClose}>
            {t('Close')}
          </button>
        </div>
        <p className="mut text-sm">
          {t('Need at least two logged workouts to compare sessions.')}
        </p>
      </Modal>
    );
  }

  const maxReps = Math.max(1, sessionA.reps, sessionB.reps);
  const splitsA = sessionA.cs ?? [];
  const splitsB = sessionB.cs ?? [];
  const hasPerCardSplits = splitsA.length >= 2 || splitsB.length >= 2;

  // Chart dimensions for Time-per-card overlay
  const chartW = 500;
  const chartH = 140;
  const padX = 32;
  const padY = 14;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const timesA = splitsA.map((s) => s[2]);
  const timesB = splitsB.map((s) => s[2]);
  const maxCardSec = Math.max(
    10,
    ...timesA,
    ...timesB,
    metrics.secPerCardA,
    metrics.secPerCardB
  ) * 1.1;

  const buildNormalizedPath = (values: number[]) => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const y = padY + plotH - (values[0] / maxCardSec) * plotH;
      return `M${padX},${y.toFixed(1)} L${chartW - padX},${y.toFixed(1)}`;
    }
    return values
      .map((v, i) => {
        const x = padX + (i * plotW) / (values.length - 1);
        const y = padY + plotH - (v / maxCardSec) * plotH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // RPE progression geometry
  const rpeW = 500;
  const rpeH = 118;
  const rpePadX = 28;
  const rpePadY = 14;
  const rpePlotW = rpeW - rpePadX * 2;
  const rpePlotH = rpeH - rpePadY * 2;
  const rpeX = (i: number) =>
    rpeProgression.length <= 1
      ? rpeW / 2
      : rpePadX + (i * rpePlotW) / (rpeProgression.length - 1);
  const rpeY = (val: number) =>
    rpePadY + rpePlotH - ((val - 1) / 9) * rpePlotH;

  return (
    <Modal
      label={t('Analyze Performance')}
      onClose={onClose}
      widthClass="max-w-3xl"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3
            className="w-5 h-5 shrink-0"
            style={{ color: 'var(--ac)' }}
            aria-hidden="true"
          />
          <h2 className="text-lg sm:text-xl font-bold truncate">
            {t('Analyze Performance')}
          </h2>
        </div>
        <button
          type="button"
          className="btn !min-h-[38px] shrink-0"
          onClick={onClose}
        >
          {t('Close')}
        </button>
      </div>

      {/* Session A vs Session B Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2.5 items-end mb-4 min-w-0">
        <label className="min-w-0 block">
          <span className="mut text-xs font-semibold block mb-1">
            {t('Session A')}
          </span>
          <select
            aria-label={t('Session A')}
            className="rounded-xl px-3 w-full max-w-full min-w-0 text-xs sm:text-sm"
            style={{
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--tx)',
              minHeight: 42,
              border: '1px solid var(--border)',
            }}
            value={safeIdxA}
            onChange={(e) => {
              sfx.pop();
              setIdxA(Number(e.target.value));
            }}
          >
            {logs.map((entry, idx) => (
              <option key={`a-${entry.d}-${idx}`} value={idx}>
                {formatOption(entry)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn !min-h-[42px] !min-w-[42px] !px-2 justify-self-center"
          aria-label={t('Swap sessions')}
          title={t('Swap sessions')}
          onClick={() => {
            sfx.pop();
            setIdxA(safeIdxB);
            setIdxB(safeIdxA);
          }}
        >
          <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
        </button>

        <label className="min-w-0 block">
          <span
            className="text-xs font-semibold block mb-1"
            style={{ color: 'var(--ac)' }}
          >
            {t('Session B')}
          </span>
          <select
            aria-label={t('Session B')}
            className="rounded-xl px-3 w-full max-w-full min-w-0 text-xs sm:text-sm"
            style={{
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--tx)',
              minHeight: 42,
              border: '1px solid var(--ac)',
            }}
            value={safeIdxB}
            onChange={(e) => {
              sfx.pop();
              setIdxB(Number(e.target.value));
            }}
          >
            {logs.map((entry, idx) => (
              <option key={`b-${entry.d}-${idx}`} value={idx}>
                {formatOption(entry)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* KPI Delta Strip */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 min-w-0">
        <div className="surface-inset rounded-2xl p-2 sm:p-3 text-center min-w-0">
          <div className="mut text-[11px] truncate">{t('Total reps')}</div>
          <div className="mono font-bold text-xs sm:text-lg mt-0.5 break-words">
            {sessionA.reps} → {sessionB.reps}
          </div>
          <div
            className="mono text-xs font-semibold"
            style={{
              color: metrics.repDiff >= 0 ? 'var(--ac)' : 'var(--red)',
            }}
          >
            {metrics.repDiff > 0 ? `+${metrics.repDiff}` : metrics.repDiff}
          </div>
        </div>

        <div className="surface-inset rounded-2xl p-2 sm:p-3 text-center min-w-0">
          <div className="mut text-[11px] truncate">{t('Avg time/card')}</div>
          <div className="mono font-bold text-xs sm:text-lg mt-0.5 break-words">
            {metrics.secPerCardA.toFixed(1)}s → {metrics.secPerCardB.toFixed(1)}s
          </div>
          <div
            className="mono text-xs font-semibold"
            style={{
              color: metrics.secPerCardDiff <= 0 ? 'var(--ac)' : 'var(--red)',
            }}
          >
            {metrics.secPerCardDiff > 0
              ? `+${metrics.secPerCardDiff.toFixed(1)}s`
              : `${metrics.secPerCardDiff.toFixed(1)}s`}
          </div>
        </div>

        <div className="surface-inset rounded-2xl p-2 sm:p-3 text-center min-w-0">
          <div className="mut text-[11px] truncate">RPE</div>
          <div className="mono font-bold text-xs sm:text-lg mt-0.5 break-words">
            {sessionA.rpe ?? '—'} → {sessionB.rpe ?? '—'}
          </div>
          <div className="mono text-xs mut font-semibold">
            {metrics.rpeDiff !== null
              ? metrics.rpeDiff > 0
                ? `+${metrics.rpeDiff}`
                : `${metrics.rpeDiff}`
              : '—'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Chart 1: Total Reps Bar Comparison */}
        <div className="surface-inset rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold">{t('Total reps comparison')}</span>
            <span className="mono mut">
              {Math.round(metrics.rpmA)} vs {Math.round(metrics.rpmB)} {t('reps/min')}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate">
                  {t('Session A')} · {t(sessionA.preset)} ({t(LEVELS[sessionA.lv || 's'].name)})
                </span>
                <span className="mono font-semibold shrink-0">
                  {sessionA.reps} {t('reps')}
                </span>
              </div>
              <div className="progress-track" style={{ height: 10 }}>
                <i
                  className="progress-fill"
                  style={{
                    width: `${(sessionA.reps / maxReps) * 100}%`,
                    backgroundColor: 'var(--mut)',
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate font-semibold" style={{ color: 'var(--ac)' }}>
                  {t('Session B')} · {t(sessionB.preset)} ({t(LEVELS[sessionB.lv || 's'].name)})
                </span>
                <span className="mono font-bold shrink-0">
                  {sessionB.reps} {t('reps')}
                </span>
              </div>
              <div className="progress-track" style={{ height: 10 }}>
                <i
                  className="progress-fill"
                  style={{
                    width: `${(sessionB.reps / maxReps) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Time Per Card Comparison */}
        <div className="surface-inset rounded-2xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
            <span className="font-semibold">{t('Time per card comparison')}</span>
            <span className="mono mut flex items-center gap-3">
              <span>— {t('Session A')}</span>
              <span style={{ color: 'var(--ac)' }}>● {t('Session B')}</span>
            </span>
          </div>

          {hasPerCardSplits ? (
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full"
              role="img"
              aria-label={t('Time per card comparison')}
            >
              {[Math.round(maxCardSec), Math.round(maxCardSec / 2), 0].map((mark, idx) => {
                const y = padY + plotH - (mark / maxCardSec) * plotH;
                return (
                  <g key={`${idx}-${mark}`}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartW - padX}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="var(--mut)"
                      className="mono"
                    >
                      {mark}s
                    </text>
                  </g>
                );
              })}

              {timesA.length > 0 && (
                <path
                  d={buildNormalizedPath(timesA)}
                  fill="none"
                  stroke="var(--mut)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {timesB.length > 0 && (
                <path
                  d={buildNormalizedPath(timesB)}
                  fill="none"
                  stroke="var(--ac)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          ) : (
            <p className="mut text-xs">
              {t('No per-card splits recorded for these sessions; showing session averages.')}
            </p>
          )}
        </div>

        {/* Chart 3: RPE Progression */}
        <div className="surface-inset rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs mb-2">
            <span className="font-semibold">{t('RPE progression')}</span>
            <span className="mono mut">
              {rpeProgression.length} {t('rated sessions')}
            </span>
          </div>

          {rpeProgression.length === 0 ? (
            <p className="mut text-xs">
              {t('No RPE ratings recorded for the selected sessions.')}
            </p>
          ) : (
            <svg
              viewBox={`0 0 ${rpeW} ${rpeH}`}
              className="w-full"
              role="img"
              aria-label={t('RPE progression')}
            >
              {[10, 5, 1].map((mark) => {
                const y = rpeY(mark);
                return (
                  <g key={mark}>
                    <line
                      x1={rpePadX}
                      y1={y}
                      x2={rpeW - rpePadX}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x={rpePadX - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="var(--mut)"
                      className="mono"
                    >
                      {mark}
                    </text>
                  </g>
                );
              })}

              {rpeProgression.length >= 2 && (
                <path
                  d={rpeProgression
                    .map(
                      (s, i) =>
                        `${i === 0 ? 'M' : 'L'}${rpeX(i).toFixed(1)},${rpeY(s.rpe).toFixed(1)}`
                    )
                    .join(' ')}
                  fill="none"
                  stroke="var(--ac)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {rpeProgression.map((s, i) => {
                const isSelected = s.d === sessionA.d || s.d === sessionB.d;
                return (
                  <g key={`${s.d}-${i}`}>
                    <circle
                      cx={rpeX(i)}
                      cy={rpeY(s.rpe)}
                      r={isSelected ? 5 : 3.4}
                      style={{
                        fill:
                          s.d === sessionB.d
                            ? 'var(--ac)'
                            : s.d === sessionA.d
                            ? 'var(--tx)'
                            : 'var(--mut)',
                        stroke: 'var(--surface)',
                        strokeWidth: 1.5,
                      }}
                    >
                      <title>{`${formatDate(s.d)} · RPE ${s.rpe}/10`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </Modal>
  );
};
