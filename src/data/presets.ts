import type { Preset } from '../types/workout';

export const PROTOCOL_TYPES = [
  'Full body',
  'Upper',
  'Lower',
  'Core',
  'Conditioning',
  'Custom',
] as const;

const DEFAULT_PRESET_DATA: Preset[] = [
  {
    id: 'p',
    name: 'Prison Yard Classic',
    cat: 'Full body',
    tag: 'Full body, calisthenics',
    desc: 'Bodyweight, no mercy. The original yard deck.',
    ex: ['Pull-ups', 'Push-ups', 'Air Squats', 'Sit-ups'],
    rest: 30,
    scale: 1,
    jokers: ['Burpees', 'Jump Squats'],
    jrs: [40, 40],
  },
  {
    id: 'i',
    name: 'Iron Core Crucible',
    cat: 'Core',
    tag: 'Midline, anti-extension',
    desc: 'Your trunk, tested from every angle.',
    ex: ['Hanging Leg Raises', 'Hollow Rocks', 'Russian Twists', 'Plank Shoulder Taps'],
    rest: 30,
    scale: 1,
    jokers: ['V-ups', 'Bicycle Crunches'],
    jrs: [30, 30],
  },
  {
    id: 'l',
    name: 'Leg Day Torment',
    cat: 'Lower',
    tag: 'Lower body, unilateral',
    desc: 'Stairs will be a negotiation tomorrow.',
    ex: ['Bulgarian Split Squats', 'Jump Squats', 'Walking Lunges', 'Calf Raises'],
    rest: 40,
    scale: 1,
    jokers: ['Reverse Lunges', 'Squat Thrusts'],
    jrs: [40, 40],
  },
  {
    id: 'u',
    name: 'Upper Body Forge',
    cat: 'Upper',
    tag: 'Upper body, push and pull',
    desc: 'Push, pull, repeat until the shirt fits differently.',
    ex: ['Pull-ups', 'Dips', 'Pike Push-ups', 'Inverted Rows'],
    rest: 30,
    scale: 1,
    jokers: ['Diamond Push-ups', 'Chin-ups'],
    jrs: [40, 40],
  },
  {
    id: 'm',
    name: 'Metcon Speed Blitz',
    cat: 'Conditioning',
    tag: 'Conditioning, speed',
    desc: 'Short rests, shorter reps, faster heart.',
    ex: ['Burpees', 'Mountain Climbers', 'Air Squats', 'Jumping Jacks'],
    rest: 15,
    scale: 1,
    jokers: ['Jump Squats', 'Burpees'],
    jrs: [30, 30],
  },
  {
    id: 'pu',
    name: 'Pull Day Grind',
    cat: 'Upper',
    tag: 'Back and biceps, pulling',
    desc: 'Everything that pulls. A bar is required.',
    ex: ['Pull-ups', 'Chin-ups', 'Inverted Rows', 'Superman Raises'],
    rest: 40,
    scale: 1,
    jokers: ['Hanging Leg Raises', 'Chin-ups'],
    jrs: [30, 30],
  },
  {
    id: 'ps',
    name: 'Push Day Fury',
    cat: 'Upper',
    tag: 'Chest, shoulders, triceps',
    desc: 'Pressing from every angle until the arms quit.',
    ex: ['Push-ups', 'Diamond Push-ups', 'Pike Push-ups', 'Dips'],
    rest: 30,
    scale: 1,
    jokers: ['Decline Push-ups', 'Dips'],
    jrs: [30, 30],
  },
  {
    id: 'gh',
    name: 'Glute & Ham Burn',
    cat: 'Lower',
    tag: 'Posterior chain, low impact',
    desc: 'Hips, glutes and hamstrings with no jumping.',
    ex: ['Reverse Lunges', 'Glute Bridges', 'Step-ups', 'Cossack Squats'],
    rest: 40,
    scale: 1,
    jokers: ['Glute Bridges', 'Reverse Lunges'],
    jrs: [30, 30],
  },
  {
    id: 'hi',
    name: 'Cardio Inferno',
    cat: 'Conditioning',
    tag: 'HIIT, heart rate',
    desc: 'Short reps, short rests, high heart rate.',
    ex: ['High Knees', 'Squat Thrusts', 'Skater Jumps', 'Mountain Climbers'],
    rest: 15,
    scale: 1,
    jokers: ['Jump Squats', 'Mountain Climbers'],
    jrs: [30, 30],
  },
  {
    id: 'st',
    name: 'Foundation Starter',
    cat: 'Full body',
    tag: 'Beginner, low volume',
    desc: 'Half the reps and longer rests while you learn the deck.',
    ex: ['Air Squats', 'Push-ups', 'Glute Bridges', 'Sit-ups'],
    rest: 45,
    scale: 1,
    jokers: ['Air Squats', 'Push-ups'],
    jrs: [20, 20],
  },
  {
    id: 'hy',
    name: 'Hybrid Gauntlet',
    cat: 'Full body',
    tag: 'Advanced, strength-endurance',
    desc: 'Heavy volume across pull, push, legs and core.',
    ex: ['Pull-ups', 'Dips', 'Bulgarian Split Squats', 'V-ups'],
    rest: 30,
    scale: 1,
    jokers: ['Burpees', 'Jump Squats'],
    jrs: [50, 50],
  },
  {
    id: 'so',
    name: 'Special Ops Endurance',
    cat: 'Conditioning',
    tag: 'Elite, tactical conditioning',
    desc: 'Extreme stamina testing across multi-plane movements.',
    ex: ['Burpees', 'Pull-ups', 'Air Squats', 'Push-ups'],
    rest: 20,
    scale: 1,
    jokers: ['Jump Squats', 'Burpees'],
    jrs: [50, 50],
  },
  {
    id: 'tt',
    name: 'Tactical Tabata Blitz',
    cat: 'Conditioning',
    tag: 'High intensity, speed',
    desc: 'Lightning fast deck designed for explosive power and grit.',
    ex: ['Mountain Climbers', 'High Knees', 'Squat Thrusts', 'Jump Squats'],
    rest: 10,
    scale: 1,
    jokers: ['Jump Squats', 'Jump Squats'],
    jrs: [40, 40],
  },
  {
    id: 'bc',
    name: 'Bodyweight Commando',
    cat: 'Upper',
    tag: 'Upper body, tactical power',
    desc: 'Unrelenting upper body pressing and pulling volume.',
    ex: ['Chin-ups', 'Decline Push-ups', 'Dips', 'Inverted Rows'],
    rest: 30,
    scale: 1,
    jokers: ['Pull-ups', 'Dips'],
    jrs: [40, 40],
  },
  {
    id: 'ap',
    name: 'Alpha Power Protocol',
    cat: 'Full body',
    tag: 'Full body strength',
    desc: 'Maximum load calisthenics for supreme physical conditioning.',
    ex: ['Pull-ups', 'Bulgarian Split Squats', 'Diamond Push-ups', 'Hanging Leg Raises'],
    rest: 35,
    scale: 1,
    jokers: ['Burpees', 'V-ups'],
    jrs: [45, 45],
  },
];

