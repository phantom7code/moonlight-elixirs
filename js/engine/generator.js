/**
 * Moonlight Elixirs — Deterministic Seeded Level Generator & Verified Shuffle
 * Guarantees 100% solvable puzzles across Levels 1–500+, Zen Mode, and Daily Elixir.
 */

import { HANDCRAFTED_LEVELS, POTION_COLORS, getChapterForLevel, getTwistById } from './levels.js';
import { cloneState, isBottleComplete, isBottleEmpty, isBottleLocked, isLevelWon } from './rules.js';
import { solveState } from './solver.js';

const BLEND_RECIPES = [
  { colors: ['ruby', 'sapphire'], result: 'amethyst' },
  { colors: ['sapphire', 'gold'], result: 'emerald' },
  { colors: ['ruby', 'amber'], result: 'coral' },
  { colors: ['sapphire', 'emerald'], result: 'teal' },
  { colors: ['ruby', 'amethyst'], result: 'plum' },
  { colors: ['emerald', 'gold'], result: 'mint' },
];

/** Fast deterministic PRNG (Mulberry32) */
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DEBUT_LEVEL_SPECS = {
  21: { introTwistId: 'mystery-mist', colorCount: 6, mysteryBottles: 2 },
  36: { introTwistId: 'reverse-mist', colorCount: 6, reverseMistBottles: 2 },
  51: { introTwistId: 'ribboned-flask', colorCount: 7, lockedBottles: 1 },
  65: { introTwistId: 'corked-empty', colorCount: 6, corkedEmpty: true },
  80: { introTwistId: 'color-seal', colorCount: 7, colorLockCount: 1 },
  101: { introTwistId: 'frost-runes', colorCount: 7, frostBottles: 1 },
  121: { introTwistId: 'gemstone-crest', colorCount: 7, keyedBottles: 1 },
  125: { introTwistId: 'apothecary-sizes', colorCount: 7, variableCap: true },
  141: { introTwistId: 'tasting-thimbles', colorCount: 6, tastingThimbles: true },
  181: { introTwistId: 'starlight', colorCount: 7, starlight: true },
  221: { introTwistId: 'blending-cauldron', colorCount: 7, blendingCauldron: true },
  251: { introTwistId: 'recipe-flask', colorCount: 6, recipeFlask: true },
  301: { introTwistId: 'grand-vat', colorCount: 8, grandVat: 8 },
};

const CHAPTER_FINALE_SPECS = {
  50: {
    twistBadge: 'Grand Brew · 2 Twists',
    colorCount: 8,
    mysteryBottles: 2,
    reverseMistBottles: 2,
  },
  75: {
    twistBadge: 'Grand Brew · 2 Twists',
    colorCount: 8,
    corkedEmpty: true,
    mysteryBottles: 3,
  },
  100: {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 8,
    colorLockCount: 1,
    corkedEmpty: true,
    reverseMistBottles: 2,
  },
  140: {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 9,
    variableCap: true,
    keyedBottles: 1,
    frostBottles: 1,
  },
  180: {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 8,
    tastingThimbles: true,
    colorLockCount: 1,
    frostBottles: 1,
  },
  250: {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 8,
    blendingCauldron: true,
    colorLockCount: 1,
    mysteryBottles: 3,
  },
  350: {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 9,
    grandVat: 8,
    frostBottles: 1,
    reverseMistBottles: 2,
  },
  500: {
    twistBadge: 'Master Brew · 3 Twists',
    baseCap: 5,
    colorCount: 8,
    grandVat: 10,
    frostBottles: 1,
    reverseMistBottles: 2,
  },
};

const ENDLESS_FINALE_CYCLE = [
  {
    twistBadge: 'Master Brew · 3 Twists',
    baseCap: 5,
    colorCount: 8,
    grandVat: 10,
    colorLockCount: 1,
    frostBottles: 1,
  },
  {
    twistBadge: 'Master Brew · 3 Twists',
    baseCap: 6,
    colorCount: 8,
    colorLockCount: 1,
    frostBottles: 1,
    reverseMistBottles: 2,
  },
  {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 10,
    tastingThimbles: true,
    starlight: true,
    frostBottles: 1,
  },
  {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 7,
    recipeFlask: true,
    corkedEmpty: true,
    reverseMistBottles: 2,
  },
  {
    twistBadge: 'Master Brew · 3 Twists',
    colorCount: 9,
    grandVat: 12,
    colorLockCount: 1,
    mysteryBottles: 3,
  },
];

function getFinalePreset(levelNum) {
  if (CHAPTER_FINALE_SPECS[levelNum]) return CHAPTER_FINALE_SPECS[levelNum];
  if (levelNum >= 550 && levelNum % 50 === 0) {
    const idx = Math.floor((levelNum - 550) / 50) % ENDLESS_FINALE_CYCLE.length;
    return ENDLESS_FINALE_CYCLE[idx];
  }
  return null;
}

/**
 * Campaign pacing blueprint using a relaxing "sawtooth" wave across all 12 twists.
 */
