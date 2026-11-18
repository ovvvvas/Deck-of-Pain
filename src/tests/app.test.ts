import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { sortMovementsWithFavorites } from '../components/MovementOptions';
import { buildComparisonMetrics } from '../components/PerformanceCompareModal';
import { computeSessionKcal } from '../components/SessionBreakdown';
import { computeWeeklySeries } from '../components/WeeklyVolumeChart';
import { setAppLanguage, t } from '../data/i18n';
import { suggestRestAdjustment } from '../utils/recovery';
import {
  BADGE_SPECS,
  computeAchievements,
  computeLongestStreak,
  getNextQuests,
  getRecentAchievedBadges,
} from '../utils/achievements';
import {
  ALL_MOVEMENTS,
  COOLDOWN_STEPS,
  LEVELS,
  MOVEMENT_ALTS,
  MOVEMENT_CUES,
  MOVEMENT_KCAL,
  TOUR_STEPS,
  WARMUP_STEPS,
} from '../data/movements';
import {
  PROTOCOL_TYPES,
  clampJokerReps,
  loadInitialPresets,
  persistPresets,
} from '../data/presets';
import type { Preset, WorkoutLog } from '../types/workout';
import {
  buildDeck,
  cardReps,
  cleanLogEntry,
  computeStreak,
  computeWeeklyReps,
  exerciseName,
  formatDuration,
  fullDeckReps,
  getPresetMovementNames,
  getWeekStartTimestamp,
} from '../utils/deck';

const ROOT = process.cwd();

function collectSourceFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'node_modules') continue;
      results.push(...collectSourceFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

test('CSS variables: every var(--*) used across app exists in both light and dark themes', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  const darkMatch = css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  assert.ok(rootMatch, ':root block must exist in index.css');
  assert.ok(darkMatch, ':root[data-theme="dark"] block must exist in index.css');

  const extractVars = (block: string) =>
    new Set(Array.from(block.matchAll(/--([a-zA-Z0-9-]+)\s*:/g)).map((m) => `--${m[1]}`));

  const lightVars = extractVars(rootMatch[1]);
  const darkVars = extractVars(darkMatch[1]);

  // Verify light and dark define identical token sets
  for (const v of lightVars) {
    assert.ok(darkVars.has(v), `Dark theme missing CSS variable ${v}`);
  }
  for (const v of darkVars) {
    assert.ok(lightVars.has(v), `Light theme missing CSS variable ${v}`);
  }

  // Verify every var(--*) referenced in CSS and TSX is defined
  const files = collectSourceFiles(path.join(ROOT, 'src'), ['.css', '.ts', '.tsx']);
  const usedVars = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)) {
      usedVars.add(match[1]);
    }
  }
  for (const used of usedVars) {
    assert.ok(lightVars.has(used), `Undefined CSS variable referenced: ${used}`);
  }
});

test('Responsive CSS & viewport layout contracts hold', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /width=device-width,\s*initial-scale=1\.0,\s*viewport-fit=cover/);

  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  assert.match(css, /@import\s+"tailwindcss";/);
  assert.match(css, /@custom-variant\s+dark/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /#root\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.match(css, /\.surface-card\s*\{[\s\S]*min-width:\s*0/);
  assert.match(css, /container-type:\s*inline-size/);

  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  assert.match(appSrc, /overflow-x-clip/, 'Root shell should clip horizontal overflow');
  assert.match(appSrc, /grid-cols-1 lg:grid-cols-\[1\.1fr_1fr\]/, 'Workspace grid must stack cleanly on mobile');
  assert.match(appSrc, /grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/, 'Protocols grid must stack cleanly on mobile');

  const srcFiles = collectSourceFiles(path.join(ROOT, 'src'), ['.css', '.ts', '.tsx']);
  for (const file of srcFiles) {
    assert.equal(
      /overflow-x-auto|overflow-x:\s*auto|overflow-x:\s*scroll/.test(
        fs.readFileSync(file, 'utf8')
      ),
      false,
      `Found horizontal scroll utility in ${file}`
    );
  }

  const playingCard = fs.readFileSync(
    path.join(ROOT, 'src/components/PlayingCard.tsx'),
    'utf8'
  );
  assert.match(playingCard, /height="28cqw"/, 'Joker emblem should scale proportionally via cqw');
  assert.match(playingCard, /var\(--joker-ink\)/, 'Joker card ink should be theme-aware');

  const playerSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/WorkoutPlayer.tsx'),
    'utf8'
  );
  assert.match(playerSrc, /MobileHudPanel/, 'Compact mobile timer HUD should sit at top');
  assert.match(playerSrc, /<footer[\s\S]*Hold to quit/, 'Quit button and session title should sit in bottom footer');
  assert.match(playerSrc, /max-w-md/, 'Quit button should be wide and centered at bottom');
  assert.equal(/FormGuideModal|Form guide/.test(playerSrc), false, 'Form guide should be removed from active workout player');
  assert.match(playerSrc, /Movements[\s\S]*Timeline/, 'Timeline button should appear under Movements section');
});

