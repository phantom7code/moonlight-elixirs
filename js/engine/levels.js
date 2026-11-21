/**
 * Moonlight Elixirs — Potion Colors, Themes, Bottle Styles, Chapters & Hand-Tuned Onboarding Levels (1–20)
 */

export const POTION_COLORS = [
  'ruby',
  'sapphire',
  'emerald',
  'amber',
  'amethyst',
  'teal',
  'rose',
  'coral',
  'indigo',
  'mint',
  'plum',
  'gold',
];

export const ALCHEMY_SYMBOLS = {
  ruby: '♥',
  sapphire: '◆',
  emerald: '♣',
  amber: '☀',
  amethyst: '☾',
  teal: '≈',
  rose: '✿',
  coral: '▲',
  indigo: '✦',
  mint: '❖',
  plum: '●',
  gold: '★',
  starlight: '✧',
};

export const COLOR_LABELS = {
  ruby: 'Ruby',
  sapphire: 'Sapphire',
  emerald: 'Emerald',
  amber: 'Amber',
  amethyst: 'Amethyst',
  teal: 'Teal',
  rose: 'Rose',
  coral: 'Coral',
  indigo: 'Indigo',
  mint: 'Mint',
  plum: 'Plum',
  gold: 'Gold',
  starlight: 'Starlight',
};

export const THEMES = [
  {
    id: 'candlelit-apothecary',
    name: 'Candlelit Apothecary',
    subtitle: 'Warm timber & golden candlelight',
    unlockLevel: 1,
    previewColors: ['#231a2e', '#3e2d3f', '#f4c77b'],
  },
  {
    id: 'moonlit-greenhouse',
    name: 'Moonlit Greenhouse',
    subtitle: 'Botanical night sanctuary',
    unlockLevel: 1,
    previewColors: ['#101f1d', '#1d3632', '#9cd4b5'],
  },
  {
    id: 'starlight-observatory',
    name: 'Starlight Observatory',
    subtitle: 'Deep midnight sky for bedtime play',
    unlockLevel: 20,
    previewColors: ['#0d1226', '#1c2547', '#f5d78e'],
  },
  {
    id: 'sunlit-tea-parlor',
    name: 'Sunlit Tea Parlor',
    subtitle: 'Soft morning cream & warm linen',
    unlockLevel: 55,
    previewColors: ['#f3ece1', '#e5d8c6', '#c68d65'],
  },
  {
    id: 'crystal-cave',
    name: 'Enchanted Crystal Cave',
    subtitle: 'Soft amethyst & bioluminescent glow',
    unlockLevel: 100,
    previewColors: ['#17132c', '#2b204d', '#7ee5e5'],
  },
];

export const BOTTLE_STYLES = [
  {
    id: 'apothecary',
    name: 'Apothecary Flask',
    subtitle: 'Classic rounded potion bottle',
    unlockLevel: 1,
  },
  {
    id: 'vial',
    name: 'Alchemy Vial',
    subtitle: 'Slender glass test tube',
    unlockLevel: 5,
  },
  {
    id: 'decanter',
    name: 'Crystal Decanter',
    subtitle: 'Faceted jewel silhouette',
    unlockLevel: 30,
  },
  {
    id: 'jar',
    name: 'Honey & Tea Jar',
    subtitle: 'Plump, cozy glass jar',
    unlockLevel: 70,
  },
  {
    id: 'crescent',
    name: 'Crescent Bottle',
    subtitle: 'Whimsical moonlit vessel',
    unlockLevel: 120,
  },
];

export const PALETTES = [
  {
    id: 'apothecary-gems',
    name: 'Apothecary Gems',
    subtitle: 'Rich, luminous jewel elixirs',
    unlockLevel: 1,
    swatches: ['#db2443', '#3892f5', '#137e4c', '#f78828', '#9d59f2', '#22d8dc'],
  },
  {
    id: 'soft-pastels',
    name: 'Soft Pastels',
    subtitle: 'Dreamy watercolor hues',
    unlockLevel: 12,
    swatches: ['#dc4c69', '#6ba8f5', '#2b8c63', '#f79d52', '#a67df0', '#5cdbd6'],
  },
  {
    id: 'botanical-earth',
    name: 'Botanical Herbary',
    subtitle: 'Warm terracotta, sage & berry',
    unlockLevel: 42,
    swatches: ['#bc2e3d', '#4889bf', '#206641', '#e38236', '#9065c4', '#3bc4bf'],
  },
  {
    id: 'classic-vibrant',
    name: 'Classic Vibrant',
    subtitle: 'Crisp, high-contrast brights',
    unlockLevel: 85,
    swatches: ['#e61736', '#1c90ff', '#0a7a3c', '#ff8214', '#9b42ff', '#00dce6'],
  },
];