export function getCampaignSpec(levelNum, pureClassic = false) {
  const modWave = levelNum % 6;
  const isBreezy = levelNum > 10 && modWave === 1;
  const isThoughtful = levelNum > 15 && modWave === 0;

  let baseCap = 4;
  let colorCount = 5;
  let emptyCount = 2;
  let mysteryBottles = 0;
  let reverseMistBottles = 0;
  let lockedBottles = 0;
  let corkedEmpty = false;
  let colorLockCount = 0;
  let frostBottles = 0;
  let keyedBottles = 0;
  let variableCap = false;
  let tastingThimbles = false;
  let starlight = false;
  let blendingCauldron = false;
  let recipeFlask = false;
  let grandVat = 0;
  let subtitle = null;
  let introTwistId = null;
  let isDebut = false;
  let isFinale = false;
  let finaleBadge = null;

  const debut = !pureClassic ? DEBUT_LEVEL_SPECS[levelNum] : null;
  const finale = !pureClassic && !debut ? getFinalePreset(levelNum) : null;
  const preset = debut || finale;

  if (preset) {
    isDebut = Boolean(debut);
    isFinale = Boolean(finale);
    introTwistId = debut ? debut.introTwistId : null;
    finaleBadge = finale ? finale.twistBadge : null;
    baseCap = preset.baseCap || 4;
    colorCount = preset.colorCount;
    emptyCount = preset.emptyCount ?? 2;
    mysteryBottles = preset.mysteryBottles || 0;
    reverseMistBottles = preset.reverseMistBottles || 0;
    lockedBottles = preset.lockedBottles || 0;
    corkedEmpty = Boolean(preset.corkedEmpty);
    colorLockCount = preset.colorLockCount || 0;
    frostBottles = preset.frostBottles || 0;
    keyedBottles = preset.keyedBottles || 0;
    variableCap = Boolean(preset.variableCap);
    tastingThimbles = Boolean(preset.tastingThimbles);
    starlight = Boolean(preset.starlight);
    blendingCauldron = Boolean(preset.blendingCauldron);
    recipeFlask = Boolean(preset.recipeFlask);
    grandVat = preset.grandVat || 0;
    subtitle = preset.subtitle || null;
  } else if (levelNum <= 15) {
    colorCount = levelNum <= 12 ? 5 : 6;
  } else if (levelNum <= 20) {
    colorCount = isBreezy ? 5 : 6;
  } else if (levelNum <= 35) {
    colorCount = isBreezy ? 6 : isThoughtful ? 7 : 6;
    mysteryBottles = levelNum % 2 === 1 ? 2 : 0;
  } else if (levelNum <= 50) {
    colorCount = isBreezy ? 6 : isThoughtful ? 8 : 7;
    if (!isBreezy) {
      if (levelNum % 2 === 0) reverseMistBottles = 2;
      else mysteryBottles = 3;
    }
  } else if (levelNum <= 64) {
    colorCount = isBreezy ? 7 : isThoughtful ? 8 : 7;
    if (!isBreezy) {
      lockedBottles = levelNum % 2 === 1 ? 1 : 0;
      if (levelNum % 3 === 0) mysteryBottles = 2;
      else if (levelNum % 4 === 0) reverseMistBottles = 2;
    }
  } else if (levelNum <= 79) {
    colorCount = isBreezy ? 7 : isThoughtful ? 9 : 8;
    if (!isBreezy) {
      if (levelNum % 3 === 0) corkedEmpty = true;
      else if (levelNum % 3 === 2) lockedBottles = 1;
      if (levelNum % 2 === 0) mysteryBottles = 2;
      else if (levelNum % 5 === 0) reverseMistBottles = 2;
    }
  } else if (levelNum <= 100) {
    colorCount = isBreezy ? 7 : isThoughtful ? 9 : 8;
    if (!isBreezy) {
      if (levelNum % 3 === 1) colorLockCount = 1;
      else if (levelNum % 4 === 0) corkedEmpty = true;
      else if (levelNum % 4 === 2) lockedBottles = 1;
      if (levelNum % 2 === 1 && !colorLockCount) mysteryBottles = 2;
    }
  } else if (levelNum <= 120) {
    colorCount = isBreezy ? 7 : isThoughtful ? 9 : 8;
    if (!isBreezy) {
      if (levelNum % 3 === 0) frostBottles = 1;
      else if (levelNum % 3 === 2) colorLockCount = 1;
      else if (levelNum % 4 === 1) corkedEmpty = true;
      if (levelNum % 2 === 0) reverseMistBottles = 2;
      else mysteryBottles = 2;
    }
  } else if (levelNum <= 140) {
    colorCount = isBreezy ? 7 : isThoughtful ? 9 : 8;
    if (!isBreezy) {
      if (levelNum >= 125 && levelNum % 4 === 1) variableCap = true;
      else if (levelNum % 3 === 0) keyedBottles = 1;
      else if (levelNum % 4 === 2) frostBottles = 1;
      else if (levelNum % 4 === 0) colorLockCount = 1;
      if (levelNum % 2 === 0 && !variableCap) mysteryBottles = 2;
    }
  } else if (levelNum <= 180) {
    colorCount = isBreezy ? 7 : isThoughtful ? 9 : 8;
    if (!isBreezy) {
      const slot = levelNum % 7;
      if (slot === 0 || slot === 4) tastingThimbles = true;
      else if (slot === 2) keyedBottles = 1;
      else if (slot === 3) frostBottles = 1;
      else if (slot === 5) variableCap = true;
      else if (slot === 6) colorLockCount = 1;

      if (!tastingThimbles && levelNum % 2 === 0) mysteryBottles = 2;
      else if (!tastingThimbles && levelNum % 5 === 0) reverseMistBottles = 2;
    }
  } else if (levelNum <= 220) {
    colorCount = isBreezy ? 8 : isThoughtful ? 10 : 9;
    if (!isBreezy) {
      const slot = levelNum % 8;
      if (slot === 0 || slot === 4) starlight = true;
      else if (slot === 2) tastingThimbles = true;
      else if (slot === 3) frostBottles = 1;
      else if (slot === 5) colorLockCount = 1;
      else if (slot === 6) keyedBottles = 1;
      else if (slot === 7) corkedEmpty = true;

      if (starlight && levelNum % 2 === 0) mysteryBottles = 2;
      else if (!tastingThimbles && levelNum % 3 === 0) reverseMistBottles = 2;
    }
  } else if (levelNum <= 250) {
    colorCount = isBreezy ? 8 : isThoughtful ? 10 : 9;
    if (!isBreezy) {
      const slot = levelNum % 8;
      if (slot === 0 || slot === 4) blendingCauldron = true;
      else if (slot === 2) starlight = true;
      else if (slot === 3) tastingThimbles = true;
      else if (slot === 5) frostBottles = 1;
      else if (slot === 6) variableCap = true;
      else if (slot === 7) colorLockCount = 1;

      if (!blendingCauldron && !tastingThimbles && levelNum % 2 === 0) mysteryBottles = 2;
    }
  } else if (levelNum <= 300) {
    baseCap = 4;
    colorCount = isBreezy ? 8 : isThoughtful ? 11 : 10;
    if (!isBreezy) {
      const slot = levelNum % 10;
      if (slot === 0 || slot === 5) recipeFlask = true;
      else if (slot === 2 || slot === 7) blendingCauldron = true;
      else if (slot === 3) starlight = true;
      else if (slot === 4) tastingThimbles = true;
      else if (slot === 6) frostBottles = 1;
      else if (slot === 8) colorLockCount = 1;
      else if (slot === 9) variableCap = true;

      if (!recipeFlask && !blendingCauldron && !tastingThimbles) {
        if (levelNum % 2 === 0) mysteryBottles = 2;
        else if (levelNum % 3 === 0) reverseMistBottles = 2;
      }
    }
  } else if (levelNum <= 350) {
    baseCap = 4;
    colorCount = isBreezy ? 8 : isThoughtful ? 11 : 10;
    if (!isBreezy) {
      const slot = levelNum % 10;
      if (slot === 0 || slot === 5) recipeFlask = true;
      else if (slot === 2 || slot === 7) {
        grandVat = 8;
        colorCount = Math.min(colorCount, 9);
      } else if (slot === 3) blendingCauldron = true;
      else if (slot === 4) tastingThimbles = true;
      else if (slot === 6) frostBottles = 1;
      else if (slot === 8) colorLockCount = 1;
      else if (slot === 9) starlight = true;

      if (!recipeFlask && !blendingCauldron && !tastingThimbles) {
        if (levelNum % 2 === 0) mysteryBottles = 2;
        else if (levelNum % 3 === 0) reverseMistBottles = 2;
      }
    }
  } else if (levelNum === 351) {
    baseCap = 5;
    colorCount = 8;
    emptyCount = 2;
    subtitle = 'Deep 5-unit flasks — plan one layer deeper';
  } else if (levelNum <= 500) {
    if (levelNum % 2 === 1) {
      baseCap = 5;
      colorCount = isBreezy ? 8 : isThoughtful ? 10 : 9;
      if (!isBreezy) {
        const slot = ((levelNum - 1) / 2) % 7;
        if (slot === 0 || slot === 4) {
          grandVat = 10;
          colorCount = Math.min(colorCount, 8);
        } else if (slot === 1) starlight = true;
        else if (slot === 2) frostBottles = 1;
        else if (slot === 3) colorLockCount = 1;
        else if (slot === 5) keyedBottles = 1;
        else if (slot === 6) corkedEmpty = true;

        if (!corkedEmpty && levelNum % 3 === 0) reverseMistBottles = 2;
        else if (!corkedEmpty && levelNum % 4 === 1) mysteryBottles = 2;
      }
    } else {
      baseCap = 4;
      colorCount = isBreezy ? 9 : isThoughtful ? 12 : 11;
      if (!isBreezy) {
        const slot = (levelNum / 2) % 7;
        if (slot === 0) {
          grandVat = isThoughtful ? 12 : 8;
          colorCount = Math.min(colorCount, grandVat === 12 ? 9 : 10);
        } else if (slot === 1) recipeFlask = true;
        else if (slot === 2) blendingCauldron = true;
        else if (slot === 3) tastingThimbles = true;
        else if (slot === 4) starlight = true;
        else if (slot === 5) frostBottles = 1;
        else if (slot === 6) colorLockCount = 1;

        if (!recipeFlask && !blendingCauldron && !tastingThimbles) {
          if (levelNum % 4 === 0) mysteryBottles = 2;
          else if (levelNum % 3 === 0) reverseMistBottles = 2;
        }
      }
    }
  } else {
    if (isThoughtful && levelNum % 12 === 0) {
      baseCap = 6;
      colorCount = 8;
      const idx6 = Math.floor(levelNum / 12) % 4;
      if (idx6 === 0) {
        grandVat = 12;
        colorCount = 7;
      } else if (idx6 === 1) {
        frostBottles = 1;
        mysteryBottles = 2;
      } else if (idx6 === 2) {
        colorLockCount = 1;
        reverseMistBottles = 2;
      } else {
        starlight = true;
      }
    } else if (levelNum % 2 === 1) {
      baseCap = 5;
      colorCount = isBreezy ? 8 : isThoughtful ? 10 : 9;
      if (!isBreezy) {
        const slot = ((levelNum - 1) / 2) % 7;
        if (slot === 0 || slot === 4) {
          grandVat = 10;
          colorCount = Math.min(colorCount, 8);
        } else if (slot === 1) starlight = true;
        else if (slot === 2) frostBottles = 1;
        else if (slot === 3) colorLockCount = 1;
        else if (slot === 5) keyedBottles = 1;
        else if (slot === 6) corkedEmpty = true;

        if (!corkedEmpty && levelNum % 3 === 0) reverseMistBottles = 2;
        else if (!corkedEmpty && levelNum % 4 === 1) mysteryBottles = 2;
      }
    } else {
      baseCap = 4;
      colorCount = isBreezy ? 9 : isThoughtful ? 12 : 11;
      if (!isBreezy) {
        const slot = (levelNum / 2) % 7;
        if (slot === 0) {
          grandVat = isThoughtful ? 12 : 8;
          colorCount = Math.min(colorCount, grandVat === 12 ? 9 : 10);
        } else if (slot === 1) recipeFlask = true;
        else if (slot === 2) blendingCauldron = true;
        else if (slot === 3) tastingThimbles = true;
        else if (slot === 4) starlight = true;
        else if (slot === 5) frostBottles = 1;
        else if (slot === 6) colorLockCount = 1;

        if (!recipeFlask && !blendingCauldron && !tastingThimbles) {
          if (levelNum % 4 === 0) mysteryBottles = 2;
          else if (levelNum % 3 === 0) reverseMistBottles = 2;
        }
      }
    }
  }

  if (pureClassic) {
    mysteryBottles = 0;
    reverseMistBottles = 0;
    lockedBottles = 0;
    corkedEmpty = false;
    colorLockCount = 0;
    frostBottles = 0;
    keyedBottles = 0;
    variableCap = false;
    tastingThimbles = false;
    starlight = false;
    blendingCauldron = false;
    recipeFlask = false;
    grandVat = 0;
    introTwistId = null;
    isDebut = false;
    isFinale = false;
    finaleBadge = null;
  }

  let twistBadge = null;
  if (finaleBadge) {
    twistBadge = finaleBadge;
  } else if (introTwistId) {
    const t = getTwistById(introTwistId);
    twistBadge = t ? t.badgeLabel : null;
  } else if (grandVat > 0) twistBadge = 'Grand Vat';
  else if (recipeFlask) twistBadge = 'Recipe Flask';
  else if (blendingCauldron) twistBadge = 'Blending Cauldron';
  else if (starlight) twistBadge = 'Starlight Wildcard';
  else if (tastingThimbles) twistBadge = 'Tasting Thimbles';
  else if (frostBottles > 0) twistBadge = 'Frost Runes';
  else if (colorLockCount > 0) twistBadge = 'Color-Keyed Seal';
  else if (corkedEmpty) twistBadge = 'Corked Reserve';
  else if (lockedBottles > 0 && (mysteryBottles > 0 || reverseMistBottles > 0)) twistBadge = 'Veiled & Sealed';
  else if (lockedBottles > 0) twistBadge = 'Ribboned Flask';
  else if (keyedBottles > 0) twistBadge = 'Gemstone Crest';
  else if (variableCap) twistBadge = 'Apothecary Sizes';
  else if (reverseMistBottles > 0) twistBadge = 'Glass-Bottom Peek';
  else if (mysteryBottles > 0) twistBadge = 'Mystery Mist';

  return {
    levelNum,
    chapter: getChapterForLevel(levelNum),
    baseCap,
    colorCount,
    emptyCount,
    mysteryBottles,
    reverseMistBottles,
    lockedBottles,
    corkedEmpty,
    colorLockCount,
    frostBottles,
    keyedBottles,
    variableCap,
    tastingThimbles,
    starlight,
    blendingCauldron,
    recipeFlask,
    grandVat,
    subtitle,
    introTwistId,
    isDebut,
    isFinale,
    isBreezy,
    isThoughtful,
    twistBadge,
  };
}

