import React from 'react';
import { t } from '../data/i18n';
import type { CardSplit } from '../types/workout';
import { formatDuration } from '../utils/deck';
import { SuitGlyph } from './SuitIcon';

interface ChartsProps {
  splits: CardSplit[];
  movementNames: string[];
}

const average = (values: number[]): number =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const ChartsInner: React.FC<ChartsProps> = ({ splits, movementNames }) => {
  const count = splits.length;
  if (count < 3) {
    return (
      <p className="mut text-sm mb-4">
        {t('Draw a few cards and your pace trend appears here.')}
      </p>
    );
  }

  const width = 320;
  const height = 110;
  const pad = 10;

  // Guard against 0-second splits (e.g., rapid taps)
  const secPerRep = splits.map((row) => row[2] / Math.max(1, row[1]));
  const rollingAvg = secPerRep.map((_, idx) =>
    average(secPerRep.slice(Math.max(0, idx - 4), idx + 1))
  );

  const phaseSize = Math.max(1, Math.floor(count / 3));
  const phaseAvgs = [
    secPerRep.slice(0, phaseSize),
    secPerRep.slice(phaseSize, count - phaseSize),
    secPerRep.slice(count - phaseSize),
  ].map(average);

  const firstPhase = Math.max(0.05, phaseAvgs[0]);
  const paceFadePct = (phaseAvgs[2] / firstPhase - 1) * 100;
  const meanSecPerRep = Math.max(0.05, average(secPerRep));
  const stdDev = Math.sqrt(
    average(secPerRep.map((v) => (v - meanSecPerRep) ** 2))
  );
  const variabilityPct = (stdDev / meanSecPerRep) * 100;

  const midIdx = (count - 1) / 2;
  const denomSlope = secPerRep.reduce(
    (sum, _, idx) => sum + (idx - midIdx) ** 2,
    0
  );
  const slope =
    denomSlope > 0
      ? secPerRep.reduce(
          (sum, val, idx) => sum + (idx - midIdx) * (val - meanSecPerRep),
          0
        ) / denomSlope
      : 0;
  const trendLine = secPerRep.map((_, idx) => meanSecPerRep + slope * (idx - midIdx));
  const perTenCardsPct = ((slope * 10) / meanSecPerRep) * 100;

  const totalWorkSecs = splits.reduce((sum, row) => sum + row[2], 0);
  const totalRestSecs = splits.reduce((sum, row) => sum + (row[3] || 0), 0);
  const totalReps = Math.max(
    1,
    splits.reduce((sum, row) => sum + row[1], 0)
  );

  const toX = (idx: number, len: number) =>
    pad + (idx * (width - 2 * pad)) / Math.max(1, len - 1);
  const toY = (val: number, maxVal: number) =>
    height - pad - (val / Math.max(0.1, maxVal)) * (height - 2 * pad);

  const buildPath = (series: number[], maxVal: number) =>
    series
      .map(
        (val, idx) =>
          `${idx ? 'L' : 'M'}${toX(idx, series.length).toFixed(1)},${toY(
            val,
            maxVal
          ).toFixed(1)}`
      )
      .join('');

  const maxPaceY = Math.max(0.5, ...secPerRep, ...trendLine) * 1.1;
  const maxCardSecs = Math.max(1, ...splits.map((r) => r[2])) * 1.1;
  const minPace = Math.min(...secPerRep);
  const maxPace = Math.max(...secPerRep);
  const bestIdx = secPerRep.indexOf(minPace);
  const slowestIdx = secPerRep.indexOf(maxPace);

  let cumWork = 0;
  let cumReps = 0;
  const cumulativePoints = splits.map((row) => {
    cumWork += row[2];
    cumReps += row[1];
    return [cumWork, cumReps] as const;
  });
  const safeTotalWork = Math.max(0.1, cumWork);
  const safeTotalReps = Math.max(1, cumReps);
  const cumulativePath =
    `M${pad},${height - pad}` +
    cumulativePoints
      .map(
        ([w, r]) =>
          `L${(pad + (w / safeTotalWork) * (width - 2 * pad)).toFixed(1)},${(
            height -
            pad -
            (r / safeTotalReps) * (height - 2 * pad)
          ).toFixed(1)}`
      )
      .join('');

  const suitColor = (suitIdx: number) =>
    suitIdx === 1 || suitIdx === 2
      ? 'var(--red)'
      : suitIdx >= 4
      ? 'var(--joker)'
      : 'var(--tx)';

  const heatBackground = (val: number) => {
    const ratio = maxPace > minPace ? (val - minPace) / (maxPace - minPace) : 0;
    return `rgba(217, 78, 40, ${(0.08 + 0.55 * ratio).toFixed(2)})`;
  };

  const movementFades = movementNames
    .map((name, suitIdx) => {
      const paces = splits
        .filter((row) => row[0] === suitIdx)
        .map((row) => row[2] / Math.max(1, row[1]));
      const half = Math.floor(paces.length / 2);
      const firstHalf = half ? average(paces.slice(0, half)) : paces[0] || 0;
      const secondHalf = half ? average(paces.slice(half)) : firstHalf;
      return { name, suitIdx, firstHalf, secondHalf };
    })
    .filter((item) => item.firstHalf > 0);

  const maxMoveFade = Math.max(
    0.1,
    ...movementFades.map((m) => Math.max(m.firstHalf, m.secondHalf))
  );

  const fadeSummary = t(
    paceFadePct < 10
      ? 'Strong endurance: your pace held steady.'
      : paceFadePct < 25
      ? 'Normal fatigue: you slowed gradually.'
      : 'Heavy fade: start a little slower next time.'
  );

  const lineStyle = (
    stroke: string,
    strokeWidth: number,
    dash?: string
  ): React.CSSProperties => ({
    fill: 'none',
    stroke,
    strokeWidth,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    strokeDasharray: dash,
  });

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          {
            val: `${paceFadePct > 0 ? '+' : ''}${paceFadePct.toFixed(0)}%`,
            label: 'pace fade',
            color: paceFadePct >= 25 ? 'var(--red)' : undefined,
          },
          {
            val: `${perTenCardsPct > 0 ? '+' : ''}${perTenCardsPct.toFixed(1)}%`,
            label: 'per 10 cards',
          },
          {
            val: `${variabilityPct.toFixed(0)}%`,
            label: 'variability',
          },
          {
            val: `${(totalWorkSecs / totalReps).toFixed(1)}s`,
            label: 'avg s/rep',
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="surface-inset rounded-2xl p-2.5 text-center"
          >
            <div
              className="mono font-bold text-lg"
              style={metric.color ? { color: metric.color } : undefined}
            >
              {metric.val}
            </div>
            <div className="mut text-xs">{t(metric.label)}</div>
          </div>
        ))}
      </div>

      <p className="text-sm mb-1 font-medium">{fadeSummary}</p>
      <p className="mut text-xs mb-3">
        {t(
          'Pace fade compares seconds per rep in the last third of the deck with the first third. Trend is the slope of the dashed line. Rest and pauses are excluded.'
        )}
      </p>

      {totalRestSecs > 0 && (
        <div className="surface-inset rounded-2xl p-3 mb-3">
          <div className="mut text-xs mb-2">
            {t('Work')} {formatDuration(totalWorkSecs * 1000)} · {t('Rest')}{' '}
            {formatDuration(totalRestSecs * 1000)} (
            {Math.round(
              (totalRestSecs / Math.max(1, totalWorkSecs + totalRestSecs)) * 100
            )}
            % {t('resting')})
          </div>
          <div className="progress-track">
            <i
              className="progress-fill"
              style={{
                width: `${
                  (totalWorkSecs / Math.max(1, totalWorkSecs + totalRestSecs)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="surface-inset rounded-2xl p-3 mb-3">
        <div className="mut text-xs mb-2">
          {t('Pace by phase (seconds per rep)')}
        </div>
        {(['Start', 'Middle', 'End'] as const).map((phase, idx) => (
          <div
            key={phase}
            className="flex items-center gap-2 text-xs mb-1.5 last:mb-0"
          >
            <span className="w-14 shrink-0">{t(phase)}</span>
            <div className="progress-track flex-1" style={{ height: 8 }}>
              <i
                className="progress-fill"
                style={{
                  width: `${
                    (phaseAvgs[idx] / Math.max(0.1, ...phaseAvgs)) * 100
                  }%`,
                }}
              />
            </div>
            <span className="mono text-right w-10 shrink-0">
              {phaseAvgs[idx].toFixed(1)}s
            </span>
          </div>
        ))}
      </div>

      <div className="surface-inset rounded-2xl p-3 mb-3">
        <div className="mut text-xs mb-2">
          {t('Seconds per rep per card. Bold = 5-card average, dashed = fatigue trend')}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Seconds per rep, fatigue trend ${paceFadePct.toFixed(0)} percent`}
        >
          <defs>
            <linearGradient id="fatigueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--red)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--red)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d={`${buildPath(trendLine, maxPaceY)} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`}
            style={{ fill: 'url(#fatigueGrad)' }}
          />
          <path d={buildPath(secPerRep, maxPaceY)} style={lineStyle('var(--mut)', 1.2)} />
          <path
            d={buildPath(trendLine, maxPaceY)}
            style={lineStyle('var(--red)', 1.8, '4 4')}
          />
          <path
            d={buildPath(rollingAvg, maxPaceY)}
            style={lineStyle('var(--ac)', 2.5)}
          />
          <circle
            cx={toX(bestIdx, count)}
            cy={toY(minPace, maxPaceY)}
            r="4"
            style={{ fill: '#16a34a' }}
          />
          <circle
            cx={toX(slowestIdx, count)}
            cy={toY(maxPace, maxPaceY)}
            r="4"
            style={{ fill: 'var(--red)' }}
          />
        </svg>
        <div className="flex flex-wrap justify-between items-center gap-1.5 mut text-xs mt-1">
          <span>
            {t('Best')} #{bestIdx + 1}: {minPace.toFixed(1)}
            {t('s/rep')}
          </span>
          <span className="font-semibold" style={paceFadePct > 15 ? { color: 'var(--red)' } : undefined}>
            {paceFadePct > 0 ? '+' : ''}{paceFadePct.toFixed(0)}% {t('fatigue slowdown')}
          </span>
          <span>
            {t('Slowest')} #{slowestIdx + 1}: {maxPace.toFixed(1)}
            {t('s/rep')}
          </span>
        </div>
      </div>

      <div className="surface-inset rounded-2xl p-3 mb-3">
        <div className="mut text-xs mb-2">
          {t('Time per card, seconds (red = hearts/diamonds, purple = joker)')}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={t('Time per card')}
        >
          {splits.map((row, idx) => {
            const barW = (width - 2 * pad) / count;
            const barH = (row[2] / maxCardSecs) * (height - 2 * pad);
            return (
              <rect
                key={idx}
                x={pad + idx * barW + 0.5}
                y={height - pad - barH}
                width={Math.max(1, barW - 1)}
                height={Math.max(1, barH)}
                rx="1.5"
                style={{ fill: suitColor(row[0]) }}
              >
                <title>
                  #{idx + 1}: {row[2].toFixed(1)}s (
                  {(row[2] / Math.max(1, row[1])).toFixed(1)}
                  {t('s/rep')})
                </title>
              </rect>
            );
          })}
        </svg>
        <div className="mut text-xs mb-2 mt-3">
          {t('Every card: time taken (darker = slower per rep)')}
        </div>
        <div className="grid grid-cols-5 gap-1 min-w-0">
          {splits.map((row, idx) => (
            <div
              key={idx}
              className="rounded-lg py-1 px-0.5 text-center min-w-0"
              style={{ background: heatBackground(secPerRep[idx]) }}
              title={`#${idx + 1}: ${row[2].toFixed(1)}s`}
            >
              <div className="mut text-[10px]">#{idx + 1}</div>
              <div className="text-xs sm:text-sm font-bold truncate">
                <SuitGlyph suit={row[0]} /> {row[1]}
              </div>
              <div className="mono text-[11px] sm:text-xs">{row[2].toFixed(1)}s</div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-inset rounded-2xl p-3 mb-3">
        <div className="mut text-xs mb-2">
          {t('Cumulative reps over work time (dashed = even pace)')}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={t('Cumulative reps')}
        >
          <path
            d={`M${pad},${height - pad}L${width - pad},${pad}`}
            style={lineStyle('var(--mut)', 1.2, '4 4')}
          />
          <path d={cumulativePath} style={lineStyle('var(--ac)', 2.5)} />
        </svg>
      </div>

      <div className="surface-inset rounded-2xl p-3">
        <div className="mut text-xs mb-2">
          {t('Fade by movement: first half vs second half (s/rep)')}
        </div>
        {movementFades.map((item) => {
          const ratio = item.secondHalf / Math.max(0.05, item.firstHalf);
          return (
            <div key={`${item.suitIdx}-${item.name}`} className="mb-2.5 last:mb-0">
              <div className="flex flex-wrap justify-between gap-1 text-xs mb-1 min-w-0">
                <span className="truncate min-w-0">
                  <SuitGlyph suit={item.suitIdx} /> {t(item.name)}
                </span>
                <span
                  className="mono shrink-0"
                  style={ratio >= 1.25 ? { color: 'var(--red)' } : undefined}
                >
                  {item.firstHalf.toFixed(1)}s {t('to')}{' '}
                  {item.secondHalf.toFixed(1)}s (
                  {item.secondHalf >= item.firstHalf ? '+' : ''}
                  {((ratio - 1) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="progress-track" style={{ height: 6 }}>
                <i
                  className="progress-fill"
                  style={{
                    width: `${(item.firstHalf / maxMoveFade) * 100}%`,
                    opacity: 0.45,
                  }}
                />
              </div>
              <div className="progress-track mt-1" style={{ height: 6 }}>
                <i
                  className="progress-fill"
                  style={{ width: `${(item.secondHalf / maxMoveFade) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Charts = React.memo(ChartsInner);