export const clampJokerReps = (reps: number): number =>
  reps <= 0 ? 0 : Math.min(50, Math.max(20, Math.round(reps / 5) * 5));

export function getDefaultPresetById(id: string): Preset | undefined {
  const found = DEFAULT_PRESET_DATA.find((p) => p.id === id);
  return found ? { ...found, ex: [...found.ex] as Preset['ex'] } : undefined;
}

export function loadInitialPresets(): Preset[] {
  const presets: Preset[] = DEFAULT_PRESET_DATA.map((p) => ({
    ...p,
    ex: [...p.ex] as Preset['ex'],
    jokers: p.jokers ? [...p.jokers] as [string, string] : undefined,
    jrs: p.jrs ? [...p.jrs] as [number, number] : undefined,
  }));

  try {
    const favs = JSON.parse(localStorage.getItem('dop-favs') || '[]');
    if (Array.isArray(favs)) {
      presets.forEach((p) => {
        if (favs.includes(p.id)) {
          p.favorite = true;
        }
      });
    }
  } catch {
    // Ignore
  }

  try {
    const overrides = JSON.parse(localStorage.getItem('dop-ov') || '{}');
    if (overrides && typeof overrides === 'object') {
      presets.forEach((preset) => {
        const ov = overrides[preset.id];
        if (
          ov &&
          Array.isArray(ov.ex) &&
          ov.ex.length === 4 &&
          ov.ex.every((x: unknown) => typeof x === 'string') &&
          typeof ov.rest === 'number' &&
          typeof ov.scale === 'number'
        ) {
          preset.ex = ov.ex as Preset['ex'];
          preset.rest = ov.rest;
          preset.scale = 1;
          preset.joker = typeof ov.joker === 'string' ? ov.joker : undefined;
          if (Array.isArray(ov.jokers) && ov.jokers.length === 2) {
            preset.jokers = ov.jokers as [string, string];
          }
          if (Array.isArray(ov.jrs) && ov.jrs.length === 2) {
            preset.jrs = [clampJokerReps(ov.jrs[0]), clampJokerReps(ov.jrs[1])];
          }
          if (typeof ov.jr === 'number') {
            preset.jr = clampJokerReps(ov.jr);
          }
        }
      });
    }
  } catch {
    // Ignore
  }

  try {
    const customList = JSON.parse(localStorage.getItem('dop-custom') || '[]');
    if (Array.isArray(customList)) {
      customList.forEach((item) => {
        if (
          item &&
          typeof item.id === 'string' &&
          item.id.startsWith('c') &&
          typeof item.name === 'string' &&
          Array.isArray(item.ex) &&
          item.ex.length === 4 &&
          item.ex.every((x: unknown) => typeof x === 'string') &&
          typeof item.rest === 'number' &&
          typeof item.scale === 'number' &&
          !presets.some((p) => p.id === item.id)
        ) {
          const validCat =
            typeof item.cat === 'string' &&
            (PROTOCOL_TYPES as readonly string[]).includes(item.cat)
              ? item.cat
              : 'Custom';
          presets.push({
            id: item.id,
            name: item.name,
            cat: validCat,
            tag:
              typeof item.tag === 'string' && item.tag.trim()
                ? item.tag
                : validCat === 'Custom'
                ? 'Custom routine'
                : validCat,
            desc:
              typeof item.desc === 'string'
                ? item.desc
                : 'Built by you from the movement bank.',
            ex: item.ex as Preset['ex'],
            rest: item.rest,
            scale: 1,
            joker: typeof item.joker === 'string' ? item.joker : undefined,
            jr: typeof item.jr === 'number' ? clampJokerReps(item.jr) : 50,
            jokers: Array.isArray(item.jokers) ? item.jokers : undefined,
            jrs: Array.isArray(item.jrs) ? item.jrs : undefined,
            favorite: Boolean(item.favorite),
          });
        }
      });
    }
  } catch {
    // Ignore
  }

  return presets;
}

export function persistPresets(presets: Preset[]): void {
  try {
    const overrides: Record<string, unknown> = {};
    const customList: Preset[] = [];
    const favs: string[] = [];

    presets.forEach((p) => {
      if (p.favorite) {
        favs.push(p.id);
      }
      if (p.id.startsWith('c')) {
        customList.push(p);
      } else {
        overrides[p.id] = {
          ex: p.ex,
          rest: p.rest,
          scale: p.scale,
          joker: p.joker,
          jr: p.jr,
          jokers: p.jokers,
          jrs: p.jrs,
        };
      }
    });

    localStorage.setItem('dop-favs', JSON.stringify(favs));
    localStorage.setItem('dop-ov', JSON.stringify(overrides));
    localStorage.setItem('dop-custom', JSON.stringify(customList));
  } catch {
    // Ignore
  }
}