function makeEmptyBottle(id, capacity = 4, overrides = {}) {
  return {
    id,
    capacity,
    layers: [],
    hiddenCount: 0,
    hiddenIndices: [],
    locked: false,
    lockedByColor: null,
    frostMoves: 0,
    targetColor: null,
    stagingOnly: false,
    pourOnly: false,
    recipe: null,
    blend: null,
    isExtra: false,
    ...overrides,
  };
}

/**
 * Builds the color unit pool & bottle capacity plan for a spec.
 */
function buildBoardTemplate(spec, rng) {
  const {
    baseCap = 4,
    colorCount,
    emptyCount,
    variableCap = false,
    tastingThimbles = false,
    starlight = false,
    blendingCauldron = false,
    recipeFlask = false,
    grandVat = 0,
  } = spec;

  const shuffledAll = shuffleInPlace(POTION_COLORS.slice(), rng);

  if (grandVat > 0) {
    const mult = Math.max(2, Math.min(3, Math.round(grandVat / baseCap)));
    const vatCap = mult * baseCap;
    const vatColor = shuffledAll[0];
    const regularCount = Math.max(4, Math.min(colorCount - 1, shuffledAll.length - 1));
    const regularColors = shuffledAll.slice(1, 1 + regularCount);

    const unitPool = [];
    for (const col of regularColors) {
      for (let u = 0; u < baseCap; u++) unitPool.push(col);
    }
    for (let u = 0; u < vatCap; u++) {
      unitPool.push(vatColor);
    }

    const filledCount = regularCount + mult;
    const capacities = new Array(filledCount).fill(baseCap);
    const emptySpecs = [
      { capacity: baseCap },
      { capacity: vatCap, targetColor: vatColor, pourOnly: true },
    ];

    return { unitPool, capacities, regularColors, emptySpecs };
  }

  if (blendingCauldron) {
    const chosenRecipe = BLEND_RECIPES[Math.floor(rng() * BLEND_RECIPES.length)];
    const [ingA, ingB] = chosenRecipe.colors;
    const regularPool = shuffledAll.filter(
      (c) => c !== ingA && c !== ingB && c !== chosenRecipe.result
    );
    const regularCount = Math.max(4, Math.min(colorCount - 1, regularPool.length, 8));
    const regularColors = regularPool.slice(0, regularCount);

    const unitPool = [];
    for (const col of regularColors) {
      for (let u = 0; u < 4; u++) unitPool.push(col);
    }
    unitPool.push(ingA, ingA, ingB, ingB);

    const filledCount = regularCount + 1;
    const capacities = new Array(filledCount).fill(4);
    const emptySpecs = [
      {
        capacity: 4,
        blend: {
          colors: [ingA, ingB],
          perColor: 2,
          result: chosenRecipe.result,
          brewed: false,
        },
      },
    ];
    for (let e = 0; e < Math.max(2, emptyCount); e++) {
      emptySpecs.push({ capacity: 4 });
    }

    return { unitPool, capacities, regularColors, emptySpecs };
  }

  if (recipeFlask) {
    const regularCount = Math.max(5, Math.min(colorCount, 7));
    const palette = shuffledAll.slice(0, regularCount);
    if (starlight && palette.length >= 5) {
      palette[palette.length - 1] = 'starlight';
    }
    const nonStarlight = palette.filter((c) => c !== 'starlight');
    const recipeColors = shuffleInPlace(nonStarlight.slice(), rng).slice(0, 4);

    const unitPool = [];
    for (const col of palette) {
      for (let u = 0; u < 4; u++) unitPool.push(col);
    }
    for (const rc of recipeColors) {
      unitPool.push(rc);
    }

    const filledCount = regularCount + 1;
    const capacities = new Array(filledCount).fill(4);
    const emptySpecs = [{ capacity: 4, recipe: recipeColors }];
    for (let e = 0; e < Math.max(2, emptyCount); e++) {
      emptySpecs.push({ capacity: 4 });
    }

    return { unitPool, capacities, regularColors: nonStarlight, emptySpecs };
  }

  // Standard, Starlight, Tasting Thimbles, Variable Cap, Seals & Mists
  const palette = shuffledAll.slice(0, colorCount);
  if (starlight && palette.length >= 2) {
    palette[palette.length - 1] = 'starlight';
  }

  const capacities = new Array(colorCount).fill(baseCap);
  if (variableCap && baseCap === 4 && colorCount >= 5) {
    // Keep non-starlight colors on 3u / 5u pair
    capacities[0] = 3;
    capacities[1] = 5;
  }

  const maxCap = Math.max(baseCap, ...capacities);
  const unitPool = [];
  for (let c = 0; c < colorCount; c++) {
    for (let u = 0; u < capacities[c]; u++) {
      unitPool.push(palette[c]);
    }
  }

  const regularColors = palette.filter((c, i) => c !== 'starlight' && capacities[i] === baseCap);

  const emptySpecs = [];
  if (tastingThimbles) {
    const normalEmpties = 1;
    for (let e = 0; e < normalEmpties; e++) {
      emptySpecs.push({ capacity: maxCap });
    }
    emptySpecs.push({ capacity: 2, stagingOnly: true });
    emptySpecs.push({ capacity: 2, stagingOnly: true });
  } else {
    for (let e = 0; e < emptyCount; e++) {
      emptySpecs.push({ capacity: e === 0 && variableCap ? maxCap : baseCap });
    }
  }

  return { unitPool, capacities, regularColors, emptySpecs };
}