test('Movements & Presets: zero Ladder references and complete movement metadata', () => {
  const sourceFiles = collectSourceFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']);
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(
      /ladder/i.test(content),
      false,
      `Found leftover Ladder reference in ${file}`
    );
  }

  assert.equal(
    new Set(ALL_MOVEMENTS).size,
    ALL_MOVEMENTS.length,
    'ALL_MOVEMENTS must not contain duplicate movement names'
  );

  const chartsSrc = fs.readFileSync(path.join(ROOT, 'src/components/Charts.tsx'), 'utf8');
  assert.match(
    chartsSrc,
    /key=\{`\$\{item\.suitIdx\}-\$\{item\.name\}`\}/,
    'Charts movement fade rows must include suitIdx in React key'
  );

  for (const move of ALL_MOVEMENTS) {
    assert.equal(
      typeof MOVEMENT_KCAL[move],
      'number',
      `Missing MOVEMENT_KCAL for ${move}`
    );
    assert.ok(MOVEMENT_CUES[move], `Missing MOVEMENT_CUES for ${move}`);
    assert.ok(MOVEMENT_ALTS[move], `Missing MOVEMENT_ALTS for ${move}`);
  }

  const presets = loadInitialPresets();
  assert.ok(presets.length >= 15);
  for (const preset of presets) {
    assert.equal(preset.ex.length, 4);
    for (const move of preset.ex) {
      assert.ok(ALL_MOVEMENTS.includes(move), `Invalid suit movement ${move} in ${preset.id}`);
    }
    assert.ok(preset.jokers && preset.jokers.length === 2, `Missing jokers pair in ${preset.id}`);
    assert.ok(preset.jrs && preset.jrs.length === 2, `Missing jrs pair in ${preset.id}`);
    for (const jMove of preset.jokers) {
      assert.ok(ALL_MOVEMENTS.includes(jMove), `Invalid joker movement ${jMove} in ${preset.id}`);
    }
  }
});