export const CHAPTERS = [
  { start: 1, end: 10, name: 'First Brews' },
  { start: 11, end: 20, name: 'Whispering Herbs' },
  { start: 21, end: 35, name: 'Veiled Elixirs' },
  { start: 36, end: 50, name: 'Silver Mist' },
  { start: 51, end: 75, name: 'Velvet Seals' },
  { start: 76, end: 100, name: 'Starlight Tonics' },
  { start: 101, end: 140, name: 'Moonbeam Conservatory' },
  { start: 141, end: 180, name: 'Crystal Alchemy' },
  { start: 181, end: 250, name: 'Celestial Shelf' },
  { start: 251, end: 350, name: 'Eternal Apothecary' },
  { start: 351, end: 500, name: 'Astral Draughts' },
];

export function getChapterForLevel(levelNum) {
  for (const ch of CHAPTERS) {
    if (levelNum >= ch.start && levelNum <= ch.end) {
      return ch.name;
    }
  }
  const endlessIndex = Math.floor((levelNum - 501) / 50) + 1;
  return `Endless Shelf ${endlessIndex}`;
}

export function getUnlockAtLevel(levelNum) {
  const unlocked = [];
  for (const t of THEMES) {
    if (t.unlockLevel === levelNum && levelNum > 1) {
      unlocked.push({ kind: 'Theme', item: t });
    }
  }
  for (const b of BOTTLE_STYLES) {
    if (b.unlockLevel === levelNum && levelNum > 1) {
      unlocked.push({ kind: 'Bottle', item: b });
    }
  }
  for (const p of PALETTES) {
    if (p.unlockLevel === levelNum && levelNum > 1) {
      unlocked.push({ kind: 'Palette', item: p });
    }
  }
  return unlocked;
}

export function getNextUnlockMilestone(highestCompletedLevel) {
  const all = [
    ...THEMES.map((item) => ({ kind: 'Theme', item })),
    ...BOTTLE_STYLES.map((item) => ({ kind: 'Bottle', item })),
    ...PALETTES.map((item) => ({ kind: 'Palette', item })),
  ]
    .filter((entry) => entry.item.unlockLevel > Math.max(1, highestCompletedLevel))
    .sort((a, b) => a.item.unlockLevel - b.item.unlockLevel);

  return all.length > 0 ? all[0] : null;
}

/**
 * Chronological catalog of all 12 level twists (Levels 21 -> 251+).
 */