/**
 * Generates a balanced, non-trivial, 100% solver-verified state for a given spec & seed.
 */
function generateVerifiedBoard(spec, seed) {
  const rng = createRng(seed);
  const {
    baseCap = 4,
    colorCount = 5,
    mysteryBottles = 0,
    reverseMistBottles = 0,
    lockedBottles = 0,
    corkedEmpty = false,
    colorLockCount = 0,
    frostBottles = 0,
    keyedBottles = 0,
    grandVat = 0,
    isDebut = false,
    isFinale = false,
  } = spec;

  const { unitPool, capacities, regularColors, emptySpecs } = buildBoardTemplate(spec, rng);
  const filledCount = capacities.length;
  const isComplexBoard = colorCount >= 11 || baseCap >= 5 || grandVat > 0;
  const maxAttempts = isDebut || isFinale ? 120 : isComplexBoard ? 75 : 50;
  const maxNodes = isDebut || isFinale ? 10000 : isComplexBoard ? 7500 : 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pool = shuffleInPlace(unitPool.slice(), rng);
    const bottles = [];
    let cursor = 0;

    for (let i = 0; i < filledCount; i++) {
      const cap = capacities[i];
      const layers = pool.slice(cursor, cursor + cap);
      cursor += cap;
      bottles.push(makeEmptyBottle(i, cap, { layers }));
    }

    // Reject if any bottle started already complete
    if (bottles.some((b) => isBottleComplete(b))) continue;

    // Add empty / special empty vessels
    for (let e = 0; e < emptySpecs.length; e++) {
      bottles.push(makeEmptyBottle(filledCount + e, emptySpecs[e].capacity, emptySpecs[e]));
    }

    // 1. Apply color-keyed crest to a standard plain empty bottle
    let reservedCrestColor = null;
    if (keyedBottles > 0 && regularColors.length > 0) {
      const plainEmpty = bottles.find(
        (b) =>
          b.layers.length === 0 &&
          b.capacity === baseCap &&
          !b.stagingOnly &&
          !b.pourOnly &&
          !b.recipe &&
          !b.blend &&
          !b.locked
      );
      if (plainEmpty) {
        reservedCrestColor = regularColors[Math.floor(rng() * regularColors.length)];
        plainEmpty.targetColor = reservedCrestColor;
      }
    }

    // 2. Apply Corked Empty Reserve OR Ribboned Filled Flask
    if (corkedEmpty) {
      const plainEmpties = bottles.filter(
        (b) =>
          b.layers.length === 0 &&
          !b.stagingOnly &&
          !b.pourOnly &&
          !b.recipe &&
          !b.blend &&
          !b.targetColor &&
          !b.locked
      );
      if (plainEmpties.length >= 2) {
        plainEmpties[plainEmpties.length - 1].locked = true;
      }
    } else if (lockedBottles > 0) {
      const lockIdx = Math.floor(rng() * filledCount);
      bottles[lockIdx].locked = true;
    }

    // 3. Apply Color-Keyed Seal (must choose a keyColor absent from locked bottles!)
    if (colorLockCount > 0 && regularColors.length >= 2) {
      const candidates = bottles
        .slice(0, filledCount)
        .filter((b) => !isBottleLocked(b));
      shuffleInPlace(candidates, rng);

      let appliedColorLock = false;
      for (const targetBottle of candidates) {
        const forbidden = new Set(targetBottle.layers);
        for (const b of bottles) {
          if (isBottleLocked(b)) {
            for (const c of b.layers) forbidden.add(c);
          }
        }
        const validKeys = regularColors.filter((c) => !forbidden.has(c) && c !== reservedCrestColor);
        if (validKeys.length > 0) {
          targetBottle.lockedByColor = validKeys[Math.floor(rng() * validKeys.length)];
          appliedColorLock = true;
          break;
        }
      }
      if (!appliedColorLock) continue;
    }

    // 4. Apply Melting Frost Runes to an unlocked filled bottle
    if (frostBottles > 0) {
      const eligible = bottles
        .slice(0, filledCount)
        .filter((b) => !isBottleLocked(b));
      if (eligible.length > 0) {
        const chosen = eligible[Math.floor(rng() * eligible.length)];
        chosen.frostMoves = isDebut ? 3 : 4;
      }
    }

    // 5. Apply Glass-Bottom Peek (middle layers hidden) to unlocked 4+ capacity filled bottles
    if (reverseMistBottles > 0) {
      const eligible = bottles
        .slice(0, filledCount)
        .filter((b) => b.layers.length >= 4 && !isBottleLocked(b) && b.hiddenCount === 0);
      shuffleInPlace(eligible, rng);
      const count = Math.min(reverseMistBottles, eligible.length);
      for (let m = 0; m < count; m++) {
        const len = eligible[m].layers.length;
        const midIndices = [];
        for (let idx = 1; idx < len - 1; idx++) midIndices.push(idx);
        eligible[m].hiddenIndices = midIndices;
      }
    }

    // 6. Apply Mystery Mist (bottom layers hidden) to unlocked filled bottles
    if (mysteryBottles > 0) {
      const eligible = bottles
        .slice(0, filledCount)
        .filter(
          (b) => b.layers.length >= 3 && !isBottleLocked(b) && b.hiddenIndices.length === 0
        );
      shuffleInPlace(eligible, rng);
      const count = Math.min(mysteryBottles, eligible.length);
      const maxHide = baseCap >= 5 ? 3 : 2;
      for (let m = 0; m < count; m++) {
        eligible[m].hiddenCount = Math.min(eligible[m].layers.length - 1, maxHide);
      }
    }

    const candidateState = {
      bottles,
      extraAdded: 0,
      movesCount: 0,
    };

    const check = solveState(candidateState, { maxNodes, weight: 2.5 });
    if (check.solved && check.moves.length >= Math.max(4, filledCount + 1)) {
      return candidateState;
    }
  }

  // Safe fallback preserving the core template (so special vessels/colors never lose balance)
  for (let attempt = 0; attempt < 25; attempt++) {
    const pool = shuffleInPlace(unitPool.slice(), rng);
    const bottles = [];
    let cursor = 0;
    for (let i = 0; i < filledCount; i++) {
      const cap = capacities[i];
      const layers = pool.slice(cursor, cursor + cap);
      cursor += cap;
      bottles.push(makeEmptyBottle(i, cap, { layers }));
    }
    if (bottles.some((b) => isBottleComplete(b))) continue;
    for (let e = 0; e < emptySpecs.length; e++) {
      bottles.push(makeEmptyBottle(filledCount + e, emptySpecs[e].capacity, emptySpecs[e]));
    }
    const fallbackState = { bottles, extraAdded: 0, movesCount: 0 };
    if (solveState(fallbackState, { maxNodes: Math.max(6000, maxNodes), weight: 2.6 }).solved) {
      return fallbackState;
    }
  }

  // Last-resort guaranteed clean classic layout
  const fallbackPool = shuffleInPlace(unitPool.slice(), rng);
  const bottles = [];
  let cursor = 0;
  for (let i = 0; i < filledCount; i++) {
    const cap = capacities[i];
    bottles.push(makeEmptyBottle(i, cap, { layers: fallbackPool.slice(cursor, cursor + cap) }));
    cursor += cap;
  }
  for (let e = 0; e < emptySpecs.length; e++) {
    bottles.push(makeEmptyBottle(filledCount + e, emptySpecs[e].capacity, emptySpecs[e]));
  }
  return { bottles, extraAdded: 0, movesCount: 0 };
}