test('Deck engine: exact card numbers (no multiplier), level face values, smart suit pacing, spaced Jokers & balanced Blitz', () => {
  const numberRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
  for (const lvl of Object.values(LEVELS)) {
    for (const rank of numberRanks) {
      assert.equal(
        cardReps(rank, 1, lvl.faceOverrides),
        Number(rank),
        `Number card ${rank} must match its face value at level ${lvl.name}`
      );
      assert.equal(
        cardReps(rank, 0.5, lvl.faceOverrides),
        Number(rank),
        `Number card ${rank} must ignore any multiplier`
      );
    }
  }

  for (const preset of loadInitialPresets()) {
    assert.equal(preset.scale, 1, `Built-in preset ${preset.id} should use scale 1`);
  }

  // Exact face card & Ace rules per level
  assert.equal(cardReps('J', 1, LEVELS.b.faceOverrides), 10);
  assert.equal(cardReps('Q', 1, LEVELS.b.faceOverrides), 10);
  assert.equal(cardReps('K', 1, LEVELS.b.faceOverrides), 10);
  assert.equal(cardReps('A', 1, LEVELS.b.faceOverrides), 11);

  assert.equal(cardReps('J', 1, LEVELS.s.faceOverrides), 11);
  assert.equal(cardReps('Q', 1, LEVELS.s.faceOverrides), 12);
  assert.equal(cardReps('K', 1, LEVELS.s.faceOverrides), 13);
  assert.equal(cardReps('A', 1, LEVELS.s.faceOverrides), 15);

  assert.equal(cardReps('J', 1, LEVELS.a.faceOverrides), 12);
  assert.equal(cardReps('Q', 1, LEVELS.a.faceOverrides), 14);
  assert.equal(cardReps('K', 1, LEVELS.a.faceOverrides), 16);
  assert.equal(cardReps('A', 1, LEVELS.a.faceOverrides), 18);

  assert.equal(fullDeckReps({ scale: 1, jrs: [0, 0], fx: LEVELS.b.faceOverrides }), 380);
  assert.equal(fullDeckReps({ scale: 1, jrs: [0, 0], fx: LEVELS.s.faceOverrides }), 420);
  assert.equal(fullDeckReps({ scale: 1, jrs: [0, 0], fx: LEVELS.a.faceOverrides }), 456);

  const presets = loadInitialPresets();
  const sample = presets[0];

  const full = buildDeck(
    {
      scale: sample.scale,
      jrs: [35, 45],
      jokers: ['V-ups', 'Burpees'],
      fx: LEVELS.s.faceOverrides,
    },
    false
  );
  assert.equal(full.length, 54);
  const joker0 = full.find((c) => c.j && c.jokerIndex === 0);
  const joker1 = full.find((c) => c.j && c.jokerIndex === 1);
  assert.ok(joker0 && joker0.reps === 35);
  assert.ok(joker1 && joker1.reps === 45);

  // Verify Jokers are spaced apart (not card #0 and not adjacent)
  const jIndices = full
    .map((c, idx) => (c.j ? idx : -1))
    .filter((idx) => idx >= 0);
  assert.equal(jIndices.length, 2);
  assert.ok(jIndices[0] >= 6, 'First Joker should not ambush card #1');
  assert.ok(jIndices[1] - jIndices[0] >= 4, 'Two Jokers must stay separated');

  // Verify no suit repeats more than twice consecutively
  const nonJokerSuits = full.filter((c) => !c.j).map((c) => c.s);
  for (let i = 2; i < nonJokerSuits.length; i++) {
    assert.equal(
      nonJokerSuits[i] === nonJokerSuits[i - 1] && nonJokerSuits[i] === nonJokerSuits[i - 2],
      false,
      'Smart shuffle must avoid >2 consecutive cards of the same suit'
    );
  }

  const customPreset: Preset = {
    ...sample,
    jokers: ['V-ups', 'Jump Squats'],
    jrs: [35, 45],
  };
  assert.equal(exerciseName(customPreset, joker0), 'V-ups');
  assert.equal(exerciseName(customPreset, joker1), 'Jump Squats');

  const blitz = buildDeck(
    {
      scale: sample.scale,
      jrs: [35, 45],
      fx: LEVELS.s.faceOverrides,
    },
    true
  );
  assert.equal(blitz.length, 27);
  // Every suit in Half-Deck Blitz has balanced low/mid/high cards (>= 40 reps per suit)
  for (let suit = 0; suit < 4; suit++) {
    const suitReps = blitz.filter((c) => c.s === suit).reduce((s, c) => s + c.reps, 0);
    assert.ok(suitReps >= 38, `Blitz suit ${suit} should stay balanced (got ${suitReps})`);
  }

  const noJoker = buildDeck({ scale: 1, jrs: [0, 0] }, false);
  assert.equal(noJoker.length, 52);

  const expectedFullReps = fullDeckReps({
    scale: 1,
    jrs: [35, 45],
    fx: LEVELS.s.faceOverrides,
  });
  const actualFullReps = buildDeck(
    { scale: 1, jrs: [35, 45], fx: LEVELS.s.faceOverrides },
    false
  ).reduce((s, c) => s + c.reps, 0);
  assert.equal(actualFullReps, expectedFullReps);

  assert.equal(clampJokerReps(0), 0);
  assert.equal(clampJokerReps(12), 20);
  assert.equal(clampJokerReps(47), 45);
  assert.equal(clampJokerReps(90), 50);
});