export const TWIST_CATALOG = [
  {
    id: 'mystery-mist',
    name: 'Mystery Mist',
    introLevel: 21,
    chapter: 'Veiled Elixirs',
    icon: '?',
    badgeLabel: 'Mystery Mist',
    description:
      'Misty layers marked with "?" hide their potion colors underneath. Pour away the visible top elixir to unveil what lies below.',
    tip: 'Clear top layers early to reveal hidden colors before committing empty flasks.',
    sampleBottle: {
      id: 901,
      capacity: 4,
      layers: ['sapphire', 'emerald', 'amber', 'ruby'],
      hiddenCount: 2,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'reverse-mist',
    name: 'Glass-Bottom Peek',
    introLevel: 36,
    chapter: 'Silver Mist',
    icon: '◐',
    badgeLabel: 'Glass-Bottom Peek',
    description:
      'Both the top and bottom layers shine clearly through the glass, while the middle two layers remain veiled in mist.',
    tip: 'Use the visible bottom anchor color to decide which flask can safely collect that elixir.',
    sampleBottle: {
      id: 902,
      capacity: 4,
      layers: ['ruby', 'sapphire', 'emerald', 'ruby'],
      hiddenCount: 0,
      hiddenIndices: [1, 2],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'ribboned-flask',
    name: 'Ribboned Flask',
    introLevel: 51,
    chapter: 'Velvet Seals',
    icon: '✦',
    badgeLabel: 'Ribboned Flask',
    description:
      'A velvet ribbon and golden wax seal hold this filled flask shut. Complete and cork any other flask on the shelf to untie it.',
    tip: 'Focus on completing an easy color first so the sealed flask opens up.',
    sampleBottle: {
      id: 903,
      capacity: 4,
      layers: ['amethyst', 'teal', 'rose', 'amber'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: true,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'corked-empty',
    name: 'Corked Empty Reserve',
    introLevel: 65,
    chapter: 'Velvet Seals',
    icon: '⚱',
    badgeLabel: 'Corked Reserve',
    description:
      'One of your empty spare flasks begins corked and tied shut. Complete your very first full elixir to pop the cork for extra room.',
    tip: 'Treat the first completed flask as a key that unlocks your second empty workspace.',
    sampleBottle: {
      id: 904,
      capacity: 4,
      layers: [],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: true,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'color-seal',
    name: 'Color-Keyed Seal',
    introLevel: 80,
    chapter: 'Starlight Tonics',
    icon: '◆',
    badgeLabel: 'Color-Keyed Seal',
    description:
      'A gemstone seal locks this flask to a specific potion color. Complete that matching elixir elsewhere on the shelf to melt the seal.',
    tip: 'Check the gem color on the ribbon—sorting that elixir first opens this bottle.',
    sampleBottle: {
      id: 905,
      capacity: 4,
      layers: ['emerald', 'emerald', 'sapphire', 'amber'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: 'ruby',
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'frost-runes',
    name: 'Melting Frost Runes',
    introLevel: 101,
    chapter: 'Moonbeam Conservatory',
    icon: '❄',
    badgeLabel: 'Frost Runes',
    description:
      'Glowing frost runes seal this flask with no rush or timer. Every pour you make anywhere on the shelf melts one rune until it thaws.',
    tip: 'Simply keep pouring across other flasks—the countdown melts peacefully move by move.',
    sampleBottle: {
      id: 906,
      capacity: 4,
      layers: ['sapphire', 'sapphire', 'amber', 'teal'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 3,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'gemstone-crest',
    name: 'Gemstone Crest',
    introLevel: 121,
    chapter: 'Moonbeam Conservatory',
    icon: '◈',
    badgeLabel: 'Gemstone Crest',
    description:
      'An empty flask embossed with a colored gemstone crest will only accept that matching elixir.',
    tip: 'Use uncrested flasks for temporary sorting, and save the crested flask for its gem color.',
    sampleBottle: {
      id: 907,
      capacity: 4,
      layers: ['emerald', 'emerald'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: 'emerald',
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'apothecary-sizes',
    name: 'Apothecary Sizes',
    introLevel: 125,
    chapter: 'Moonbeam Conservatory',
    icon: '⚖',
    badgeLabel: 'Apothecary Sizes',
    description:
      'A petite 3-unit flask joins a tall 5-unit vessel on the shelf. Small capacity badges remind you how much each bottle holds.',
    tip: 'Watch the extra headroom in the 5-unit flask—it can finish a whole 5-unit color or act as spacious staging.',
    sampleBottle: {
      id: 908,
      capacity: 5,
      layers: ['amethyst', 'amethyst', 'ruby', 'amber'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'tasting-thimbles',
    name: 'Tasting Thimbles',
    introLevel: 141,
    chapter: 'Crystal Alchemy',
    icon: '∪',
    badgeLabel: 'Tasting Thimbles',
    description:
      'Two nimble 2-unit crystal cups replace a full empty flask. They can hold any color temporarily, but must be emptied again to complete the shelf.',
    tip: 'Use thimbles as quick 1- or 2-layer stepping stones to uncover buried elixirs.',
    sampleBottle: {
      id: 909,
      capacity: 2,
      layers: ['teal'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: true,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'starlight',
    name: 'Starlight Wildcard',
    introLevel: 181,
    chapter: 'Celestial Shelf',
    icon: '✧',
    badgeLabel: 'Starlight Wildcard',
    description:
      'Pearlescent Starlight essence can pour onto any potion color—and any color can rest safely atop Starlight—before gathering into its own flask.',
    tip: 'Park Starlight drops on any bottle to break deadlocks, then collect all 4 Starlight units together.',
    sampleBottle: {
      id: 910,
      capacity: 4,
      layers: ['sapphire', 'starlight', 'starlight'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: null,
    },
  },
  {
    id: 'blending-cauldron',
    name: 'Elixir Blending Cauldron',
    introLevel: 221,
    chapter: 'Celestial Shelf',
    icon: '⚗',
    badgeLabel: 'Blending Cauldron',
    description:
      'A wide apothecary cauldron asks for two units each of two base potions in any order. Once all four units meet, they swirl into a radiant new elixir!',
    tip: 'The cauldron crest shows 4 ingredient pips—pour the two required colors in whatever order is easiest.',
    sampleBottle: {
      id: 911,
      capacity: 4,
      layers: ['ruby', 'sapphire'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: null,
      blend: { colors: ['ruby', 'sapphire'], perColor: 2, result: 'amethyst', brewed: false },
    },
  },
  {
    id: 'recipe-flask',
    name: 'Layered Recipe Flask',
    introLevel: 251,
    chapter: 'Eternal Apothecary',
    icon: '📜',
    badgeLabel: 'Recipe Flask',
    description:
      'A signature recipe flask displays four colored dots from bottom to top. Pour each matching potion in exact order to brew a layered masterpiece.',
    tip: 'Follow the glowing gold ring inside the recipe flask—it highlights the next color slot needed.',
    sampleBottle: {
      id: 912,
      capacity: 4,
      layers: ['sapphire'],
      hiddenCount: 0,
      hiddenIndices: [],
      locked: false,
      lockedByColor: null,
      frostMoves: 0,
      targetColor: null,
      stagingOnly: false,
      recipe: ['sapphire', 'emerald', 'ruby', 'amber'],
      blend: null,
    },
  },
];

export function getTwistById(id) {
  return TWIST_CATALOG.find((t) => t.id === id) || null;
}

export function getTwistAtIntroLevel(levelNum) {
  return TWIST_CATALOG.find((t) => t.introLevel === levelNum) || null;
}

/**
 * Hand-tuned Levels 1–10 for an effortless, joyful opening rhythm.
 * Each array lists bottle layers from bottom (index 0) to top (last index).
 */
export const HANDCRAFTED_LEVELS = {
  1: {
    subtitle: 'Tap a flask to lift, tap another to pour',
    bottles: [
      ['ruby', 'ruby', 'sapphire', 'sapphire'],
      ['sapphire', 'sapphire', 'ruby', 'ruby'],
      [],
    ],
  },
  2: {
    subtitle: 'Match the top colors to sort each elixir',
    bottles: [
      ['ruby', 'emerald', 'sapphire', 'ruby'],
      ['sapphire', 'ruby', 'emerald', 'sapphire'],
      ['emerald', 'sapphire', 'ruby', 'emerald'],
      [],
      [],
    ],
  },
  3: {
    bottles: [
      ['amber', 'amethyst', 'teal', 'amber'],
      ['teal', 'amber', 'amethyst', 'amethyst'],
      ['amethyst', 'teal', 'amber', 'teal'],
      [],
      [],
    ],
  },
  4: {
    bottles: [
      ['ruby', 'sapphire', 'emerald', 'amber'],
      ['amber', 'emerald', 'sapphire', 'ruby'],
      ['sapphire', 'ruby', 'amber', 'emerald'],
      ['emerald', 'amber', 'ruby', 'sapphire'],
      [],
      [],
    ],
  },
  5: {
    bottles: [
      ['amethyst', 'rose', 'teal', 'amber'],
      ['teal', 'amber', 'amethyst', 'rose'],
      ['rose', 'amethyst', 'amber', 'teal'],
      ['amber', 'teal', 'rose', 'amethyst'],
      [],
      [],
    ],
  },
  6: {
    bottles: [
      ['ruby', 'emerald', 'sapphire', 'amber'],
      ['amethyst', 'ruby', 'amber', 'emerald'],
      ['sapphire', 'amethyst', 'ruby', 'sapphire'],
      ['emerald', 'amber', 'amethyst', 'ruby'],
      ['amber', 'sapphire', 'emerald', 'amethyst'],
      [],
      [],
    ],
  },
  7: {
    bottles: [
      ['teal', 'rose', 'amber', 'amethyst'],
      ['sapphire', 'teal', 'amethyst', 'rose'],
      ['amber', 'sapphire', 'rose', 'teal'],
      ['rose', 'amber', 'sapphire', 'amethyst'],
      ['amethyst', 'teal', 'amber', 'sapphire'],
      [],
      [],
    ],
  },
  8: {
    bottles: [
      ['ruby', 'sapphire', 'teal', 'amber'],
      ['emerald', 'ruby', 'amber', 'sapphire'],
      ['teal', 'emerald', 'sapphire', 'ruby'],
      ['amber', 'teal', 'ruby', 'emerald'],
      ['sapphire', 'amber', 'emerald', 'teal'],
      [],
      [],
    ],
  },
  9: {
    bottles: [
      ['ruby', 'amethyst', 'emerald', 'coral'],
      ['sapphire', 'ruby', 'coral', 'amethyst'],
      ['emerald', 'sapphire', 'amethyst', 'ruby'],
      ['coral', 'emerald', 'ruby', 'sapphire'],
      ['amethyst', 'coral', 'sapphire', 'emerald'],
      [],
      [],
    ],
  },
  10: {
    bottles: [
      ['ruby', 'sapphire', 'emerald', 'amber'],
      ['amethyst', 'teal', 'ruby', 'sapphire'],
      ['emerald', 'amber', 'amethyst', 'teal'],
      ['teal', 'ruby', 'sapphire', 'emerald'],
      ['amber', 'amethyst', 'teal', 'ruby'],
      ['sapphire', 'emerald', 'amber', 'amethyst'],
      [],
      [],
    ],
  },
};