/**
 * Generates a Campaign Journey level (1..Infinity).
 */
export function generateCampaignLevel(levelNum, options = {}) {
  const pureClassic = Boolean(options.pureClassic);

  if (HANDCRAFTED_LEVELS[levelNum]) {
    const preset = HANDCRAFTED_LEVELS[levelNum];
    const bottles = preset.bottles.map((layers, idx) =>
      makeEmptyBottle(idx, 4, { layers: layers.slice() })
    );
    return {
      mode: 'journey',
      levelNum,
      title: `Level ${levelNum}`,
      chapter: getChapterForLevel(levelNum),
      subtitle: preset.subtitle || null,
      twistBadge: null,
      introTwistId: null,
      isFinale: false,
      state: { bottles, extraAdded: 0, movesCount: 0 },
    };
  }

  const spec = getCampaignSpec(levelNum, pureClassic);
  const seed = hashString(`moonlight-elixirs-v2-level-${levelNum}-${pureClassic ? 'classic' : 'magic'}`);
  const state = generateVerifiedBoard(spec, seed);

  return {
    mode: 'journey',
    levelNum,
    title: `Level ${levelNum}`,
    chapter: spec.chapter,
    subtitle: spec.subtitle || null,
    twistBadge: spec.twistBadge,
    introTwistId: spec.introTwistId || null,
    isFinale: Boolean(spec.isFinale),
    state,
  };
}

