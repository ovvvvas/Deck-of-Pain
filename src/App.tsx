import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Flame,
  HelpCircle,
  Heart,
  History,
  LayoutGrid,
  Palette,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AchievementsHub,
  HomeRecentBadges,
} from './components/AchievementBadges';
import { Charts } from './components/Charts';
import { DoneSummary } from './components/DoneSummary';
import { FormGuideModal } from './components/FormGuideModal';
import { GuidedRoutine } from './components/GuidedRoutine';
import { MovementOptions } from './components/MovementOptions';
import { Modal } from './components/Modal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { PerformanceCompareModal } from './components/PerformanceCompareModal';
import { RoutineEditorModal } from './components/RoutineEditorModal';
import { RpeTrendChart } from './components/RpeTrendChart';
import {
  MovementBreakdownList,
  computeSessionKcal,
} from './components/SessionBreakdown';
import { Stepper } from './components/Stepper';
import { SuitGlyph } from './components/SuitIcon';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { TourModal } from './components/TourModal';
import { WeeklyGoalCard } from './components/WeeklyGoalCard';
import { WeeklyVolumeChart } from './components/WeeklyVolumeChart';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { setAppLanguage, t } from './data/i18n';
import {
  ALL_MOVEMENTS,
  COOLDOWN_STEPS,
  LEVELS,
  WARMUP_STEPS,
} from './data/movements';
import {
  getDefaultPresetById,
  loadInitialPresets,
  persistPresets,
} from './data/presets';
import type {
  Language,
  LevelKey,
  Preset,
  SavedSession,
  ThemeAccentId,
  ThemeMode,
  WorkoutLog,
} from './types/workout';
import {
  cardReps,
  cleanLogEntry,
  computeStreak,
  computeWeeklyReps,
  formatDuration,
  fullDeckReps,
  getPresetMovementNames,
} from './utils/deck';
import { setAudioMuted, sfx } from './utils/sound';
import {
  clearSavedSession,
  loadSavedSession,
  loadUserSettings,
  loadWorkoutLogs,
  saveUserSettings,
  saveWorkoutLogs,
} from './utils/storage';
import {
  DEFAULT_ACCENT_ID,
  DEFAULT_THEME_MODE,
  isValidAccentId,
  isValidThemeMode,
  resolveThemeMode,
} from './utils/theme';

type AppView = 'home' | 'warm' | 'play' | 'done' | 'cool';
type DashboardTab = 'train' | 'protocols' | 'history' | 'badges';
type AnalysisTab = 'charts' | 'movements';

const CATEGORIES = [
  'All',
  'Favorites',
  'Full body',
  'Upper',
  'Lower',
  'Core',
  'Conditioning',
  'Custom',
] as const;

function hasActiveJokers(preset: Preset): boolean {
  if (preset.jrs) {
    return preset.jrs[0] > 0 || preset.jrs[1] > 0;
  }
  return (preset.jr ?? 50) > 0;
}

function getJokerSummary(preset: Preset): string {
  if (!hasActiveJokers(preset)) {
    return t('Jokers off');
  }
  const j1Move = preset.jokers?.[0] || preset.joker || 'Burpees';
  const j2Move =
    preset.jokers?.[1] || preset.jokers?.[0] || preset.joker || 'Jump Squats';
  const j1Reps = preset.jrs ? preset.jrs[0] : (preset.jr ?? 50);
  const j2Reps = preset.jrs ? preset.jrs[1] : (preset.jr ?? 50);

  const parts: string[] = [];
  if (j1Reps > 0) parts.push(`${t(j1Move)} (${j1Reps})`);
  if (j2Reps > 0) parts.push(`${t(j2Move)} (${j2Reps})`);
  return parts.join(' / ');
}

