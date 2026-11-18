import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { t } from '../data/i18n';
import type { Language, WorkoutLog } from '../types/workout';

interface RpeTrendChartProps {
  logs: WorkoutLog[];
  lang: Language;
}

export const RpeTrendChart: React.FC<RpeTrendChartProps> = ({ logs, lang }) => {
  const rpeSessions = useMemo(
    () =>
      logs
        .filter(
          (entry): entry is WorkoutLog & { rpe: number } =>
            typeof entry.rpe === 'number' && entry.rpe >= 1 && entry.rpe <= 10
        )
        .slice()
        .sort((a, b) => a.d - b.d)
        .slice(-30),
    [logs]
  );

  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));

  if (rpeSessions.length === 0) {
    return (
      <div className="surface-card rounded-3xl p-4 sm:p-6 min-w-0 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Activity
            className="w-4 h-4"
            style={{ color: 'var(--ac)' }}
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold">{t('RPE trend')}</h2>
        </div>
        <p className="mut text-sm">
          {t(
            'Rate perceived exertion (RPE 1–10) after completing a workout to see your trend over time.'
          )}
        </p>
      </div>
    );
  }

  const latestRpe = rpeSessions[rpeSessions.length - 1].rpe;
  const avgRpe =
    rpeSessions.reduce((sum, s) => sum + s.rpe, 0) / rpeSessions.length;

  const width = 520;
  const height = 148;
  const padX = 24;
  const padY = 14;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const toX = (idx: number) =>
    rpeSessions.length === 1
      ? width / 2
      : padX + (idx * plotW) / (rpeSessions.length - 1);
  const toY = (rpe: number) =>
    padY + plotH - ((rpe - 1) / 9) * plotH;

  const linePath = rpeSessions
    .map(
      (s, idx) =>
        `${idx === 0 ? 'M' : 'L'}${toX(idx).toFixed(1)},${toY(s.rpe).toFixed(
          1
        )}`
    )
    .join(' ');

  const areaPath =
    rpeSessions.length >= 2
      ? `${linePath} L${toX(rpeSessions.length - 1).toFixed(1)},${(
          padY + plotH
        ).toFixed(1)} L${toX(0).toFixed(1)},${(padY + plotH).toFixed(1)} Z`
      : '';

  // Linear regression slope across rated sessions
  const n = rpeSessions.length;
  const midIdx = (n - 1) / 2;
  const denom = rpeSessions.reduce(
    (sum, _, idx) => sum + (idx - midIdx) ** 2,
    0
  );
  const slope =
    denom > 0
      ? rpeSessions.reduce(
          (sum, s, idx) => sum + (idx - midIdx) * (s.rpe - avgRpe),
          0
        ) / denom
      : 0;
  const trendStartY = toY(Math.min(10, Math.max(1, avgRpe + slope * (0 - midIdx))));
  const trendEndY = toY(Math.min(10, Math.max(1, avgRpe + slope * (n - 1 - midIdx))));

  const deltaVsPrev =
    n >= 2 ? latestRpe - rpeSessions[n - 2].rpe : 0;

  return (
    <div className="surface-card rounded-3xl p-4 sm:p-6 min-w-0 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--ac)' }}
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold">{t('RPE trend')}</h2>
        </div>
        <span className="mut text-xs mono">
          {rpeSessions.length} {t('rated sessions')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div className="mono font-bold text-base sm:text-lg">
            {latestRpe}/10
          </div>
          <div className="mut text-[11px]">{t('Latest RPE')}</div>
        </div>
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div className="mono font-bold text-base sm:text-lg">
            {avgRpe.toFixed(1)}/10
          </div>
          <div className="mut text-[11px]">{t('Average RPE')}</div>
        </div>
        <div className="surface-inset rounded-2xl p-2.5 text-center">
          <div
            className="mono font-bold text-base sm:text-lg"
            style={deltaVsPrev >= 2 ? { color: 'var(--red)' } : undefined}
          >
            {n >= 2
              ? `${deltaVsPrev > 0 ? '+' : ''}${deltaVsPrev}`
              : '—'}
          </div>
          <div className="mut text-[11px]">{t('vs previous')}</div>
        </div>
      </div>

      {rpeSessions.length === 1 ? (
        <p className="mut text-xs">
          {t('Log one more rated session to plot your RPE trend line.')}
        </p>
      ) : (
        <div className="surface-inset rounded-2xl p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            role="img"
            aria-label={`${t('RPE trend')}: ${avgRpe.toFixed(1)}/10`}
          >
            <defs>
              <linearGradient id="rpeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.24" />
                <stop offset="100%" stopColor="var(--ac)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[10, 6, 2].map((levelMark) => {
              const y = toY(levelMark);
              return (
                <g key={levelMark}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={width - padX}
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
                    {levelMark}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#rpeAreaGrad)" />

            {n >= 3 && (
              <line
                x1={toX(0)}
                y1={trendStartY}
                x2={toX(n - 1)}
                y2={trendEndY}
                stroke="var(--mut)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}

            <path
              d={linePath}
              fill="none"
              stroke="var(--ac)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {rpeSessions.map((session, idx) => (
              <circle
                key={`${session.d}-${idx}`}
                cx={toX(idx)}
                cy={toY(session.rpe)}
                r={rpeSessions.length > 20 ? 3.2 : 4}
                style={{
                  fill: session.rpe >= 8 ? 'var(--red)' : 'var(--ac)',
                  stroke: 'var(--surface)',
                  strokeWidth: 1.5,
                }}
              >
                <title>
                  {`${t(session.preset)} · ${formatDate(session.d)} · RPE ${
                    session.rpe
                  }/10`}
                </title>
              </circle>
            ))}
          </svg>

          <div className="flex justify-between items-center mut text-[11px] mono mt-1.5">
            <span>{formatDate(rpeSessions[0].d)}</span>
            <span>{formatDate(rpeSessions[rpeSessions.length - 1].d)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