/**
 * Generates a Zen Free Play puzzle at chosen comfort level.
 */
export function generateZenLevel(difficulty, sessionSeed = Date.now(), pureClassic = false) {
  const seed = hashString(`zen-${difficulty}-${sessionSeed}`);
  const rng = createRng(seed);

  let spec;
  if (difficulty === 'breezy') {
    spec = { label: 'Breezy Brew', colorCount: 5, emptyCount: 2 };
  } else if (difficulty === 'relaxing') {
    const useBottomPeek = !pureClassic && rng() > 0.6;
    spec = {
      label: 'Relaxing Pour',
      colorCount: 7,
      emptyCount: 2,
      mysteryBottles: pureClassic || useBottomPeek ? 0 : 2,
      reverseMistBottles: useBottomPeek ? 2 : 0,
    };
  } else if (difficulty === 'thoughtful') {
    const roll = rng();
    spec = {
      label: 'Thoughtful Mix',
      colorCount: 9,
      emptyCount: 2,
      mysteryBottles: pureClassic ? 0 : 2,
      lockedBottles: !pureClassic && roll < 0.35 ? 1 : 0,
      frostBottles: !pureClassic && roll >= 0.35 && roll < 0.7 ? 1 : 0,
      starlight: !pureClassic && roll >= 0.7,
    };
  } else {
    const useDeepFlasks = rng() < 0.35;
    const roll = rng();
    if (useDeepFlasks) {
      spec = {
        label: 'Master Alchemy',
        baseCap: 5,
        colorCount: !pureClassic && roll < 0.45 ? 8 : 9,
        emptyCount: 2,
        grandVat: !pureClassic && roll < 0.45 ? 10 : 0,
        frostBottles: !pureClassic && roll >= 0.45 && roll < 0.75 ? 1 : 0,
        colorLockCount: !pureClassic && roll >= 0.75 ? 1 : 0,
      };
    } else {
      spec = {
        label: 'Master Alchemy',
        baseCap: 4,
        colorCount: !pureClassic && roll >= 0.65 && roll < 0.85 ? 9 : rng() < 0.5 ? 10 : 11,
        emptyCount: 2,
        grandVat: !pureClassic && roll < 0.25 ? 8 : 0,
        tastingThimbles: !pureClassic && roll >= 0.25 && roll < 0.45,
        blendingCauldron: !pureClassic && roll >= 0.45 && roll < 0.65,
        recipeFlask: !pureClassic && roll >= 0.65 && roll < 0.85,
        colorLockCount: !pureClassic && roll >= 0.85 ? 1 : 0,
        mysteryBottles: !pureClassic && roll >= 0.85 ? 2 : 0,
      };
    }
  }

  const state = generateVerifiedBoard(spec, seed ^ 0x517cc1b7);

  let twistBadge = null;
  if (!pureClassic) {
    if (spec.grandVat) twistBadge = 'Grand Vat';
    else if (spec.recipeFlask) twistBadge = 'Recipe Flask';
    else if (spec.blendingCauldron) twistBadge = 'Blending Cauldron';
    else if (spec.tastingThimbles) twistBadge = 'Tasting Thimbles';
    else if (spec.starlight) twistBadge = 'Starlight Wildcard';
    else if (spec.colorLockCount) twistBadge = 'Color-Keyed Seal';
    else if (spec.frostBottles) twistBadge = 'Frost Runes';
    else if (spec.lockedBottles) twistBadge = 'Ribboned Flask';
    else if (spec.reverseMistBottles) twistBadge = 'Glass-Bottom Peek';
    else if (spec.mysteryBottles) twistBadge = 'Mystery Mist';
  }

  return {
    mode: 'zen',
    zenDifficulty: difficulty,
    title: spec.label,
    chapter: 'Zen Brewing',
    subtitle: null,
    twistBadge,
    introTwistId: null,
    state,
  };
}

