import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { t } from '../data/i18n';
import { LEVELS, MOVEMENT_KCAL } from '../data/movements';
import type {
  Card,
  CardSplit,
  LevelKey,
  Preset,
  SavedSession,
  WorkoutLog,
} from '../types/workout';
import {
  buildDeck,
  exerciseName,
  formatDuration,
  isRedSuit,
  totalDeckReps,
} from '../utils/deck';
import { sfx } from '../utils/sound';
import { clearSavedSession, persistSavedSession } from '../utils/storage';
import { Charts } from './Charts';
import { Modal } from './Modal';
import { CardFace } from './PlayingCard';
import { RestModal } from './RestModal';
import { SuitGlyph } from './SuitIcon';

interface SessionClockDisplayProps {
  startEpochRef: React.MutableRefObject<number>;
  cardStartEpochRef: React.MutableRefObject<number>;
  pausedAt: number | null;
  repsDone: number;
  totalReps: number;
  cardsRemaining: number;
  totalCards: number;
  cardIndex: number;
  estimatedKcal: number;
  targetRpe?: number;
  deck: Card[];
}

function useClockEpoch(pausedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (pausedAt !== null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [pausedAt]);

  return pausedAt ?? now;
}

/**
 * Compact single-screen mobile timer & progress HUD so card + clocks + Done button
 * stay visible together without vertical scrolling.
 */
