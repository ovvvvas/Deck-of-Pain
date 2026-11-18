import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  Compass,
  Dumbbell,
  Flame,
  Gauge,
  Heart,
  Layers,
  Search,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { t } from '../data/i18n';
import type { Preset, WorkoutLog } from '../types/workout';
import {
  type Achievement,
  type BadgeCategory,
  type BadgeIconKind,
  computeAchievements,
  getNextQuests,
  getRecentAchievedBadges,
} from '../utils/achievements';
import { sfx } from '../utils/sound';
import { JokerIcon } from './SuitIcon';

const BadgeIcon: React.FC<{
  kind: BadgeIconKind;
  unlocked: boolean;
}> = ({ kind, unlocked }) => {
  const props = {
    className: 'w-4 h-4 shrink-0',
    style: { color: unlocked ? 'var(--ac)' : 'var(--mut)' },
    'aria-hidden': true as const,
  };
  switch (kind) {
    case 'zap':
      return <Zap {...props} />;
    case 'layers':
      return <Layers {...props} />;
    case 'flame':
      return <Flame {...props} />;
    case 'trophy':
      return <Trophy {...props} />;
    case 'target':
      return <Target {...props} />;
    case 'award':
      return <Award {...props} />;
    case 'gauge':
      return <Gauge {...props} />;
    case 'heart':
      return <Heart {...props} />;
    case 'compass':
      return <Compass {...props} />;
    case 'dumbbell':
      return <Dumbbell {...props} />;
    case 'joker':
      return <JokerIcon height="1.15rem" />;
  }
};

interface HomeRecentBadgesProps {
  logs: WorkoutLog[];
  presets: Preset[];
  onOpenAll: () => void;
}