/**
 * Generates the Daily Elixir puzzle deterministically for a YYYY-MM-DD key.
 */
export function generateDailyLevel(dateKey, pureClassic = false) {
  const seed = hashString(`moonlight-daily-${dateKey}`);
  const rng = createRng(seed);
  const colorCount = 7 + Math.floor(rng() * 3); // 7 to 9 colors

  const spec = {
    colorCount,
    emptyCount: 2,
    mysteryBottles: 0,
    reverseMistBottles: 0,
    lockedBottles: 0,
    corkedEmpty: false,
    colorLockCount: 0,
    frostBottles: 0,
    keyedBottles: 0,
    variableCap: false,
    tastingThimbles: false,
    starlight: false,
    blendingCauldron: false,
    recipeFlask: false,
  };

  let twistBadge = null;
  if (!pureClassic) {
    const roll = Math.floor(rng() * 9);
    if (roll === 0) {
      spec.mysteryBottles = 2;
      twistBadge = 'Mystery Mist';
    } else if (roll === 1) {
      spec.reverseMistBottles = 2;
      twistBadge = 'Glass-Bottom Peek';
    } else if (roll === 2) {
      spec.lockedBottles = 1;
      spec.mysteryBottles = 2;
      twistBadge = 'Veiled & Sealed';
    } else if (roll === 3) {
      spec.corkedEmpty = true;
      twistBadge = 'Corked Reserve';
    } else if (roll === 4) {
      spec.colorLockCount = 1;
      twistBadge = 'Color-Keyed Seal';
    } else if (roll === 5) {
      spec.frostBottles = 1;
      twistBadge = 'Frost Runes';
    } else if (roll === 6) {
      spec.tastingThimbles = true;
      twistBadge = 'Tasting Thimbles';
    } else if (roll === 7) {
      spec.starlight = true;
      twistBadge = 'Starlight Wildcard';
    } else {
      spec.blendingCauldron = true;
      twistBadge = 'Blending Cauldron';
    }
  }

  const state = generateVerifiedBoard(spec, seed ^ 0x9e3779b9);

  return {
    mode: 'daily',
    dateKey,
    title: 'Daily Elixir',
    chapter: dateKey,
    subtitle: null,
    twistBadge,
    introTwistId: null,
    state,
  };
}