const MobileHudPanel: React.FC<SessionClockDisplayProps> = ({
  startEpochRef,
  cardStartEpochRef,
  pausedAt,
  repsDone,
  totalReps,
  cardsRemaining,
  cardIndex,
  targetRpe,
  deck,
}) => {
  const effectiveNow = useClockEpoch(pausedAt);
  const elapsedMs = Math.max(0, effectiveNow - startEpochRef.current);
  const cardMs = Math.max(0, effectiveNow - cardStartEpochRef.current);
  const pct = Math.round((repsDone / Math.max(1, totalReps)) * 100);

  return (
    <div className="lg:hidden surface-card rounded-2xl px-3.5 py-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div>
            <div className="mut text-[10px] font-semibold uppercase tracking-wider leading-none">
              {t('Total time')}
            </div>
            <div className="mono font-bold text-xl sm:text-2xl leading-tight mt-0.5">
              {formatDuration(elapsedMs)}
            </div>
          </div>
          <div>
            <div className="mut text-[10px] font-semibold uppercase tracking-wider leading-none">
              {t('Card split')}
            </div>
            <div
              className="mono font-bold text-xl sm:text-2xl leading-tight mt-0.5"
              style={{ color: 'var(--ac)' }}
            >
              {formatDuration(cardMs)}
            </div>
          </div>
        </div>

        <div className="text-end shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            {targetRpe ? (
              <span
                className="mono text-[10px] font-bold px-1.5 py-0.5 rounded-md surface-inset"
                style={{ color: targetRpe >= 8 ? 'var(--red)' : 'var(--ac)' }}
              >
                RPE {targetRpe}/10
              </span>
            ) : null}
            <span className="mono font-bold text-sm">{pct}%</span>
          </div>
          <div className="mut mono text-[11px] leading-tight mt-0.5">
            {cardsRemaining} {t('cards left')}
          </div>
        </div>
      </div>

      <div
        className="progress-track mt-2"
        style={{ height: 7 }}
        role="progressbar"
        aria-label={t('Workout progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <i
          className="progress-fill"
          style={{ width: `${(repsDone / Math.max(1, totalReps)) * 100}%` }}
        />
      </div>

      <div className="flex gap-[2px] mt-1.5" aria-hidden="true">
        {deck.map((_, idx) => (
          <span
            key={idx}
            className="flex-1 rounded-sm"
            style={{
              height: 4,
              backgroundColor:
                idx < cardIndex
                  ? 'var(--ac)'
                  : idx === cardIndex
                  ? 'var(--tx)'
                  : 'var(--border)',
              opacity: idx <= cardIndex ? 1 : 0.65,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Secondary mobile stats row placed below the primary card & buttons so reps/min,
 * kcal, and total rep counter stay accessible without pushing the card off-screen.
 */
const MobileSecondaryStats: React.FC<
  Pick<
    SessionClockDisplayProps,
    'startEpochRef' | 'pausedAt' | 'repsDone' | 'totalReps' | 'estimatedKcal'
  >
> = ({ startEpochRef, pausedAt, repsDone, totalReps, estimatedKcal }) => {
  const effectiveNow = useClockEpoch(pausedAt);
  const elapsedMs = Math.max(0, effectiveNow - startEpochRef.current);
  const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60);
  const repsPerMin = Math.round(repsDone / elapsedMinutes);

  return (
    <div className="lg:hidden grid grid-cols-3 gap-2 text-center">
      <div className="surface-card rounded-2xl p-2.5">
        <div className="mono text-base font-bold">
          {repsDone}/{totalReps}
        </div>
        <div className="mut text-[11px]">{t('reps')}</div>
      </div>
      <div className="surface-card rounded-2xl p-2.5">
        <div className="mono text-base font-bold">{repsPerMin}</div>
        <div className="mut text-[11px]">{t('reps/min')}</div>
      </div>
      <div className="surface-card rounded-2xl p-2.5">
        <div className="mono text-base font-bold">{estimatedKcal}</div>
        <div className="mut text-[11px]">{t('≈ kcal')}</div>
      </div>
    </div>
  );
};

/**
 * Full desktop clock & metrics panel.
 */
const SessionMetricsPanel: React.FC<SessionClockDisplayProps> = ({
  startEpochRef,
  cardStartEpochRef,
  pausedAt,
  repsDone,
  totalReps,
  cardsRemaining,
  cardIndex,
  estimatedKcal,
  targetRpe,
  deck,
}) => {
  const effectiveNow = useClockEpoch(pausedAt);
  const elapsedMs = Math.max(0, effectiveNow - startEpochRef.current);
  const cardMs = Math.max(0, effectiveNow - cardStartEpochRef.current);
  const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60);
  const repsPerMin = Math.round(repsDone / elapsedMinutes);

  return (
    <div className="hidden lg:block surface-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div>
            <div className="mut text-sm">{t('Total time')}</div>
            <div
              className="mono font-bold leading-none mt-1"
              style={{ fontSize: 'clamp(2rem, 3.6vw, 3.4rem)' }}
            >
              {formatDuration(elapsedMs)}
            </div>
          </div>
          <div>
            <div className="mut text-sm">{t('Card split')}</div>
            <div
              className="mono font-bold leading-none mt-1"
              style={{ fontSize: 'clamp(2rem, 3.6vw, 3.4rem)', color: 'var(--ac)' }}
            >
              {formatDuration(cardMs)}
            </div>
          </div>
        </div>

        {targetRpe ? (
          <div className="surface-inset rounded-xl px-3 py-1.5 text-end shrink-0">
            <div className="mut text-[10px] leading-none">{t('Target RPE')}</div>
            <div
              className="mono font-bold text-sm leading-tight mt-0.5"
              style={{ color: targetRpe >= 8 ? 'var(--red)' : 'var(--ac)' }}
            >
              {targetRpe}/10
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between items-baseline mb-2">
        <strong className="text-lg">{t('Workout progress')}</strong>
        <span className="mono">
          <strong className="text-2xl">
            {Math.round((repsDone / Math.max(1, totalReps)) * 100)}%
          </strong>{' '}
          <span className="mut text-sm">
            {repsDone}/{totalReps} {t('reps')}
          </span>
        </span>
      </div>

      <div
        className="progress-track mb-3"
        style={{ height: 14 }}
        role="progressbar"
        aria-label={t('Workout progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((repsDone / Math.max(1, totalReps)) * 100)}
      >
        <i
          className="progress-fill"
          style={{ width: `${(repsDone / Math.max(1, totalReps)) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <div className="surface-inset rounded-2xl p-3">
          <div className="mono text-2xl font-bold">{cardsRemaining}</div>
          <div className="mut text-sm">{t('cards left')}</div>
        </div>
        <div className="surface-inset rounded-2xl p-3">
          <div className="mono text-2xl font-bold">{repsPerMin}</div>
          <div className="mut text-sm">{t('reps/min')}</div>
        </div>
        <div className="surface-inset rounded-2xl p-3">
          <div className="mono text-2xl font-bold">{estimatedKcal}</div>
          <div className="mut text-sm">{t('≈ kcal')}</div>
        </div>
      </div>

      <div className="flex gap-[2px] mt-4" aria-hidden="true">
        {deck.map((_, idx) => (
          <span
            key={idx}
            className="flex-1 rounded-sm"
            style={{
              height: 7,
              backgroundColor:
                idx < cardIndex
                  ? 'var(--ac)'
                  : idx === cardIndex
                  ? 'var(--tx)'
                  : 'var(--border)',
              opacity: idx <= cardIndex ? 1 : 0.65,
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface WorkoutPlayerProps {
  preset: Preset;
  halfDeck: boolean;
  resumeSession: SavedSession | null;
  autoRest: boolean;
  onAutoRestChange: (next: boolean) => void;
  level: LevelKey;
  targetRpe?: number | null;
  onExit: () => void;
  onCompleteWorkout: (log: WorkoutLog) => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  preset,
  halfDeck,
  resumeSession,
  autoRest,
  onAutoRestChange,
  level,
  targetRpe = null,
  onExit,
  onCompleteWorkout,
}) => {
  const effectiveTargetRpe = resumeSession?.targetRpe ?? targetRpe ?? undefined;
  const levelConfig = LEVELS[level];
  const [deck] = useState<Card[]>(() =>
    resumeSession
      ? resumeSession.deck
      : buildDeck(
          {
            scale: 1,
            jr: preset.jr,
            jrs: preset.jrs,
            jokers: preset.jokers,
            fx: levelConfig.faceOverrides,
          },
          halfDeck
        )
  );

  const [cardIndex, setCardIndex] = useState<number>(
    resumeSession ? resumeSession.idx : 0
  );
  const [splits, setSplits] = useState<number[]>(
    resumeSession ? resumeSession.splits : []
  );
  const [restSplits, setRestSplits] = useState<number[]>(
    resumeSession?.rs || []
  );
  const [pausedAt, setPausedAt] = useState<number | null>(
    resumeSession?.pz ? Date.now() : null
  );
  const [isHoldingQuit, setIsHoldingQuit] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [tossedCard, setTossedCard] = useState<{
    card: Card;
    key: number;
  } | null>(null);
  const [showRest, setShowRest] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [dealAnimKey, setDealAnimKey] = useState(0);

  const startEpochRef = useRef<number>(
    Date.now() - (resumeSession ? resumeSession.el : 0)
  );
  const cardStartEpochRef = useRef<number>(
    Date.now() - (resumeSession?.cur || 0)
  );
  const cardHistoryEpochsRef = useRef<number[]>([]);
  const pendingRestMsRef = useRef<number>(0);
  const restStartEpochRef = useRef<number>(0);

  const holdTimerRef = useRef<number>(0);
  const pausedByQuitModalRef = useRef<boolean>(false);
  const cardElRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const saveProgress = useCallback(() => {
    const now = pausedAt ?? Date.now();
    persistSavedSession({
      lv: level,
      pid: preset.id,
      half: halfDeck,
      deck,
      idx: cardIndex,
      splits,
      rs: restSplits,
      el: now - startEpochRef.current,
      cur: now - cardStartEpochRef.current,
      pz: pausedAt !== null,
      targetRpe: effectiveTargetRpe,
    });
  }, [
    cardIndex,
    deck,
    effectiveTargetRpe,
    halfDeck,
    level,
    pausedAt,
    preset.id,
    restSplits,
    splits,
  ]);

  useEffect(() => {
    saveProgress();
  }, [saveProgress]);

  useEffect(() => {
    const handlePageHide = () => saveProgress();
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [saveProgress]);

  // Screen Wake Lock during active workout
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let unmounted = false;

    const requestLock = () => {
      try {
        navigator.wakeLock
          ?.request('screen')
          .then((lock) => {
            if (unmounted) {
              lock.release().catch(() => {});
            } else {
              sentinel = lock;
            }
          })
          .catch(() => {});
      } catch {
        // Wake Lock unsupported
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unmounted = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, []);

  const currentCard = deck[cardIndex];
  const repsDone = useMemo(
    () => deck.slice(0, cardIndex).reduce((sum, c) => sum + c.reps, 0),
    [deck, cardIndex]
  );
  const totalReps = useMemo(() => totalDeckReps(deck), [deck]);

  const completeCard = useCallback(() => {
    if (!currentCard || pausedAt !== null) return;
    const now = Date.now();
    sfx.pop();
    sfx.whoosh();

    const cardWorkMs = Math.max(
      0,
      now - cardStartEpochRef.current - pendingRestMsRef.current
    );
    const cardRestMs = pendingRestMsRef.current;

    const nextSplits = [...splits, cardWorkMs];
    const nextRestSplits = [...restSplits, cardRestMs];

    pendingRestMsRef.current = 0;
    cardHistoryEpochsRef.current.push(cardStartEpochRef.current);
    cardStartEpochRef.current = now;

    try {
      navigator.vibrate?.(15);
    } catch {
      // Vibration unsupported
    }

    if (cardIndex + 1 >= deck.length) {
      clearSavedSession();
      sfx.fanfare();

      const j1Name = preset.jokers?.[0] || preset.joker || 'Burpees';
      const j2Name = preset.jokers?.[1] || preset.jokers?.[0] || preset.joker || 'Jump Squats';
      const snapshotMoves = [...preset.ex, j1Name, j2Name];

      const completedSplits: CardSplit[] = deck.map((card, idx) => [
        card.j ? (card.jokerIndex === 1 ? 5 : 4) : card.s,
        card.reps,
        Math.round((nextSplits[idx] ?? cardWorkMs) / 100) / 10,
        Math.round((nextRestSplits[idx] ?? cardRestMs) / 100) / 10,
      ]);

      const completedKcal = Math.round(
        completedSplits.reduce((sum, s) => {
          const moveName = snapshotMoves[s[0]] || 'Movement';
          return sum + s[1] * (MOVEMENT_KCAL[moveName] ?? 0.45);
        }, 0)
      );

      onCompleteWorkout({
        d: now,
        lv: level,
        preset: preset.name,
        half: halfDeck,
        secs: Math.round((now - startEpochRef.current) / 1000),
        reps: totalReps,
        cards: deck.length,
        targetRpe: effectiveTargetRpe,
        cs: completedSplits,
        moves: snapshotMoves,
        kcal: completedKcal,
      });
      return;
    }

    setSplits(nextSplits);
    setRestSplits(nextRestSplits);
    setTossedCard({ card: currentCard, key: dealAnimKey });
    window.setTimeout(() => setTossedCard(null), 450);

    setCardIndex((prev) => prev + 1);
    setDealAnimKey((prev) => prev + 1);

    if (autoRest) {
      restStartEpochRef.current = Date.now();
      setShowRest(true);
    }
  }, [
    autoRest,
    cardIndex,
    currentCard,
    dealAnimKey,
    deck,
    effectiveTargetRpe,
    halfDeck,
    level,
    onCompleteWorkout,
    pausedAt,
    preset.name,
    restSplits,
    splits,
    totalReps,
  ]);

  const undoLastCard = useCallback(() => {
    if (cardIndex === 0 || pausedAt !== null) return;
    sfx.pop();
    setCardIndex((prev) => prev - 1);
    setSplits((prev) => prev.slice(0, -1));
    pendingRestMsRef.current = restSplits[restSplits.length - 1] ?? 0;
    setRestSplits((prev) => prev.slice(0, -1));
    setDealAnimKey((prev) => prev + 1);
    cardStartEpochRef.current =
      cardHistoryEpochsRef.current.pop() ?? cardStartEpochRef.current;
  }, [cardIndex, pausedAt, restSplits]);

  const togglePause = useCallback(() => {
    sfx.pop();
    if (pausedAt !== null) {
      const pausedDuration = Date.now() - pausedAt;
      startEpochRef.current += pausedDuration;
      cardStartEpochRef.current += pausedDuration;
      cardHistoryEpochsRef.current = cardHistoryEpochsRef.current.map(
        (epoch) => epoch + pausedDuration
      );
      setPausedAt(null);
    } else {
      setPausedAt(Date.now());
    }
  }, [pausedAt]);

  const actionRef = useRef({
    complete: completeCard,
    undo: undoLastCard,
    modalOpen: showRest || showTimeline || showQuitConfirm,
    quitDialogOpen: showQuitConfirm,
  });
  actionRef.current = {
    complete: completeCard,
    undo: undoLastCard,
    modalOpen: showRest || showTimeline || showQuitConfirm,
    quitDialogOpen: showQuitConfirm,
  };

  useEffect(() => {
    const isFormTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
        target.isContentEditable);

    const isHoldButton = (target: EventTarget | null) =>
      target instanceof HTMLElement && !!target.closest('[data-hold]');

    const onKeyDown = (e: KeyboardEvent) => {
      const state = actionRef.current;
      if (e.key === 'Escape') {
        if (!state.quitDialogOpen) setShowTimeline(false);
        return;
      }
      if (
        state.modalOpen ||
        isFormTarget(e.target) ||
        isHoldButton(e.target) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) state.complete();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (!e.repeat) state.undo();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === ' ' &&
        !actionRef.current.modalOpen &&
        !isFormTarget(e.target) &&
        !isHoldButton(e.target)
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const startHoldQuit = () => {
    if (holdTimerRef.current || showQuitConfirm) return;
    setIsHoldingQuit(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = 0;
      setIsHoldingQuit(false);
      try {
        navigator.vibrate?.(30);
      } catch {
        // Ignore
      }
      if (pausedAt === null) {
        pausedByQuitModalRef.current = true;
        setPausedAt(Date.now());
      }
      setShowQuitConfirm(true);
    }, 1000);
  };

  const cancelHoldQuit = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
    setIsHoldingQuit(false);
  };

  const handleContinueAfterQuitPrompt = () => {
    sfx.pop();
    setShowQuitConfirm(false);
    if (pausedByQuitModalRef.current) {
      pausedByQuitModalRef.current = false;
      togglePause();
    }
  };

  const handleConfirmQuit = () => {
    clearSavedSession();
    onExit();
  };

  const jokerNames = useMemo(() => {
    const j1 = preset.jokers?.[0] || preset.joker || 'Burpees';
    const j2 = preset.jokers?.[1] || preset.jokers?.[0] || preset.joker || 'Jump Squats';
    return [j1, j2];
  }, [preset]);

  const movementBreakdown = useMemo(() => {
    const items = preset.ex.map((move, suitIdx) => ({
      name: move,
      suitIdx,
      target: deck
        .filter((c) => c.s === suitIdx)
        .reduce((sum, c) => sum + c.reps, 0),
      done: deck
        .slice(0, cardIndex)
        .filter((c) => c.s === suitIdx)
        .reduce((sum, c) => sum + c.reps, 0),
    }));

    const j0Cards = deck.filter((c) => c.j && (c.jokerIndex === 0 || c.jokerIndex == null));
    const j1Cards = deck.filter((c) => c.j && c.jokerIndex === 1);

    if (j0Cards.length > 0) {
      items.push({
        name: jokerNames[0],
        suitIdx: 4,
        target: j0Cards.reduce((sum, c) => sum + c.reps, 0),
        done: deck.slice(0, cardIndex).filter((c) => c.j && (c.jokerIndex === 0 || c.jokerIndex == null)).reduce((sum, c) => sum + c.reps, 0),
      });
    }
    if (j1Cards.length > 0) {
      items.push({
        name: jokerNames[1],
        suitIdx: 4,
        target: j1Cards.reduce((sum, c) => sum + c.reps, 0),
        done: deck.slice(0, cardIndex).filter((c) => c.j && c.jokerIndex === 1).reduce((sum, c) => sum + c.reps, 0),
      });
    }
    return items;
  }, [deck, cardIndex, preset, jokerNames]);

  const estimatedKcal = useMemo(
    () =>
      Math.round(
        movementBreakdown.reduce(
          (sum, item) => sum + item.done * (MOVEMENT_KCAL[item.name] ?? 0.45),
          0
        )
      ),
    [movementBreakdown]
  );

  const chartSplits = useMemo<CardSplit[]>(
    () =>
      deck.slice(0, splits.length).map((card, idx) => [
        card.j ? (card.jokerIndex === 1 ? 5 : 4) : card.s,
        card.reps,
        splits[idx] / 1000,
        (restSplits[idx] || 0) / 1000,
      ]),
    [deck, splits, restSplits]
  );

  const chartNames = useMemo(
    () => [...preset.ex, jokerNames[0], jokerNames[1]],
    [preset, jokerNames]
  );

  const resetCardDrag = () => {
    isDraggingRef.current = false;
    const el = cardElRef.current;
    if (el) {
      el.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = '';
      el.style.willChange = 'auto';
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3 pt-2.5 pb-8 sm:p-5 md:p-8 lg:p-10 min-w-0 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-2.5 sm:gap-5 lg:gap-8 min-w-0">
        {/* Timer & Progress HUD: ultra-compact at top on mobile, full card in right column on desktop */}
        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 min-w-0">
          <MobileHudPanel
            startEpochRef={startEpochRef}
            cardStartEpochRef={cardStartEpochRef}
            pausedAt={pausedAt}
            repsDone={repsDone}
            totalReps={totalReps}
            cardsRemaining={deck.length - cardIndex}
            totalCards={deck.length}
            cardIndex={cardIndex}
            estimatedKcal={estimatedKcal}
            targetRpe={effectiveTargetRpe}
            deck={deck}
          />
          <SessionMetricsPanel
            startEpochRef={startEpochRef}
            cardStartEpochRef={cardStartEpochRef}
            pausedAt={pausedAt}
            repsDone={repsDone}
            totalReps={totalReps}
            cardsRemaining={deck.length - cardIndex}
            totalCards={deck.length}
            cardIndex={cardIndex}
            estimatedKcal={estimatedKcal}
            targetRpe={effectiveTargetRpe}
            deck={deck}
          />
        </div>

        {/* Active Card Stage + Primary Action Controls */}
        <section
          className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 surface-inset rounded-3xl p-3 sm:p-5 md:p-7 lg:p-9 flex flex-col items-center min-w-0 w-full"
          style={{ perspective: 1200 }}
        >
          <div className="card-stage" dir="ltr">
            {Array.from({ length: Math.min(4, deck.length - cardIndex - 1) }).map(
              (_, idx) => (
                <div
                  key={idx}
                  className="absolute inset-0"
                  style={{
                    borderRadius: '6.5cqw',
                    transform: `translate(${(idx + 1) * 1.5}cqw, ${
                      (idx + 1) * 1.5
                    }cqw)`,
                    zIndex: -idx - 1,
                    background:
                      'repeating-linear-gradient(45deg, var(--card-back), var(--card-back) 8px, var(--card-stripe) 8px, var(--card-stripe) 16px)',
                    border: '1px solid var(--border)',
                  }}
                />
              )
            )}

            {tossedCard && (
              <div
                key={`toss-${tossedCard.key}`}
                className={`card-toss card-face card-front${
                  tossedCard.card.j ? ' is-joker' : ''
                }`}
                style={{ zIndex: 5 }}
              >
                <CardFace
                  card={tossedCard.card}
                  moveName={exerciseName(preset, tossedCard.card)}
                />
              </div>
            )}

            {currentCard && (
              <div
                key={dealAnimKey}
                ref={cardElRef}
                className="card-deal absolute inset-0 select-none cursor-pointer active:scale-[0.98] transition-transform"
                role="button"
                tabIndex={0}
                aria-label={`Double tap to complete ${currentCard.reps} ${exerciseName(
                  preset,
                  currentCard
                )}`}
                onClick={completeCard}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    completeCard();
                  }
                }}
              >
                <div
                  className={`card-face card-front${
                    currentCard.j ? ' is-joker' : ''
                  }`}
                >
                  <CardFace
                    card={currentCard}
                    moveName={exerciseName(preset, currentCard)}
                  />
                </div>
                <div className="card-face card-back">♠</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full max-w-sm min-w-0">
            <button
              type="button"
              className="btn btn-cta col-span-3 !min-h-[50px] sm:!min-h-[56px] text-base w-full"
              onClick={completeCard}
            >
              {t('Done, next card')}
            </button>
            <button
              type="button"
              className="btn !min-w-0 !px-2 text-xs sm:text-sm w-full"
              onClick={undoLastCard}
              disabled={cardIndex === 0}
              aria-label={t('Undo last card')}
            >
              {t('Undo')}
            </button>
            <button
              type="button"
              className="btn !min-w-0 !px-2 text-xs sm:text-sm w-full"
              onClick={togglePause}
            >
              {t(pausedAt !== null ? 'Resume' : 'Pause')}
            </button>
            <button
              type="button"
              className="btn !min-w-0 !px-2 text-xs sm:text-sm w-full"
              onClick={() => {
                sfx.pop();
                restStartEpochRef.current = Date.now();
                setShowRest(true);
              }}
            >
              {t('Rest')}
            </button>
            <button
              type="button"
              className={`btn col-span-3 !min-h-[40px] !min-w-0 w-full !px-3 text-xs sm:text-sm ${autoRest ? 'btn-active' : ''}`}
              aria-pressed={autoRest}
              onClick={() => {
                sfx.pop();
                onAutoRestChange(!autoRest);
              }}
            >
              <span className="truncate">
                {t('Auto rest after each card')}: {t(autoRest ? 'On' : 'Off')}
              </span>
            </button>
          </div>

          <p className="mut text-xs sm:text-sm mt-3 text-center hidden sm:block">
            {t('Tap the card or press Done. Space also works, Backspace undoes.')}
          </p>
        </section>

        {/* Secondary stats (mobile) + Movements breakdown */}
        <section className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 space-y-3 min-w-0">
          <MobileSecondaryStats
            startEpochRef={startEpochRef}
            pausedAt={pausedAt}
            repsDone={repsDone}
            totalReps={totalReps}
            estimatedKcal={estimatedKcal}
          />

          <div className="surface-card rounded-3xl p-4 sm:p-5">
            <div className="mut text-xs font-semibold uppercase tracking-wider mb-3">
              {t('Movements')}
            </div>
            {movementBreakdown.map((item, idx) => (
              <div key={`${item.suitIdx}-${idx}`} className="mb-3 last:mb-0">
                <div className="flex justify-between mb-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <SuitGlyph suit={item.suitIdx} />
                    <span>{t(item.name)}</span>
                  </span>
                  <span className="mono mut">
                    {item.done}/{item.target}
                  </span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <i
                    className="progress-fill"
                    style={{
                      width: `${
                        item.target ? (item.done / item.target) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn w-full !min-h-[44px] text-sm"
            onClick={() => setShowTimeline(true)}
          >
            {t('Timeline')}
          </button>
        </section>
      </div>

      {/* Bottom Session Info & Centered Long Quit Button */}
      <footer
        className="mt-6 pt-5 border-t flex flex-col items-center text-center gap-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="min-w-0 max-w-full px-2">
          <div className="font-bold truncate text-sm sm:text-base">{t(preset.name)}</div>
          <div className="mut text-xs sm:text-sm truncate">
            {t(halfDeck ? 'Half-Deck Blitz' : 'Full Deck')}
            {effectiveTargetRpe ? ` · ${t('Target RPE')} ${effectiveTargetRpe}/10` : ''}
          </div>
        </div>

        <button
          type="button"
          data-hold="1"
          className="btn relative overflow-hidden w-full max-w-md !min-h-[48px] !px-6 text-sm font-semibold"
          aria-label={t('Quit workout: hold for 1.0 second')}
          title={t('Hold 1.0 second to quit')}
          onPointerDown={startHoldQuit}
          onPointerUp={cancelHoldQuit}
          onPointerLeave={cancelHoldQuit}
          onPointerCancel={cancelHoldQuit}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault();
              startHoldQuit();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              cancelHoldQuit();
            }
          }}
        >
          {isHoldingQuit && (
            <span
              className="absolute inset-0"
              style={{
                backgroundColor: 'var(--ac)',
                opacity: 0.3,
                transformOrigin: 'left',
                animation: 'holdfill 1.0s linear forwards',
              }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            <span className="flip">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </span>
            <span>{t('Hold to quit')}</span>
          </span>
        </button>
      </footer>

      {showRest && (
        <RestModal
          initialSeconds={preset.rest}
          onClose={() => {
            if (restStartEpochRef.current) {
              pendingRestMsRef.current +=
                Date.now() - restStartEpochRef.current;
            }
            restStartEpochRef.current = 0;
            setShowRest(false);
          }}
        />
      )}

      {showQuitConfirm && (
        <Modal
          label={t('Quit workout?')}
          isAlert
          dismissOnBackdrop={false}
          backdropOpacity={0.55}
          widthClass="max-w-sm"
          contentClass="text-center p-6 sm:p-7"
          onClose={handleContinueAfterQuitPrompt}
        >
          <h2 className="text-xl font-bold mb-2">{t('Leave this workout?')}</h2>
          <p className="mut text-sm mb-6">
            {t('Your progress will be lost. The clock is paused until you decide.')}
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              className="btn btn-cta !min-h-[52px]"
              autoFocus
              onClick={handleContinueAfterQuitPrompt}
            >
              {t('Continue workout')}
            </button>
            <button type="button" className="btn" onClick={handleConfirmQuit}>
              {t('Quit workout')}
            </button>
          </div>
        </Modal>
      )}

      {showTimeline && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(10, 12, 18, 0.45)' }}
          onClick={() => setShowTimeline(false)}
        >
          <aside
            className="w-full max-w-sm h-full overflow-y-auto p-6"
            style={{ backgroundColor: 'var(--bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <strong className="text-base">{t('Drawn cards')}</strong>
              <button
                type="button"
                className="btn"
                onClick={() => setShowTimeline(false)}
              >
                {t('Close')}
              </button>
            </div>

            <Charts splits={chartSplits} movementNames={chartNames} />

            {splits.length === 0 && (
              <p className="mut text-sm">
                {t('Nothing drawn yet. Complete a card and it shows up here with its split.')}
              </p>
            )}

            {splits.map((splitMs, idx) => {
              const card = deck[idx];
              if (!card) return null;
              const secs = splitMs / 1000;
              return (
                <div
                  key={idx}
                  className="surface-inset rounded-2xl px-4 py-3 mb-2.5 flex justify-between items-center gap-2 text-sm"
                >
                  <span className="truncate">
                    <strong className={isRedSuit(card.s) ? 'red' : ''}>
                      {card.j ? '' : card.r}
                      <SuitGlyph suit={card.s} />
                    </strong>{' '}
                    {card.reps} {exerciseName(preset, card)}
                  </span>
                  <span className="mono mut text-xs shrink-0">
                    {secs.toFixed(1)}s · {(secs / card.reps).toFixed(1)}
                    {t('s/rep')}
                    {restSplits[idx] > 1000
                      ? ` · ${t('rest')} ${Math.round(restSplits[idx] / 1000)}s`
                      : ''}
                  </span>
                </div>
              );
            })}
          </aside>
        </div>
      )}
    </div>
  );
};