export const HomeRecentBadges: React.FC<HomeRecentBadgesProps> = ({
  logs,
  presets,
  onOpenAll,
}) => {
  const achievements = useMemo(
    () => computeAchievements(logs, presets),
    [logs, presets]
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const recentFive = useMemo(() => {
    const achieved = getRecentAchievedBadges(achievements, 5);
    if (achieved.length >= 5) return achieved;
    const needed = 5 - achieved.length;
    const nextUp = getNextQuests(achievements, needed);
    return [...achieved, ...nextUp];
  }, [achievements]);

  return (
    <section
      className="surface-card rounded-3xl p-4 sm:p-5 min-w-0 w-full"
      aria-label={t('Recent badges')}
    >
      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Trophy
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--ac)' }}
            aria-hidden="true"
          />
          <h2 className="text-sm sm:text-base font-bold truncate">
            {t(unlockedCount > 0 ? 'Recent badges' : 'Starter quests')}
          </h2>
          <span className="mono mut text-xs shrink-0">
            {unlockedCount}/{achievements.length}
          </span>
        </div>

        <button
          type="button"
          className="btn !min-h-[36px] !min-w-0 !px-2.5 sm:!px-3 text-xs whitespace-nowrap shrink-0"
          onClick={onOpenAll}
        >
          <span>
            {t('View all')} ({achievements.length})
          </span>
          <ArrowRight className="w-3.5 h-3.5 flip shrink-0" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 min-w-0">
        {recentFive.map((badge, idx) => {
          const pct = Math.min(
            100,
            Math.round((badge.current / Math.max(1, badge.target)) * 100)
          );
          return (
            <button
              key={badge.id}
              type="button"
              onClick={onOpenAll}
              className={`surface-inset rounded-2xl p-3 text-start flex flex-col justify-between gap-2 hover:opacity-90 transition-opacity min-w-0 w-full ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
              style={
                badge.unlocked
                  ? {
                      borderColor: 'var(--ac)',
                      backgroundColor: 'var(--surface)',
                    }
                  : { opacity: 0.8 }
              }
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <BadgeIcon kind={badge.icon} unlocked={badge.unlocked} />
                {badge.unlocked ? (
                  <Check
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--ac)' }}
                    aria-label={t('Unlocked')}
                  />
                ) : (
                  <span className="mono mut text-[10px] shrink-0">
                    {badge.current.toLocaleString()}/
                    {badge.target.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="min-w-0 w-full">
                <div className="font-semibold text-xs leading-snug truncate">
                  {t(badge.title)}
                </div>
                <div className="mut text-[11px] truncate">
                  {t(badge.category)}
                </div>
              </div>

              <div className="progress-track w-full" style={{ height: 4 }}>
                <i
                  className="progress-fill"
                  style={{
                    width: `${pct}%`,
                    opacity: badge.unlocked ? 1 : 0.45,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

interface AchievementsHubProps {
  logs: WorkoutLog[];
  presets: Preset[];
}

const BADGE_FILTERS: (
  | 'All'
  | 'Unlocked'
  | 'In progress'
  | BadgeCategory
)[] = [
  'All',
  'Unlocked',
  'In progress',
  'Volume',
  'Decks',
  'Streaks',
  'Speed & RPE',
  'Endurance',
  'Protocols',
  'Movements',
];

export const AchievementsHub: React.FC<AchievementsHubProps> = ({
  logs,
  presets,
}) => {
  const [filter, setFilter] = useState<string>('All');
  const [query, setQuery] = useState('');

  const achievements = useMemo(
    () => computeAchievements(logs, presets),
    [logs, presets]
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPct = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);

  const nextQuests = useMemo(
    () => getNextQuests(achievements, 3),
    [achievements]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return achievements.filter((item) => {
      if (filter === 'Unlocked' && !item.unlocked) return false;
      if (filter === 'In progress' && item.unlocked) return false;
      if (
        filter !== 'All' &&
        filter !== 'Unlocked' &&
        filter !== 'In progress' &&
        item.category !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return `${item.title} ${t(item.title)} ${item.description} ${item.category} ${t(
        item.category
      )}`
        .toLowerCase()
        .includes(q);
    });
  }, [achievements, filter, query]);

  return (
    <section className="space-y-4 sm:space-y-5 min-w-0 w-full">
      {/* Header Progress Card */}
      <div className="surface-card rounded-3xl p-4 sm:p-6 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="mut text-xs font-semibold uppercase tracking-wider">
              {t('Badges & Quests')}
            </div>
            <h1 className="disp text-2xl sm:text-4xl font-black leading-tight mt-0.5 break-words">
              {unlockedCount} / {totalCount} {t('unlocked')}
            </h1>
          </div>

          <div className="text-end shrink-0">
            <div
              className="mono text-2xl sm:text-3xl font-bold"
              style={{ color: 'var(--ac)' }}
            >
              {completionPct}%
            </div>
            <div className="mut text-xs">{t('Completion')}</div>
          </div>
        </div>

        <div className="progress-track" style={{ height: 10 }}>
          <i
            className="progress-fill"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Active Next Quests Spotlight */}
        {nextQuests.length > 0 && (
          <div className="pt-2 min-w-0">
            <div className="mut text-xs font-semibold uppercase tracking-wider mb-2">
              {t('Next quests')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
              {nextQuests.map((qItem: Achievement) => {
                const pct = Math.min(
                  100,
                  Math.round((qItem.current / Math.max(1, qItem.target)) * 100)
                );
                return (
                  <div
                    key={qItem.id}
                    className="surface-inset rounded-2xl p-3 space-y-1.5 min-w-0 w-full"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0 font-semibold text-xs flex-1">
                        <BadgeIcon kind={qItem.icon} unlocked={false} />
                        <span className="truncate">{t(qItem.title)}</span>
                      </span>
                      <span className="mono mut text-[11px] shrink-0">
                        {qItem.current.toLocaleString()}/
                        {qItem.target.toLocaleString()}
                      </span>
                    </div>
                    <p className="mut text-[11px] truncate">
                      {qItem.description}
                    </p>
                    <div className="progress-track" style={{ height: 5 }}>
                      <i
                        className="progress-fill"
                        style={{ width: `${pct}%`, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search + Category Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center min-w-0 w-full">
        <div className="relative w-full sm:w-64 shrink-0 min-w-0">
          <Search
            className="w-4 h-4 mut absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search badges or quests...')}
            aria-label={t('Search badges or quests...')}
            className="w-full rounded-xl ps-9 pe-8 text-sm"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--tx)',
              minHeight: 42,
              border: '1px solid var(--border)',
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={t('Clear search')}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 mut"
              onClick={() => setQuery('')}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className="flex flex-wrap gap-1.5 w-full sm:flex-1 min-w-0"
          role="group"
          aria-label={t('Filter badges')}
        >
          {BADGE_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn !min-h-[36px] !min-w-0 !px-2.5 sm:!px-3 text-xs whitespace-nowrap ${
                filter === cat ? 'btn-active' : ''
              }`}
              aria-pressed={filter === cat}
              onClick={() => {
                sfx.pop();
                setFilter(cat);
              }}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Badge Grid */}
      {filtered.length === 0 ? (
        <div className="surface-card rounded-3xl p-8 text-center space-y-3">
          <p className="mut text-sm">{t('No badges match your filter.')}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFilter('All');
              setQuery('');
            }}
          >
            {t('Reset')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0 w-full">
          {filtered.map((badge) => {
            const pct = Math.min(
              100,
              Math.round((badge.current / Math.max(1, badge.target)) * 100)
            );
            return (
              <article
                key={badge.id}
                className="surface-card rounded-2xl p-4 flex flex-col justify-between gap-2.5 min-w-0 w-full"
                style={
                  badge.unlocked
                    ? { borderColor: 'var(--ac)' }
                    : { opacity: 0.78 }
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="surface-inset w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                      <BadgeIcon kind={badge.icon} unlocked={badge.unlocked} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">
                        {t(badge.title)}
                      </h3>
                      <div className="mut text-[11px] truncate">
                        {t(badge.category)}
                        {badge.isQuest ? ` · ${t('Quest')}` : ''}
                      </div>
                    </div>
                  </div>

                  {badge.unlocked ? (
                    <Check
                      className="w-4 h-4 shrink-0 mt-1"
                      style={{ color: 'var(--ac)' }}
                      aria-label={t('Unlocked')}
                    />
                  ) : (
                    <span className="mono mut text-xs shrink-0 mt-0.5">
                      {pct}%
                    </span>
                  )}
                </div>

                <p className="mut text-xs leading-relaxed">
                  {badge.description}
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] mono mut">
                    <span>
                      {badge.unlocked ? t('Unlocked') : t('Progress')}
                    </span>
                    <span>
                      {badge.current.toLocaleString()} /{' '}
                      {badge.target.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 5 }}>
                    <i
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        opacity: badge.unlocked ? 1 : 0.5,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