/**
 * Safely shuffles remaining uncompleted, unlocked, non-empty liquid layers
 * while guaranteeing the shuffled state remains solvable!
 */
export function safeShuffleState(state) {
  if (isLevelWon(state)) return null;

  const eligibleIndices = [];
  const pool = [];
  for (let i = 0; i < state.bottles.length; i++) {
    const b = state.bottles[i];
    if (isBottleLocked(b) || isBottleEmpty(b) || isBottleComplete(b) || b.pourOnly || b.recipe || b.blend) {
      continue;
    }
    eligibleIndices.push(i);
    for (const c of b.layers) pool.push(c);
  }

  if (eligibleIndices.length < 2) return null;

  const rng = createRng((Date.now() ^ (state.movesCount * 7919)) >>> 0);

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = cloneState(state);
    const shuffled = shuffleInPlace(pool.slice(), rng);
    let cursor = 0;

    for (const idx of eligibleIndices) {
      const b = candidate.bottles[idx];
      const len = b.layers.length;
      b.layers = shuffled.slice(cursor, cursor + len);
      cursor += len;
      if (b.hiddenCount >= b.layers.length) {
        b.hiddenCount = Math.max(0, b.layers.length - 1);
      }
      if (Array.isArray(b.hiddenIndices) && b.hiddenIndices.length > 0) {
        b.hiddenIndices = b.hiddenIndices.filter((hi) => hi < b.layers.length - 1);
      }
    }

    const res = solveState(candidate, { maxNodes: 6000, weight: 2.6 });
    if (res.solved) {
      return candidate;
    }
  }

  return null;
}