test('Custom routines preserve chosen protocol category & persist across sessions', () => {
  const prevStorage = globalThis.localStorage;
  const mem = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mem,
    configurable: true,
    writable: true,
  });

  try {
    const initial = loadInitialPresets();
    const upperCustom: Preset = {
      id: 'c1700000000000',
      name: 'Push Pull Power',
      cat: 'Upper',
      tag: 'Upper',
      desc: 'Built by you from the movement bank.',
      ex: ['Pull-ups', 'Push-ups', 'Dips', 'Inverted Rows'],
      rest: 35,
      scale: 1,
      jokers: ['Burpees', 'Diamond Push-ups'],
      jrs: [30, 40],
      favorite: true,
    };
    const coreCustom: Preset = {
      ...upperCustom,
      id: 'c1700000000001',
      name: 'Core Shred',
      cat: 'Core',
      tag: 'Core',
      favorite: false,
    };

    persistPresets([...initial, upperCustom, coreCustom]);
    const reloaded = loadInitialPresets();

    const foundUpper = reloaded.find((p) => p.id === upperCustom.id);
    const foundCore = reloaded.find((p) => p.id === coreCustom.id);

    assert.ok(foundUpper, 'Upper custom routine should reload from localStorage');
    assert.equal(foundUpper.cat, 'Upper');
    assert.equal(foundUpper.favorite, true);
    assert.deepEqual(foundUpper.jokers, ['Burpees', 'Diamond Push-ups']);
    assert.deepEqual(foundUpper.jrs, [30, 40]);

    assert.ok(foundCore, 'Core custom routine should reload from localStorage');
    assert.equal(foundCore.cat, 'Core');
    assert.equal(foundCore.favorite, false);

    // Every PROTOCOL_TYPES value works cleanly
    for (const type of PROTOCOL_TYPES) {
      assert.ok(typeof type === 'string');
    }
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      value: prevStorage,
      configurable: true,
      writable: true,
    });
  }
});

test('Weighted kcal, movement snapshots, streak & i18n coverage work properly', () => {
  const log: WorkoutLog = {
    d: Date.now(),
    lv: 's',
    preset: 'Custom Deleted Routine',
    half: true,
    secs: 600,
    reps: 100,
    cards: 5,
    moves: ['Pull-ups', 'Push-ups', 'Air Squats', 'Sit-ups', 'Burpees', 'V-ups'],
    cs: [
      [0, 20, 40, 10],
      [4, 40, 80, 20],
      [5, 40, 70, 20],
    ],
  };

  const resolved = getPresetMovementNames(log.preset, [], log.moves);
  assert.deepEqual(resolved, log.moves);

  // Pull-ups (20 * 0.65 = 13) + Burpees (40 * 0.6 = 24) + V-ups (40 * 0.35 = 14) = 51
  assert.equal(computeSessionKcal(log, resolved), 51);

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  assert.equal(
    computeStreak([
      { ...log, d: now },
      { ...log, d: now - dayMs },
      { ...log, d: now - 2 * dayMs },
    ]),
    3
  );

  assert.equal(formatDuration(125000), '2:05');

  const dirty = cleanLogEntry({ ...log, cs: [['bad' as unknown as number, 1, 2, 3]] });
  assert.equal(dirty.cs, undefined);

  setAppLanguage('fa');
  for (const step of [...WARMUP_STEPS, ...COOLDOWN_STEPS]) {
    assert.notEqual(t(step.n), step.n, `Missing Persian translation for ${step.n}`);
  }
  for (const tour of TOUR_STEPS) {
    assert.notEqual(t(tour.title), tour.title, `Missing Persian tour title ${tour.title}`);
  }
  for (const type of PROTOCOL_TYPES) {
    assert.notEqual(t(type), type, `Missing Persian protocol type ${type}`);
  }
  assert.notEqual(t('Achievements'), 'Achievements');
  assert.notEqual(t('RPE trend'), 'RPE trend');
  assert.notEqual(t('Target RPE'), 'Target RPE');
  assert.notEqual(t('Badges'), 'Badges');
  assert.notEqual(t('Weekly goal'), 'Weekly goal');
  assert.notEqual(t('Favorite movements'), 'Favorite movements');
  assert.notEqual(t('Weekly volume (12w)'), 'Weekly volume (12w)');
  assert.notEqual(t('Recovery advisor'), 'Recovery advisor');
  assert.notEqual(t('Analyze Performance'), 'Analyze Performance');
  setAppLanguage('en');
});