export default function App() {
  const [initialSettings] = useState(() => loadUserSettings());
  const [presets, setPresets] = useState<Preset[]>(() => loadInitialPresets());
  const [logs, setLogs] = useState<WorkoutLog[]>(() => loadWorkoutLogs());

  const [pid, setPid] = useState<string>(() => {
    const savedId = initialSettings.pid;
    return savedId && presets.some((p) => p.id === savedId)
      ? savedId
      : presets[0]?.id || 'p';
  });
  const [halfDeck, setHalfDeck] = useState<boolean>(
    () => Boolean(initialSettings.half)
  );
  const [autoRest, setAutoRest] = useState<boolean>(() =>
    initialSettings.auto !== undefined ? Boolean(initialSettings.auto) : true
  );
  const [warmFirst, setWarmFirst] = useState<boolean>(
    () => Boolean(initialSettings.warm)
  );
  const [level, setLevel] = useState<LevelKey>(() =>
    initialSettings.level && initialSettings.level in LEVELS
      ? initialSettings.level
      : 's'
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    isValidThemeMode(initialSettings.theme)
      ? initialSettings.theme
      : DEFAULT_THEME_MODE
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  );
  const [accent, setAccent] = useState<ThemeAccentId>(() =>
    isValidAccentId(initialSettings.accent)
      ? initialSettings.accent
      : DEFAULT_ACCENT_ID
  );
  const resolvedTheme = resolveThemeMode(themeMode, systemPrefersDark);
  const [muted, setMuted] = useState<boolean>(
    () => Boolean(initialSettings.mute)
  );
  const [lang, setLang] = useState<Language>(() =>
    initialSettings.lang === 'fa' ? 'fa' : 'en'
  );
  const [targetRpe, setTargetRpe] = useState<number | null>(() =>
    typeof initialSettings.targetRpe === 'number' &&
    initialSettings.targetRpe >= 1 &&
    initialSettings.targetRpe <= 10
      ? initialSettings.targetRpe
      : null
  );
  const [favoriteMovements, setFavoriteMovements] = useState<string[]>(() =>
    Array.isArray(initialSettings.favoriteMovements)
      ? initialSettings.favoriteMovements.filter(
          (m): m is string => typeof m === 'string' && ALL_MOVEMENTS.includes(m)
        )
      : []
  );
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() =>
    typeof initialSettings.weeklyGoal === 'number' &&
    initialSettings.weeklyGoal >= 250
      ? Math.min(25000, initialSettings.weeklyGoal)
      : 1000
  );

  // Sync language before rendering translated strings
  setAppLanguage(lang);

  const [view, setView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState<DashboardTab>('train');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [protocolQuery, setProtocolQuery] = useState<string>('');
  const [jokersExpanded, setJokersExpanded] = useState<boolean>(false);

  const [savedSession, setSavedSession] = useState<SavedSession | null>(() =>
    loadSavedSession(presets)
  );
  const [activeResume, setActiveResume] = useState<SavedSession | null>(null);
  const [lastCompletedLog, setLastCompletedLog] = useState<WorkoutLog | null>(
    null
  );
  const [doneCameFromCooldown, setDoneCameFromCooldown] = useState(false);

  // Modals & secondary drawers
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [showFormGuide, setShowFormGuide] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [inspectedLog, setInspectedLog] = useState<WorkoutLog | null>(null);
  const [inspectedTab, setInspectedTab] = useState<AnalysisTab>('charts');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Export / Import state
  const [showExportImport, setShowExportImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  // Listen to OS color scheme changes for System theme mode
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    setSystemPrefersDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Sync DOM attributes & settings persistence
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.accent = accent;
  }, [resolvedTheme, accent]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    setAppLanguage(lang);
  }, [lang]);

  useEffect(() => {
    setAudioMuted(muted);
  }, [muted]);

  useEffect(() => {
    saveUserSettings({
      theme: themeMode,
      accent,
      mute: muted,
      pid,
      half: halfDeck,
      auto: autoRest,
      level,
      warm: warmFirst,
      lang,
      targetRpe: targetRpe ?? undefined,
      favoriteMovements,
      weeklyGoal,
    });
  }, [
    themeMode,
    accent,
    muted,
    pid,
    halfDeck,
    autoRest,
    level,
    warmFirst,
    lang,
    targetRpe,
    favoriteMovements,
    weeklyGoal,
  ]);

  useEffect(() => {
    persistPresets(presets);
  }, [presets]);

  useEffect(() => {
    saveWorkoutLogs(logs);
  }, [logs]);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === pid) ?? presets[0],
    [presets, pid]
  );

  const editingPreset = useMemo(
    () => presets.find((p) => p.id === editingPresetId) ?? null,
    [presets, editingPresetId]
  );

  const filteredPresets = useMemo(() => {
    const q = protocolQuery.trim().toLowerCase();
    return presets.filter((p) => {
      if (categoryFilter === 'Favorites' && !p.favorite) return false;
      if (
        categoryFilter === 'Custom' &&
        !p.id.startsWith('c') &&
        p.cat !== 'Custom'
      ) {
        return false;
      }
      if (
        categoryFilter !== 'All' &&
        categoryFilter !== 'Favorites' &&
        categoryFilter !== 'Custom' &&
        p.cat !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      const searchable = [
        p.name,
        t(p.name),
        p.tag,
        t(p.tag),
        ...p.ex,
        ...p.ex.map((m) => t(m)),
        ...(p.jokers || []),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [presets, categoryFilter, protocolQuery]);

  const levelConfig = LEVELS[level];

  const projectedReps = useMemo(() => {
    const full = fullDeckReps({
      scale: 1,
      jr: selectedPreset.jr,
      jrs: selectedPreset.jrs,
      fx: levelConfig.faceOverrides,
    });
    return halfDeck ? Math.round(full / 2) : full;
  }, [selectedPreset, levelConfig, halfDeck]);

  const updateSelectedPreset = useCallback(
    (updater: (prev: Preset) => Preset) => {
      setPresets((prevList) =>
        prevList.map((item) =>
          item.id === selectedPreset.id ? updater(item) : item
        )
      );
    },
    [selectedPreset.id]
  );

  const toggleFavoriteMovement = useCallback((move: string) => {
    setFavoriteMovements((prev) =>
      prev.includes(move) ? prev.filter((m) => m !== move) : [...prev, move]
    );
  }, []);

  const toggleJokers = () => {
    sfx.pop();
    updateSelectedPreset((prev) => {
      if (hasActiveJokers(prev)) {
        return {
          ...prev,
          jrs: [0, 0],
          jokers: ['', ''],
          jr: 0,
        };
      }
      setJokersExpanded(true);
      return {
        ...prev,
        jrs: [40, 40],
        jokers: [
          prev.jokers?.[0] || prev.joker || 'Burpees',
          prev.jokers?.[1] || 'Jump Squats',
        ],
        jr: 80,
      };
    });
  };

  const handleClonePreset = (source: Preset) => {
    sfx.pop();
    const cloned: Preset = {
      ...source,
      id: `c${Date.now()}`,
      name: `${t(source.name)} (Custom)`.slice(0, 28),
      cat: source.cat || 'Custom',
      tag:
        source.cat && source.cat !== 'Custom'
          ? source.cat
          : 'Custom routine',
      ex: [...source.ex] as Preset['ex'],
      jokers: source.jokers
        ? ([...source.jokers] as [string, string])
        : [source.joker || 'Burpees', 'Jump Squats'],
      jrs: source.jrs
        ? ([...source.jrs] as [number, number])
        : [source.jr ?? 40, source.jr ?? 40],
      favorite: false,
    };
    setPresets((prev) => [...prev, cloned]);
    setPid(cloned.id);
    setEditingPresetId(cloned.id);
  };

  const handleStartNewSession = () => {
    sfx.pop();
    clearSavedSession();
    setSavedSession(null);
    setActiveResume(null);
    setDoneCameFromCooldown(false);
    setView(warmFirst ? 'warm' : 'play');
  };

  const handleResumeSession = () => {
    if (!savedSession) return;
    sfx.pop();
    setPid(savedSession.pid);
    setHalfDeck(savedSession.half);
    setLevel(savedSession.lv);
    setActiveResume(savedSession);
    setDoneCameFromCooldown(false);
    setView('play');
  };

  const handleDiscardSavedSession = () => {
    sfx.pop();
    clearSavedSession();
    setSavedSession(null);
  };

  const handleCompleteWorkout = useCallback((entry: WorkoutLog) => {
    setLogs((prev) => [entry, ...prev]);
    setLastCompletedLog(entry);
    setSavedSession(null);
    setActiveResume(null);
    setView('done');
  }, []);

  const handleSelectRpe = (rpeVal: number) => {
    sfx.pop();
    if (!lastCompletedLog) return;
    const targetTimestamp = lastCompletedLog.d;
    const updated: WorkoutLog = { ...lastCompletedLog, rpe: rpeVal };
    setLastCompletedLog(updated);
    setLogs((prev) =>
      prev.map((item) => (item.d === targetTimestamp ? updated : item))
    );
  };

  const handleExitPlayer = () => {
    setSavedSession(loadSavedSession(presets));
    setActiveResume(null);
    setView('home');
  };

  // Personal Records & Weekly Goal
  const records = useMemo(() => {
    const fullLogs = logs.filter((l) => !l.half);
    const blitzLogs = logs.filter((l) => l.half);
    const bestFull = fullLogs.length
      ? Math.min(...fullLogs.map((l) => l.secs))
      : null;
    const bestBlitz = blitzLogs.length
      ? Math.min(...blitzLogs.map((l) => l.secs))
      : null;
    const lifetimeReps = logs.reduce((sum, l) => sum + l.reps, 0);
    const streak = computeStreak(logs);
    const weekly = computeWeeklyReps(logs);
    return {
      bestFull,
      bestBlitz,
      lifetimeReps,
      sessionsCount: logs.length,
      streak,
      weeklyReps: weekly.reps,
      weeklySessions: weekly.sessions,
    };
  }, [logs]);

  const handleCopyJson = async () => {
    const payload = JSON.stringify(logs, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setImportText(payload);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleImportJson = () => {
    setImportStatus(null);
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        setImportStatus({
          message: t('Invalid JSON format'),
          isError: true,
        });
        return;
      }

      const validEntries = parsed
        .filter(
          (item): item is WorkoutLog =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof item.d === 'number' &&
            typeof item.secs === 'number' &&
            typeof item.reps === 'number' &&
            typeof item.preset === 'string'
        )
        .map(cleanLogEntry);

      const existingTimestamps = new Set(logs.map((l) => l.d));
      const newEntries = validEntries.filter(
        (entry) => !existingTimestamps.has(entry.d)
      );

      if (newEntries.length === 0) {
        setImportStatus({
          message:
            validEntries.length === 0
              ? t('Invalid JSON format')
              : t('No new sessions found'),
          isError: validEntries.length === 0,
        });
        return;
      }

      const merged = [...newEntries, ...logs].sort((a, b) => b.d - a.d);
      setLogs(merged);
      setImportText('');
      setImportStatus({
        message: `${t('Imported new sessions')} (${newEntries.length})`,
        isError: false,
      });
    } catch {
      setImportStatus({
        message: t('Invalid JSON format'),
        isError: true,
      });
    }
  };

  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));

  // Sub-views
  if (view === 'warm') {
    return (
      <>
        <GuidedRoutine
          title="Warm-up"
          steps={WARMUP_STEPS}
          secondsPerStep={30}
          onFinish={() => setView('play')}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (view === 'cool') {
    return (
      <>
        <GuidedRoutine
          title="Cool-down"
          steps={COOLDOWN_STEPS}
          secondsPerStep={30}
          onFinish={() => {
            setDoneCameFromCooldown(true);
            setView('done');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (view === 'play') {
    const activePreset =
      activeResume && presets.find((p) => p.id === activeResume.pid)
        ? presets.find((p) => p.id === activeResume.pid)!
        : selectedPreset;

    return (
      <>
        <WorkoutPlayer
          preset={activePreset}
          halfDeck={activeResume ? activeResume.half : halfDeck}
          resumeSession={activeResume}
          autoRest={autoRest}
          onAutoRestChange={setAutoRest}
          level={activeResume ? activeResume.lv : level}
          targetRpe={targetRpe}
          onExit={handleExitPlayer}
          onCompleteWorkout={handleCompleteWorkout}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (view === 'done' && lastCompletedLog) {
    const completedPreset = presets.find(
      (p) => p.name === lastCompletedLog.preset
    );
    return (
      <>
        <DoneSummary
          log={lastCompletedLog}
          allLogs={logs}
          presets={presets}
          preset={completedPreset}
          skipConfetti={doneCameFromCooldown}
          onSelectRpe={handleSelectRpe}
          onApplyRestAdjustment={(presetId, nextRestSecs) => {
            setPresets((prev) =>
              prev.map((item) =>
                item.id === presetId ? { ...item, rest: nextRestSecs } : item
              )
            );
          }}
          onStartCooldown={() => {
            sfx.pop();
            setView('cool');
          }}
          onReturnHome={() => {
            sfx.pop();
            setView('home');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  const displayedLogs = showAllLogs ? logs : logs.slice(0, 8);
  const facePreviewText = (['J', 'Q', 'K', 'A'] as const)
    .map(
      (rank) =>
        `${rank}:${cardReps(rank, 1, levelConfig.faceOverrides)}`
    )
    .join(' · ');

  const jokersActive = hasActiveJokers(selectedPreset);
  const j1Move =
    selectedPreset.jokers?.[0] || selectedPreset.joker || 'Burpees';
  const j2Move =
    selectedPreset.jokers?.[1] ||
    selectedPreset.jokers?.[0] ||
    selectedPreset.joker ||
    'Jump Squats';
  const j1Reps = selectedPreset.jrs?.[0] ?? selectedPreset.jr ?? 40;
  const j2Reps = selectedPreset.jrs?.[1] ?? selectedPreset.jr ?? 40;

  const templateCustomPreset: Preset = {
    id: `c${Date.now()}`,
    name: t('My Routine'),
    cat: 'Custom',
    tag: 'Custom routine',
    desc: 'Built by you from the movement bank.',
    ex: ['Pull-ups', 'Push-ups', 'Air Squats', 'Sit-ups'],
    rest: 30,
    scale: 1,
    jokers: ['Burpees', 'Jump Squats'],
    jrs: [40, 40],
  };

  const inspectedMovements = inspectedLog
    ? getPresetMovementNames(inspectedLog.preset, presets, inspectedLog.moves)
    : [];
  const inspectedKcal = inspectedLog
    ? computeSessionKcal(inspectedLog, inspectedMovements)
    : 0;

  const navItems: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'train', label: 'Train', icon: Flame },
    { id: 'protocols', label: 'Protocols', icon: LayoutGrid },
    { id: 'history', label: 'History', icon: History },
    { id: 'badges', label: 'Badges', icon: Trophy },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip pb-20 lg:pb-10">
      {/* Top Navigation Bar (Compact 1-row contract; sticky on desktop only to stay under mobile sticky cap) */}
      <header
        className="lg:sticky lg:top-0 z-30 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--nav-bg)',
        }}
      >
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10 h-14 lg:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="./icon.svg"
              alt="Deck of Pain"
              width={34}
              height={34}
              referrerPolicy="no-referrer"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0"
            />
            <span className="disp text-lg sm:text-[1.75rem] font-black tracking-tight truncate">
              Deck of Pain
            </span>
          </div>

          {/* Zone 2: Desktop Dashboard Tab Links */}
          <nav
            className="hidden lg:flex items-center gap-2 p-1 rounded-xl surface-inset"
            aria-label={t('Sections')}
          >
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={`btn !min-h-[38px] !rounded-lg !px-4 text-sm whitespace-nowrap shrink-0 ${
                    isActive ? 'btn-active' : 'btn-ghost'
                  }`}
                  onClick={() => {
                    sfx.pop();
                    setActiveTab(tab.id);
                  }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{t(tab.label)}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Compact Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              className="btn !min-h-[38px] !min-w-[38px] sm:!min-h-[40px] !px-2.5 sm:!px-3 text-xs sm:text-sm whitespace-nowrap shrink-0"
              aria-label={t('Language')}
              onClick={() => {
                sfx.pop();
                setLang((prev) => (prev === 'en' ? 'fa' : 'en'));
              }}
            >
              {lang === 'en' ? 'فا' : 'EN'}
            </button>

            <button
              type="button"
              className="btn !min-h-[38px] !min-w-[38px] sm:!min-h-[40px] sm:!min-w-[40px] !px-0 shrink-0"
              aria-label={t('How it works')}
              title={t('How it works')}
              onClick={() => {
                sfx.pop();
                setShowTour(true);
              }}
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="btn !min-h-[38px] !min-w-[38px] sm:!min-h-[40px] sm:!min-w-[40px] !px-0 shrink-0"
              aria-label={t(muted ? 'Unmute' : 'Mute')}
              title={t(muted ? 'Unmute' : 'Mute')}
              onClick={() => setMuted((prev) => !prev)}
            >
              {muted ? (
                <VolumeX className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="btn !min-h-[38px] !min-w-[38px] sm:!min-h-[40px] sm:!min-w-[40px] !px-0 shrink-0"
              aria-label={t('Theme settings')}
              title={t('Theme settings')}
              aria-haspopup="dialog"
              onClick={() => {
                sfx.pop();
                setShowThemeSettings(true);
              }}
            >
              <Palette className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 min-w-0">
        {/* TAB 1: TRAIN DASHBOARD (Clean, ready-to-use Home Screen) */}
        {activeTab === 'train' && (
          <div className="space-y-4 sm:space-y-5 min-w-0 w-full">
            {/* Resume Unfinished Session Strip */}
            {savedSession && (
              <div
                className="surface-card rounded-2xl p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: 'var(--ac)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RotateCcw
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--ac)' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold truncate">
                    {t('Resume unfinished session')} ({savedSession.idx}/
                    {savedSession.deck.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="btn !min-h-[40px] text-xs"
                    onClick={handleDiscardSavedSession}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('Discard')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-cta !min-h-[40px] text-xs sm:text-sm"
                    onClick={handleResumeSession}
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('Resume')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Compact Dashboard Overview Strip + Weekly Goal Ring */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-2.5 sm:gap-3 items-stretch min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  className="surface-card rounded-2xl p-2.5 sm:p-3.5 text-start hover:opacity-90 transition-opacity min-w-0 w-full"
                  onClick={() => {
                    sfx.pop();
                    setActiveTab('history');
                  }}
                >
                  <div className="mono font-bold text-lg sm:text-2xl leading-tight truncate">
                    {records.streak}
                  </div>
                  <div className="mut text-[11px] sm:text-xs truncate">
                    {t('Day streak')}
                  </div>
                </button>
                <button
                  type="button"
                  className="surface-card rounded-2xl p-2.5 sm:p-3.5 text-start hover:opacity-90 transition-opacity min-w-0 w-full"
                  onClick={() => {
                    sfx.pop();
                    setActiveTab('history');
                  }}
                >
                  <div className="mono font-bold text-lg sm:text-2xl leading-tight truncate">
                    {records.sessionsCount}
                  </div>
                  <div className="mut text-[11px] sm:text-xs truncate">
                    {t('Sessions')}
                  </div>
                </button>
                <button
                  type="button"
                  className="surface-card rounded-2xl p-2.5 sm:p-3.5 text-start hover:opacity-90 transition-opacity min-w-0 w-full"
                  onClick={() => {
                    sfx.pop();
                    setActiveTab('history');
                  }}
                >
                  <div className="mono font-bold text-lg sm:text-2xl leading-tight truncate">
                    {records.lifetimeReps}
                  </div>
                  <div className="mut text-[11px] sm:text-xs truncate">
                    {t('Lifetime reps')}
                  </div>
                </button>
                <button
                  type="button"
                  className="surface-card rounded-2xl p-2.5 sm:p-3.5 text-start hover:opacity-90 transition-opacity min-w-0 w-full"
                  onClick={() => {
                    sfx.pop();
                    setActiveTab('history');
                  }}
                >
                  <div className="mono font-bold text-lg sm:text-2xl leading-tight truncate">
                    {records.bestFull !== null
                      ? formatDuration(records.bestFull * 1000)
                      : records.bestBlitz !== null
                      ? formatDuration(records.bestBlitz * 1000)
                      : '—'}
                  </div>
                  <div className="mut text-[11px] sm:text-xs truncate">
                    {t(records.bestFull !== null ? 'Best full deck' : 'Best blitz')}
                  </div>
                </button>
              </div>

              <WeeklyGoalCard
                weeklyReps={records.weeklyReps}
                weeklySessions={records.weeklySessions}
                weeklyGoal={weeklyGoal}
                onChangeGoal={setWeeklyGoal}
              />
            </div>

            {/* 2-Column Ready-to-Train Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 items-stretch min-w-0">
              {/* Left: Active Protocol & Suit Matrix */}
              <section className="surface-card rounded-3xl p-4 sm:p-6 flex flex-col justify-between gap-4 min-w-0 w-full">
                <div className="space-y-4 min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="mut text-xs font-semibold uppercase tracking-wider">
                        {t('Active protocol')}
                      </div>
                      <h1
                        className="disp text-2xl sm:text-4xl font-black leading-tight break-words mt-0.5"
                        style={{ textWrap: 'balance' }}
                      >
                        {t(selectedPreset.name)}
                      </h1>
                      <p className="mut text-xs mt-0.5 truncate">
                        {t(selectedPreset.tag)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="btn !min-h-[40px] !min-w-0 !px-3 text-xs whitespace-nowrap"
                        onClick={() => {
                          sfx.pop();
                          setActiveTab('protocols');
                        }}
                      >
                        <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('Change')}</span>
                      </button>
                    </div>
                  </div>

                  <p className="mut text-xs sm:text-sm leading-relaxed break-words">
                    {t(selectedPreset.desc)}
                  </p>

                  {/* 4 Suits + Joker Summary */}
                  <div className="surface-inset rounded-2xl p-3 sm:p-4 space-y-2.5 min-w-0">
                    {selectedPreset.ex.map((move, idx) => (
                      <div
                        key={`${selectedPreset.id}-move-${idx}`}
                        className="flex items-center justify-between gap-2 text-xs sm:text-sm min-w-0"
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 text-center shrink-0 text-base">
                            <SuitGlyph suit={idx} />
                          </span>
                          <span className="font-medium truncate">{t(move)}</span>
                        </span>
                        <span className="mono mut text-xs shrink-0">
                          {cardReps('2', 1, levelConfig.faceOverrides)}–
                          {cardReps('A', 1, levelConfig.faceOverrides)}{' '}
                          {t('reps')}
                        </span>
                      </div>
                    ))}

                    <div
                      className="pt-2 border-t flex items-center justify-between gap-2 text-xs min-w-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 text-center shrink-0">
                          <SuitGlyph suit={4} />
                        </span>
                        <span className="truncate font-medium">
                          {getJokerSummary(selectedPreset)}
                        </span>
                      </span>
                      <span className="mono mut text-[11px] shrink-0 hidden sm:inline">
                        {facePreviewText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Protocol Actions */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2 pt-1 min-w-0">
                  <button
                    type="button"
                    className="btn !min-h-[40px] !min-w-0 !px-2.5 sm:!px-3.5 text-xs sm:text-sm"
                    onClick={() => {
                      sfx.pop();
                      setShowFormGuide(true);
                    }}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t('Form guide')}</span>
                  </button>

                  {selectedPreset.id.startsWith('c') ? (
                    <button
                      type="button"
                      className="btn !min-h-[40px] !min-w-0 !px-2.5 sm:!px-3.5 text-xs sm:text-sm"
                      onClick={() => {
                        sfx.pop();
                        setEditingPresetId(selectedPreset.id);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t('Edit routine')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn !min-h-[40px] !min-w-0 !px-2.5 sm:!px-3.5 text-xs sm:text-sm"
                      onClick={() => handleClonePreset(selectedPreset)}
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t('Clone to custom')}</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Right: Session Launchpad */}
              <section className="surface-card rounded-3xl p-4 sm:p-6 flex flex-col justify-between gap-4 min-w-0 w-full">
                <div className="space-y-4 min-w-0">
                  {/* Deck Mode */}
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <button
                      type="button"
                      className={`btn !min-h-[44px] !min-w-0 w-full !px-2 sm:!px-4 text-xs sm:text-sm ${
                        !halfDeck ? 'btn-active' : ''
                      }`}
                      aria-pressed={!halfDeck}
                      onClick={() => {
                        sfx.pop();
                        setHalfDeck(false);
                      }}
                    >
                      <span className="truncate">{t('Full Deck')}</span>
                    </button>
                    <button
                      type="button"
                      className={`btn !min-h-[44px] !min-w-0 w-full !px-2 sm:!px-4 text-xs sm:text-sm ${
                        halfDeck ? 'btn-active' : ''
                      }`}
                      aria-pressed={halfDeck}
                      onClick={() => {
                        sfx.pop();
                        setHalfDeck(true);
                      }}
                    >
                      <span className="truncate">{t('Half-Deck Blitz')}</span>
                    </button>
                  </div>

                  {/* Level Selector */}
                  <div className="min-w-0">
                    <div className="mut text-xs font-semibold uppercase tracking-wider mb-1.5">
                      {t('Level')}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
                      {(['b', 's', 'a'] as const).map((lvlKey) => (
                        <button
                          key={lvlKey}
                          type="button"
                          className={`btn !min-h-[42px] !min-w-0 w-full !px-1.5 sm:!px-3 text-[11px] sm:text-sm ${
                            level === lvlKey ? 'btn-active' : ''
                          }`}
                          aria-pressed={level === lvlKey}
                          onClick={() => {
                            sfx.pop();
                            setLevel(lvlKey);
                          }}
                        >
                          <span className="truncate">{t(LEVELS[lvlKey].name)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collapsible Joker & Rest Panel */}
                  <div className="surface-inset rounded-2xl p-3 sm:p-3.5 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <button
                        type="button"
                        className="flex items-center gap-2 min-w-0 text-start flex-1 py-1"
                        aria-expanded={jokersExpanded}
                        onClick={() => {
                          sfx.pop();
                          setJokersExpanded((prev) => !prev);
                        }}
                      >
                        <SuitGlyph suit={4} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-tight truncate">
                            {t('Jokers (2 cards)')}
                          </div>
                          <div className="mut text-[11px] truncate">
                            {getJokerSummary(selectedPreset)}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 mut shrink-0 transition-transform ${
                            jokersExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          className={`btn !min-h-[36px] !min-w-[44px] !px-2.5 text-xs ${
                            jokersActive ? 'btn-active' : ''
                          }`}
                          aria-pressed={jokersActive}
                          onClick={toggleJokers}
                        >
                          {t(jokersActive ? 'On' : 'Off')}
                        </button>
                      </div>
                    </div>

                    {jokersExpanded && jokersActive && (
                      <div
                        className="space-y-3 pt-2.5 border-t min-w-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        {/* Joker 1 */}
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex justify-between items-center text-xs mut">
                            <span>{t('Joker Card 1')}</span>
                          </div>
                          <select
                            aria-label={t('Joker 1 movement')}
                            className="rounded-xl px-3 w-full max-w-full min-w-0 text-sm"
                            style={{
                              backgroundColor: 'var(--surface)',
                              color: 'var(--tx)',
                              minHeight: 40,
                              border: '1px solid var(--border)',
                            }}
                            value={j1Move}
                            onChange={(e) => {
                              const m1 = e.target.value;
                              updateSelectedPreset((prev) => {
                                const currentMovs = prev.jokers || [
                                  prev.joker || 'Burpees',
                                  'Jump Squats',
                                ];
                                return {
                                  ...prev,
                                  jokers: [m1, currentMovs[1]],
                                  joker: m1,
                                };
                              });
                            }}
                          >
                            {
                              <MovementOptions
                                current={j1Move}
                                favoriteMovements={favoriteMovements}
                              />
                            }
                          </select>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 min-w-0">
                            <span className="mut text-xs">{t('Reps')}</span>
                            <Stepper
                              value={j1Reps || 40}
                              min={20}
                              max={50}
                              label="joker 1 reps"
                              onChange={(next) => {
                                updateSelectedPreset((prev) => {
                                  const currentJrs = prev.jrs || [
                                    prev.jr ?? 40,
                                    prev.jr ?? 40,
                                  ];
                                  return {
                                    ...prev,
                                    jrs: [next, currentJrs[1]],
                                    jr: next + currentJrs[1],
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>

                        {/* Joker 2 */}
                        <div
                          className="space-y-1.5 pt-2.5 border-t min-w-0"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="flex justify-between items-center text-xs mut">
                            <span>{t('Joker Card 2')}</span>
                          </div>
                          <select
                            aria-label={t('Joker 2 movement')}
                            className="rounded-xl px-3 w-full max-w-full min-w-0 text-sm"
                            style={{
                              backgroundColor: 'var(--surface)',
                              color: 'var(--tx)',
                              minHeight: 40,
                              border: '1px solid var(--border)',
                            }}
                            value={j2Move}
                            onChange={(e) => {
                              const m2 = e.target.value;
                              updateSelectedPreset((prev) => {
                                const currentMovs = prev.jokers || [
                                  prev.joker || 'Burpees',
                                  'Jump Squats',
                                ];
                                return {
                                  ...prev,
                                  jokers: [currentMovs[0], m2],
                                };
                              });
                            }}
                          >
                            <MovementOptions
                              current={j2Move}
                              favoriteMovements={favoriteMovements}
                            />
                          </select>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 min-w-0">
                            <span className="mut text-xs">{t('Reps')}</span>
                            <Stepper
                              value={j2Reps || 40}
                              min={20}
                              max={50}
                              label="joker 2 reps"
                              onChange={(next) => {
                                updateSelectedPreset((prev) => {
                                  const currentJrs = prev.jrs || [
                                    prev.jr ?? 40,
                                    prev.jr ?? 40,
                                  ];
                                  return {
                                    ...prev,
                                    jrs: [currentJrs[0], next],
                                    jr: currentJrs[0] + next,
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 min-w-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="text-sm font-medium">
                        {t('Rest interval')}
                      </span>
                      <Stepper
                        value={selectedPreset.rest}
                        min={5}
                        max={300}
                        step={5}
                        unit={t('unit-s')}
                        minWidth={38}
                        label="rest seconds"
                        onChange={(next) =>
                          updateSelectedPreset((prev) => ({
                            ...prev,
                            rest: next,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Target RPE Control */}
                  <div className="surface-inset rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs sm:text-sm font-medium">
                        {t('Target RPE')}
                      </span>
                      <button
                        type="button"
                        className={`btn !min-h-[34px] !min-w-[42px] !px-2.5 text-xs ${
                          targetRpe !== null ? 'btn-active' : ''
                        }`}
                        aria-pressed={targetRpe !== null}
                        onClick={() => {
                          sfx.pop();
                          setTargetRpe((prev) => (prev === null ? 7 : null));
                        }}
                      >
                        {t(targetRpe !== null ? 'On' : 'Off')}
                      </button>
                    </div>

                    {targetRpe !== null ? (
                      <Stepper
                        value={targetRpe}
                        min={1}
                        max={10}
                        step={1}
                        unit="/10"
                        minWidth={36}
                        label="target RPE"
                        onChange={setTargetRpe}
                      />
                    ) : (
                      <span className="mut text-xs">{t('Optional pace cue')}</span>
                    )}
                  </div>

                  {/* Quick Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                    <button
                      type="button"
                      className={`btn justify-between !min-h-[42px] !min-w-0 w-full !px-3 text-xs ${
                        warmFirst ? 'btn-active' : ''
                      }`}
                      aria-pressed={warmFirst}
                      onClick={() => {
                        sfx.pop();
                        setWarmFirst((prev) => !prev);
                      }}
                    >
                      <span className="truncate min-w-0 text-start">
                        {t('Warm-up first (2.5 min)')}
                      </span>
                      <span className="mono shrink-0">
                        {t(warmFirst ? 'On' : 'Off')}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`btn justify-between !min-h-[42px] !min-w-0 w-full !px-3 text-xs ${
                        autoRest ? 'btn-active' : ''
                      }`}
                      aria-pressed={autoRest}
                      onClick={() => {
                        sfx.pop();
                        setAutoRest((prev) => !prev);
                      }}
                    >
                      <span className="truncate min-w-0 text-start">
                        {t('Auto rest after each card')}
                      </span>
                      <span className="mono shrink-0">
                        {t(autoRest ? 'On' : 'Off')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Projected Volume + Start Session */}
                <div className="space-y-3 pt-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm px-1">
                    <span className="mut">{t('Projected volume')}</span>
                    <span className="mono font-bold">
                      ~{projectedReps} {t('reps')} ·{' '}
                      {halfDeck ? `26–27 ${t('cards')}` : `52–54 ${t('cards')}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-cta w-full !min-h-[52px] text-base"
                    onClick={handleStartNewSession}
                  >
                    <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('Begin session')}</span>
                  </button>
                </div>
              </section>
            </div>

            {/* Last 5 Achieved Badges */}
            <HomeRecentBadges
              logs={logs}
              presets={presets}
              onOpenAll={() => {
                sfx.pop();
                setActiveTab('badges');
              }}
            />
          </div>
        )}

        {/* TAB 2: PROTOCOLS LIBRARY */}
        {activeTab === 'protocols' && (
          <section className="space-y-4 min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
              <div className="min-w-0 flex-1">
                <h1 className="disp text-2xl sm:text-4xl font-black leading-tight break-words">
                  {t('Choose a protocol')}
                </h1>
              </div>
              <button
                type="button"
                className="btn btn-cta !min-h-[40px] sm:!min-h-[42px] !px-3 sm:!px-4 text-xs sm:text-sm whitespace-nowrap shrink-0"
                onClick={() => {
                  sfx.pop();
                  setCreatingRoutine(true);
                }}
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('+ New routine').replace(/^\+\s*/, '')}</span>
              </button>
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
                  value={protocolQuery}
                  onChange={(e) => setProtocolQuery(e.target.value)}
                  placeholder={t('Search protocols or movements...')}
                  aria-label={t('Search protocols or movements...')}
                  className="w-full rounded-xl ps-9 pe-8 text-sm"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--tx)',
                    minHeight: 42,
                    border: '1px solid var(--border)',
                  }}
                />
                {protocolQuery && (
                  <button
                    type="button"
                    aria-label={t('Clear search')}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1 mut"
                    onClick={() => setProtocolQuery('')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap gap-1.5 w-full sm:flex-1 min-w-0"
                role="group"
                aria-label={t('Filter protocols')}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn !min-h-[36px] !min-w-0 !px-2.5 sm:!px-3 text-xs sm:text-sm whitespace-nowrap ${
                      categoryFilter === cat ? 'btn-active' : ''
                    }`}
                    aria-pressed={categoryFilter === cat}
                    onClick={() => {
                      sfx.pop();
                      setCategoryFilter(cat);
                    }}
                  >
                    {t(cat)}
                  </button>
                ))}
              </div>
            </div>

            {filteredPresets.length === 0 ? (
              <div className="surface-card rounded-3xl p-8 text-center space-y-4">
                {protocolQuery.trim() ? (
                  <>
                    <p className="mut text-sm">
                      {t('No protocols match your search.')}
                    </p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setProtocolQuery('')}
                    >
                      {t('Clear search')}
                    </button>
                  </>
                ) : categoryFilter === 'Favorites' ? (
                  <>
                    <p className="mut text-sm max-w-md mx-auto">
                      {t(
                        'No favorite routines yet. Tap the heart on any protocol to pin it here.'
                      )}
                    </p>
                    <button
                      type="button"
                      className="btn btn-cta"
                      onClick={() => setCategoryFilter('All')}
                    >
                      {t('Browse all protocols')}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mut text-sm max-w-md mx-auto">
                      {t(
                        'No custom routines yet. Tap + New routine to build one from the movement bank.'
                      )}
                    </p>
                    <button
                      type="button"
                      className="btn btn-cta"
                      onClick={() => setCreatingRoutine(true)}
                    >
                      {t('+ New routine')}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 min-w-0 w-full">
                {filteredPresets.map((preset) => {
                  const isSelected = preset.id === selectedPreset.id;
                  return (
                    <article
                      key={preset.id}
                      className="surface-card rounded-2xl p-4 flex flex-col justify-between transition-colors cursor-pointer min-w-0 w-full"
                      style={
                        isSelected
                          ? {
                              borderColor: 'var(--ac)',
                              boxShadow: '0 0 0 1px var(--ac)',
                            }
                          : undefined
                      }
                      onClick={() => {
                        sfx.pop();
                        setPid(preset.id);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-base truncate">
                              {t(preset.name)}
                            </h2>
                            <p className="mut text-xs truncate">
                              {t(preset.tag)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              className="btn btn-ghost !min-h-[40px] !min-w-[40px] !px-0"
                              aria-label={t('Favorite routine')}
                              title={t('Favorite routine')}
                              onClick={(e) => {
                                e.stopPropagation();
                                sfx.pop();
                                setPresets(
                                  presets.map((p) =>
                                    p.id === preset.id
                                      ? { ...p, favorite: !p.favorite }
                                      : p
                                  )
                                );
                              }}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  preset.favorite ? 'red fill-current' : ''
                                }`}
                                aria-hidden="true"
                              />
                            </button>

                            {preset.id.startsWith('c') ? (
                              <button
                                type="button"
                                className="btn btn-ghost !min-h-[40px] !min-w-[40px] !px-0"
                                aria-label={`${t('Edit routine')} ${t(
                                  preset.name
                                )}`}
                                title={t('Edit routine')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sfx.pop();
                                  setEditingPresetId(preset.id);
                                }}
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost !min-h-[40px] !min-w-[40px] !px-0"
                                aria-label={`${t('Clone to custom')} ${t(
                                  preset.name
                                )}`}
                                title={t('Clone to custom')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClonePreset(preset);
                                }}
                              >
                                <Copy className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="mut text-xs mb-3 line-clamp-2 break-words">
                          {t(preset.desc)}
                        </p>

                        <div className="text-xs leading-relaxed mb-3 break-words">
                          {preset.ex.map((move, idx) => (
                            <React.Fragment key={`${preset.id}-${idx}`}>
                              {idx > 0 && <span className="mut"> · </span>}
                              <span className="inline-flex items-center gap-1 max-w-full">
                                <SuitGlyph suit={idx} />
                                <span className="break-words">{t(move)}</span>
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      <div
                        className="pt-2.5 border-t flex items-center justify-between gap-2 min-w-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="mono mut text-[11px] truncate min-w-0 flex-1">
                          {preset.rest}
                          {t('unit-s')} · {getJokerSummary(preset)}
                        </div>
                        <button
                          type="button"
                          className={`btn !min-h-[36px] !min-w-0 !px-2.5 sm:!px-3 text-xs shrink-0 ${
                            isSelected ? 'btn-cta' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            sfx.pop();
                            setPid(preset.id);
                            setActiveTab('train');
                          }}
                        >
                          <span>{t(isSelected ? 'Train now' : 'Select')}</span>
                          <ArrowRight
                            className="w-3.5 h-3.5 flip shrink-0"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: HISTORY & PERSONAL RECORDS */}
        {activeTab === 'history' && (
          <section className="space-y-5 min-w-0 w-full">
            {/* Personal Records */}
            <div className="surface-card rounded-3xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Flame
                  className="w-4 h-4"
                  style={{ color: 'var(--ac)' }}
                  aria-hidden="true"
                />
                <h1 className="text-lg font-bold">{t('Personal records')}</h1>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="surface-inset rounded-2xl p-3 text-center">
                  <div className="mono font-bold text-lg">
                    {records.bestFull !== null
                      ? formatDuration(records.bestFull * 1000)
                      : '—'}
                  </div>
                  <div className="mut text-xs">{t('Best full deck')}</div>
                </div>
                <div className="surface-inset rounded-2xl p-3 text-center">
                  <div className="mono font-bold text-lg">
                    {records.bestBlitz !== null
                      ? formatDuration(records.bestBlitz * 1000)
                      : '—'}
                  </div>
                  <div className="mut text-xs">{t('Best blitz')}</div>
                </div>
                <div className="surface-inset rounded-2xl p-3 text-center">
                  <div className="mono font-bold text-lg">
                    {records.lifetimeReps}
                  </div>
                  <div className="mut text-xs">{t('Lifetime reps')}</div>
                </div>
                <div className="surface-inset rounded-2xl p-3 text-center">
                  <div className="mono font-bold text-lg">
                    {records.sessionsCount}
                  </div>
                  <div className="mut text-xs">{t('Sessions')}</div>
                </div>
                <div className="surface-inset rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
                  <div className="mono font-bold text-lg">
                    {records.streak}
                  </div>
                  <div className="mut text-xs">{t('Day streak')}</div>
                </div>
              </div>
            </div>

            {/* 12-Week Volume & Historical RPE Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch min-w-0">
              <WeeklyVolumeChart
                logs={logs}
                weeklyGoal={weeklyGoal}
                lang={lang}
              />
              <RpeTrendChart logs={logs} lang={lang} />
            </div>

            {/* Log Book */}
            <div className="surface-card rounded-3xl p-4 sm:p-6 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-bold">{t('Log book')}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-active !min-h-[40px] text-xs"
                    disabled={logs.length < 2}
                    onClick={() => {
                      sfx.pop();
                      setShowCompareModal(true);
                    }}
                  >
                    <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('Analyze Performance')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn !min-h-[40px] text-xs"
                    onClick={() => {
                      sfx.pop();
                      setShowExportImport((prev) => !prev);
                      setImportStatus(null);
                    }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('Export / Import')}</span>
                  </button>
                </div>
              </div>

              {showExportImport && (
                <div className="surface-inset rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <span className="mut text-xs">
                      {t('Workout history JSON')} ({logs.length} {t('sessions')})
                    </span>
                    <button
                      type="button"
                      className="btn !min-h-[38px] text-xs"
                      onClick={handleCopyJson}
                    >
                      {copyFeedback ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{t(copyFeedback ? 'Copied' : 'Copy JSON')}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="[{ ... }]"
                    aria-label={t('Workout history JSON')}
                    className="w-full rounded-xl p-3 mono text-xs"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--tx)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="btn !min-h-[38px] text-xs"
                      disabled={!importText.trim()}
                      onClick={handleImportJson}
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t('Import pasted JSON')}</span>
                    </button>
                    {importStatus && (
                      <span
                        role="status"
                        className={`text-xs font-medium ${
                          importStatus.isError ? 'red' : ''
                        }`}
                      >
                        {importStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {logs.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <p className="mut text-sm">
                    {t(
                      'No sessions logged yet. The deck is patient, it will wait.'
                    )}
                  </p>
                  <button
                    type="button"
                    className="btn btn-cta"
                    onClick={() => {
                      sfx.pop();
                      setActiveTab('train');
                    }}
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    <span>{t('Begin session')}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedLogs.map((entry, idx) => {
                    const hasDetails = Boolean(
                      entry.cs && entry.cs.length >= 1
                    );
                    const movs = getPresetMovementNames(
                      entry.preset,
                      presets,
                      entry.moves
                    );
                    const kcal = computeSessionKcal(entry, movs);
                    return (
                      <div
                        key={`${entry.d}-${idx}`}
                        className={`surface-inset rounded-2xl px-4 py-3 flex items-center justify-between gap-3 ${
                          hasDetails ? 'cursor-pointer hover:opacity-90' : ''
                        }`}
                        onClick={
                          hasDetails
                            ? () => {
                                sfx.pop();
                                setInspectedTab('charts');
                                setInspectedLog(entry);
                              }
                            : undefined
                        }
                        role={hasDetails ? 'button' : undefined}
                        tabIndex={hasDetails ? 0 : undefined}
                        onKeyDown={
                          hasDetails
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setInspectedTab('charts');
                                  setInspectedLog(entry);
                                }
                              }
                            : undefined
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">
                            {t(entry.preset)}
                          </div>
                          <div className="mut text-xs truncate">
                            {formatDate(entry.d)} ·{' '}
                            {entry.half ? t('blitz') : t('Full Deck')} ·{' '}
                            {t(LEVELS[entry.lv || 's'].name)}
                            {entry.rpe ? ` · RPE ${entry.rpe}/10` : ''}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="mono font-bold text-sm">
                            {formatDuration(entry.secs * 1000)}
                          </div>
                          <div className="mono mut text-xs flex items-center justify-end gap-1.5">
                            <span>
                              {entry.reps} {t('reps')} · {kcal} kcal
                            </span>
                            {hasDetails && (
                              <BarChart3
                                className="w-3.5 h-3.5 inline"
                                style={{ color: 'var(--ac)' }}
                                aria-label={t('charts')}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {logs.length > 8 && (
                    <button
                      type="button"
                      className="btn w-full text-xs"
                      onClick={() => setShowAllLogs((prev) => !prev)}
                    >
                      {showAllLogs
                        ? t('Show fewer')
                        : `${t('Show all')} (${logs.length} ${t('total')})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
        {/* TAB 4: 101 BADGES & QUESTS */}
        {activeTab === 'badges' && (
          <AchievementsHub logs={logs} presets={presets} />
        )}
      </main>

      {/* Mobile Bottom Tab Navigation Bar (<= 10% viewport height, replaces extra scrolling) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t backdrop-blur-md"
        aria-label={t('Sections')}
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--nav-bg)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center justify-center gap-0.5 px-1 min-w-0 text-[11px] font-semibold transition-colors"
                style={{
                  color: isActive ? 'var(--ac)' : 'var(--mut)',
                }}
                onClick={() => {
                  sfx.pop();
                  setActiveTab(tab.id);
                }}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-full">{t(tab.label)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {editingPreset && (
        <RoutineEditorModal
          preset={editingPreset}
          favoriteMovements={favoriteMovements}
          onToggleFavoriteMovement={toggleFavoriteMovement}
          onClose={() => setEditingPresetId(null)}
          onSave={(patch) => {
            sfx.pop();
            setPresets((prev) =>
              prev.map((item) =>
                item.id === editingPreset.id ? { ...item, ...patch } : item
              )
            );
            setEditingPresetId(null);
          }}
          onReset={() => {
            sfx.pop();
            const original = getDefaultPresetById(editingPreset.id);
            if (original) {
              setPresets((prev) =>
                prev.map((item) =>
                  item.id === editingPreset.id ? original : item
                )
              );
            }
            setEditingPresetId(null);
          }}
          onDelete={() => {
            sfx.pop();
            setPresets((prev) => {
              const next = prev.filter((item) => item.id !== editingPreset.id);
              if (pid === editingPreset.id && next[0]) {
                setPid(next[0].id);
              }
              return next;
            });
            setEditingPresetId(null);
          }}
        />
      )}

      {creatingRoutine && (
        <RoutineEditorModal
          preset={templateCustomPreset}
          isNew
          favoriteMovements={favoriteMovements}
          onToggleFavoriteMovement={toggleFavoriteMovement}
          onClose={() => setCreatingRoutine(false)}
          onReset={() => setCreatingRoutine(false)}
          onDelete={() => setCreatingRoutine(false)}
          onSave={(patch) => {
            sfx.pop();
            const chosenCat = patch.cat || 'Custom';
            const newRoutine: Preset = {
              ...templateCustomPreset,
              ...patch,
              id: `c${Date.now()}`,
              cat: chosenCat,
              tag:
                patch.tag ||
                (chosenCat === 'Custom' ? 'Custom routine' : chosenCat),
            };
            setPresets((prev) => [...prev, newRoutine]);
            setPid(newRoutine.id);
            setCategoryFilter(newRoutine.cat);
            setCreatingRoutine(false);
          }}
        />
      )}

      {showFormGuide && (
        <FormGuideModal
          preset={selectedPreset}
          onClose={() => setShowFormGuide(false)}
        />
      )}

      {showTour && <TourModal onClose={() => setShowTour(false)} />}

      {showThemeSettings && (
        <ThemeSettingsModal
          themeMode={themeMode}
          resolvedTheme={resolvedTheme}
          accent={accent}
          onChangeThemeMode={setThemeMode}
          onChangeAccent={setAccent}
          onReset={() => {
            setThemeMode(DEFAULT_THEME_MODE);
            setAccent(DEFAULT_ACCENT_ID);
          }}
          onClose={() => setShowThemeSettings(false)}
        />
      )}

      {showCompareModal && (
        <PerformanceCompareModal
          logs={logs}
          lang={lang}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {inspectedLog && (
        <Modal
          label={t('Session analysis')}
          widthClass="max-w-2xl"
          onClose={() => setInspectedLog(null)}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">
                {t(inspectedLog.preset)}
              </h2>
              <div className="mut text-xs">
                {formatDate(inspectedLog.d)} ·{' '}
                {inspectedLog.half ? t('Half-Deck Blitz') : t('Full Deck')} ·{' '}
                {t(LEVELS[inspectedLog.lv || 's'].name)}
                {inspectedLog.rpe ? ` · RPE ${inspectedLog.rpe}/10` : ''}
              </div>
            </div>
            <button
              type="button"
              className="btn !min-h-[40px] shrink-0"
              onClick={() => setInspectedLog(null)}
            >
              {t('Close')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
            <div className="surface-inset rounded-2xl p-2.5">
              <div className="mono text-lg font-bold">
                {formatDuration(inspectedLog.secs * 1000)}
              </div>
              <div className="mut text-[11px]">{t('time')}</div>
            </div>
            <div className="surface-inset rounded-2xl p-2.5">
              <div className="mono text-lg font-bold">{inspectedLog.reps}</div>
              <div className="mut text-[11px]">{t('reps')}</div>
            </div>
            <div className="surface-inset rounded-2xl p-2.5">
              <div className="mono text-lg font-bold">
                {Math.round(
                  inspectedLog.reps / Math.max(inspectedLog.secs / 60, 1 / 60)
                )}
              </div>
              <div className="mut text-[11px]">{t('reps/min')}</div>
            </div>
            <div className="surface-inset rounded-2xl p-2.5">
              <div
                className="mono text-lg font-bold"
                style={{ color: 'var(--ac)' }}
              >
                {inspectedKcal}
              </div>
              <div className="mut text-[11px]">{t('≈ kcal')}</div>
            </div>
          </div>

          {inspectedLog.cs && inspectedLog.cs.length > 0 && (
            <>
              <div
                className="grid grid-cols-2 gap-1.5 p-1 surface-inset rounded-2xl mb-4"
                role="tablist"
                aria-label={t('Session analysis')}
              >
                {(
                  [
                    { id: 'charts', label: 'Charts' },
                    { id: 'movements', label: 'Movements' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={inspectedTab === tab.id}
                    className={`btn !min-h-[38px] !min-w-0 !px-2 !rounded-xl text-xs ${
                      inspectedTab === tab.id ? 'btn-active' : 'btn-ghost'
                    }`}
                    onClick={() => {
                      sfx.pop();
                      setInspectedTab(tab.id);
                    }}
                  >
                    <span className="truncate">{t(tab.label)}</span>
                  </button>
                ))}
              </div>

              {inspectedTab === 'charts' && (
                <Charts
                  splits={inspectedLog.cs}
                  movementNames={inspectedMovements}
                />
              )}

              {inspectedTab === 'movements' && (
                <MovementBreakdownList
                  splits={inspectedLog.cs}
                  movementNames={inspectedMovements}
                />
              )}
            </>
          )}
        </Modal>
      )}

      <OfflineIndicator />
    </div>
  );
}