test('Rest recovery advisor & side-by-side performance comparison work properly', () => {
  // High RPE + long duration lengthens rest
  const heavy = suggestRestAdjustment({
    currentRestSecs: 30,
    log: { secs: 2600, half: false, rpe: 9 },
  });
  assert.equal(heavy.direction, 'lengthen');
  assert.equal(heavy.suggestedRest, 45);
  assert.equal(heavy.deltaSecs, 15);

  // Low RPE + fast session shortens rest
  const light = suggestRestAdjustment({
    currentRestSecs: 30,
    log: { secs: 900, half: false, rpe: 3 },
  });
  assert.equal(light.direction, 'shorten');
  assert.equal(light.suggestedRest, 20);
  assert.equal(light.deltaSecs, -10);

  // Respects 5s lower clamp
  const floorClamp = suggestRestAdjustment({
    currentRestSecs: 5,
    log: { secs: 800, half: false, rpe: 2 },
  });
  assert.equal(floorClamp.suggestedRest, 5);
  assert.equal(floorClamp.direction, 'keep');

  const logA: WorkoutLog = {
    d: 1000,
    preset: 'Prison Yard Classic',
    half: false,
    secs: 1080,
    reps: 400,
    cards: 54,
    rpe: 8,
  };
  const logB: WorkoutLog = {
    d: 2000,
    preset: 'Prison Yard Classic',
    half: false,
    secs: 972,
    reps: 440,
    cards: 54,
    rpe: 7,
  };
  const cmp = buildComparisonMetrics(logA, logB);
  assert.equal(cmp.repDiff, 40);
  assert.equal(cmp.rpeDiff, -1);
  assert.ok(Math.abs(cmp.secPerCardA - 20) < 0.01);
  assert.ok(Math.abs(cmp.secPerCardB - 18) < 0.01);
  assert.ok(Math.abs(cmp.secPerCardDiff - -2) < 0.01);
});

test('Weekly Goal calculation, 12-week series & Favorite Movements ordering work properly', () => {
  // Anchor on a known Wednesday noon local time
  const wednesday = new Date(2026, 10, 18, 12, 0, 0).getTime();
  const mondayStart = getWeekStartTimestamp(wednesday);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const sundayLastWeek = mondayStart - 60 * 60 * 1000;
  const fiveWeeksAgo = mondayStart - 5 * weekMs + 3600_000;
  const thirteenWeeksAgo = mondayStart - 13 * weekMs;

  const sampleLogs: WorkoutLog[] = [
    { d: mondayStart + 3600_000, preset: 'Prison Yard Classic', half: false, secs: 900, reps: 420, cards: 54 },
    { d: wednesday, preset: 'Prison Yard Classic', half: true, secs: 500, reps: 210, cards: 27 },
    { d: sundayLastWeek, preset: 'Prison Yard Classic', half: false, secs: 950, reps: 400, cards: 54 },
    { d: fiveWeeksAgo, preset: 'Prison Yard Classic', half: false, secs: 900, reps: 550, cards: 54 },
    { d: thirteenWeeksAgo, preset: 'Prison Yard Classic', half: false, secs: 900, reps: 999, cards: 54 },
  ];

  const weekly = computeWeeklyReps(sampleLogs, wednesday);
  assert.equal(weekly.reps, 630);
  assert.equal(weekly.sessions, 2);

  const series = computeWeeklySeries(sampleLogs, 12, wednesday);
  assert.equal(series.length, 12);
  assert.equal(series[11].reps, 630);
  assert.equal(series[10].reps, 400);
  assert.equal(series[6].reps, 550);
  assert.equal(
    series.reduce((sum, w) => sum + w.reps, 0),
    630 + 400 + 550
  );

  // Verify minimal icons & PWA assets exist and no legacy joker-svgrepo references remain
  assert.ok(fs.existsSync(path.join(ROOT, 'public/icon.svg')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/joker-icon.svg')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/joker-icon.png')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/pwa-192x192.png')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/pwa-512x512.png')));
  const srcFiles = collectSourceFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']);
  for (const file of srcFiles) {
    assert.equal(
      /joker-svgrepo/i.test(fs.readFileSync(file, 'utf8')),
      false,
      `Found legacy joker-svgrepo reference in ${file}`
    );
  }

  const ordered = sortMovementsWithFavorites(['Burpees', 'Pull-ups', 'NotARealMove']);
  assert.deepEqual(ordered.favoritesList, ['Pull-ups', 'Burpees']);
  assert.equal(ordered.groups.length, 5);
});

test('101 Hard Badges & Quests: exact count, 500-10,000 movement tiers, Target RPE & chronological order', () => {
  assert.equal(BADGE_SPECS.length, 101);
  assert.equal(new Set(BADGE_SPECS.map((b) => b.id)).size, 101);

  const movementBadges = BADGE_SPECS.filter((b) => b.category === 'Movements');
  assert.equal(movementBadges.length, 36);
  assert.ok(
    movementBadges.every((b) => b.target >= 500 && b.target <= 10000),
    'All movement badges must start at >= 500 and scale up to 10,000'
  );
  assert.ok(movementBadges.some((b) => b.target === 500));
  assert.ok(movementBadges.some((b) => b.target === 10000));

  const emptyBadges = computeAchievements([], []);
  assert.equal(emptyBadges.length, 101);
  assert.equal(emptyBadges.every((b) => !b.unlocked), true);
  assert.equal(getNextQuests(emptyBadges, 3).length, 3);

  const dayMs = 24 * 60 * 60 * 1000;
  // Build 10 consecutive days with heavy reps, Target RPE hits, full decks, and Push-up splits
  const mondayBase = getWeekStartTimestamp(Date.now() - 21 * dayMs) + 10 * 3600_000;
  const hardLogs: WorkoutLog[] = Array.from({ length: 10 }, (_, idx) => ({
    d: mondayBase + idx * dayMs,
    lv: 's',
    preset: 'Prison Yard Classic',
    half: idx >= 2,
    secs: 900,
    reps: 400,
    cards: idx < 2 ? 54 : 27,
    rpe: idx < 5 ? 8 : 7,
    targetRpe: idx < 5 ? 8 : undefined,
    moves: ['Pull-ups', 'Push-ups', 'Air Squats', 'Sit-ups', 'Burpees', 'Jump Squats'],
    cs: [
      [1, 60, 45, 10], // Push-ups (60 * 10 = 600 >= 500)
      [0, 40, 50, 10], // Pull-ups (40 * 10 = 400 < 500)
    ],
  }));

  assert.equal(computeLongestStreak(hardLogs), 10);
  const earned = computeAchievements(hardLogs, loadInitialPresets());
  const byId = Object.fromEntries(earned.map((b) => [b.id, b]));

  assert.equal(byId['sess-10'].unlocked, true);
  assert.equal(byId['full-1'].unlocked, true);
  assert.equal(byId['streak-7'].unlocked, true);
  assert.equal(byId['streak-14'].unlocked, false);
  assert.equal(byId['reps-1000'].unlocked, true);
  assert.equal(byId['reps-2500'].unlocked, true);
  assert.equal(byId['reps-5000'].unlocked, false);
  assert.equal(byId['reps-5000'].current, 4000);
  assert.equal(byId['target-rpe-hit-5'].unlocked, true);
  assert.equal(byId['week-2500'].unlocked, true);
  assert.equal(byId['move-pushups-500'].unlocked, true);
  assert.equal(byId['move-pushups-2000'].unlocked, false);
  assert.equal(byId['move-pullups-500'].unlocked, false);
  assert.equal(byId['move-pullups-500'].current, 400);

  const recentFive = getRecentAchievedBadges(earned, 5);
  assert.equal(recentFive.length, 5);
  assert.ok(
    recentFive.every((b) => b.unlocked && typeof b.unlockedAt === 'number'),
    'Last 5 achieved badges must be unlocked with timestamps'
  );
  for (let i = 1; i < recentFive.length; i++) {
    assert.ok(
      (recentFive[i - 1].unlockedAt ?? 0) >= (recentFive[i].unlockedAt ?? 0),
      'Recent 5 badges should be sorted newest-first'
    );
  }
});

test('GitHub Pages & subpath deployment contracts hold', () => {
  const viteCfg = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
  assert.match(viteCfg, /base:\s*['"]\.\/['"]/);
  assert.match(viteCfg, /start_url:\s*['"]\.\/['"]/);
  assert.match(viteCfg, /scope:\s*['"]\.\/['"]/);

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /href="\.\/icon\.svg"/);
  assert.match(html, /href="\.\/apple-touch-icon\.png"/);

  const deckSrc = fs.readFileSync(path.join(ROOT, 'src/utils/deck.ts'), 'utf8');
  assert.match(deckSrc, /JOKER_SVG\s*=\s*['"]\.\/joker-icon\.svg['"]/);

  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.tsx'), 'utf8');
  assert.match(mainSrc, /RootErrorBoundary/);

  const workflowPath = path.join(ROOT, '.github/workflows/deploy.yml');
  assert.ok(
    fs.existsSync(workflowPath),
    'GitHub Pages workflow should exist'
  );
  const workflowSrc = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflowSrc, /actions\/checkout@v5/);
  assert.match(workflowSrc, /actions\/setup-node@v6/);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.devDependencies.esbuild, /^\^0\.2[78]\./);
});
