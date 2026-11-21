/**
 * Moonlight Elixirs — Core Pure Puzzle Rules Engine
 * Handles classic water sort rules plus 12 gradual apothecary twists:
 *  - Mystery Mist (hiddenCount) & Glass-Bottom Peek (hiddenIndices)
 *  - Ribboned / Sealed flasks (locked on filled) & Corked Empty Reserve (locked on empty)
 *  - Color-Keyed Seals (lockedByColor)
 *  - Melting Frost Runes (frostMoves)
 *  - Gemstone Crest (targetColor)
 *  - Variable flask capacities (3, 4, or 5 units) & Tasting Thimbles (2-unit stagingOnly cups)
 *  - Starlight Wildcard ('starlight' color)
 *  - Elixir Blending Cauldron (blend) & Layered Recipe Flask (recipe)
 */

export const MAX_EXTRA_BOTTLES = 2;

export function cloneBottle(b) {
  return {
    id: b.id,
    capacity: b.capacity,
    layers: b.layers.slice(),
    hiddenCount: b.hiddenCount || 0,
    hiddenIndices: Array.isArray(b.hiddenIndices) ? b.hiddenIndices.slice() : [],
    locked: Boolean(b.locked),
    lockedByColor: b.lockedByColor || null,
    frostMoves: b.frostMoves || 0,
    targetColor: b.targetColor || null,
    stagingOnly: Boolean(b.stagingOnly),
    recipe: Array.isArray(b.recipe) ? b.recipe.slice() : null,
    blend: b.blend
      ? {
          colors: b.blend.colors.slice(),
          perColor: b.blend.perColor,
          result: b.blend.result,
          brewed: Boolean(b.blend.brewed),
        }
      : null,
    isExtra: Boolean(b.isExtra),
  };
}

export function cloneState(state) {
  return {
    bottles: state.bottles.map(cloneBottle),
    extraAdded: state.extraAdded || 0,
    movesCount: state.movesCount || 0,
  };
}

export function isBottleEmpty(b) {
  return b.layers.length === 0;
}

export function isBottleLocked(b) {
  return Boolean(b.locked || b.lockedByColor || (b.frostMoves && b.frostMoves > 0));
}

export function isLayerHidden(b, idx) {
  if (idx < (b.hiddenCount || 0)) return true;
  return Array.isArray(b.hiddenIndices) && b.hiddenIndices.includes(idx);
}

export function hasHiddenLayers(b) {
  return (b.hiddenCount || 0) > 0 || (Array.isArray(b.hiddenIndices) && b.hiddenIndices.length > 0);
}

/**
 * Inspects a board state and returns an ordered list of active twist IDs matching TWIST_CATALOG.
 */
export function detectBoardTwists(state) {
  if (!state || !Array.isArray(state.bottles)) return [];
  const bottles = state.bottles;
  const found = [];

  if (bottles.some((b) => (b.hiddenCount || 0) > 0)) found.push('mystery-mist');
  if (bottles.some((b) => Array.isArray(b.hiddenIndices) && b.hiddenIndices.length > 0)) {
    found.push('reverse-mist');
  }
  if (bottles.some((b) => b.locked && b.layers.length > 0)) found.push('ribboned-flask');
  if (bottles.some((b) => b.locked && b.layers.length === 0)) found.push('corked-empty');
  if (bottles.some((b) => Boolean(b.lockedByColor))) found.push('color-seal');
  if (bottles.some((b) => (b.frostMoves || 0) > 0)) found.push('frost-runes');
  if (bottles.some((b) => Boolean(b.targetColor))) found.push('gemstone-crest');
  if (bottles.some((b) => b.capacity === 3 || b.capacity === 5)) found.push('apothecary-sizes');
  if (bottles.some((b) => Boolean(b.stagingOnly))) found.push('tasting-thimbles');
  if (bottles.some((b) => b.layers.includes('starlight'))) found.push('starlight');
  if (bottles.some((b) => Boolean(b.blend))) found.push('blending-cauldron');
  if (bottles.some((b) => Boolean(b.recipe))) found.push('recipe-flask');

  return found;
}

export function isBottleUniform(b) {
  if (b.layers.length === 0) return true;
  if (hasHiddenLayers(b)) return false;
  if (b.recipe) return false;
  if (b.blend && !b.blend.brewed) return false;
  const first = b.layers[0];
  for (let i = 1; i < b.layers.length; i++) {
    if (b.layers[i] !== first) return false;
  }
  return true;
}

export function isBottleComplete(b) {
  if (isBottleLocked(b)) return false;
  if (b.stagingOnly) return false;
  if (b.layers.length !== b.capacity) return false;
  if (hasHiddenLayers(b)) return false;

  if (b.recipe) {
    return b.recipe.length === b.layers.length && b.recipe.every((c, i) => b.layers[i] === c);
  }
  if (b.blend) {
    return Boolean(b.blend.brewed);
  }

  const first = b.layers[0];
  if (b.targetColor && b.targetColor !== first) return false;
  for (let i = 1; i < b.layers.length; i++) {
    if (b.layers[i] !== first) return false;
  }
  return true;
}

export function getTopColor(b) {
  if (b.layers.length === 0) return null;
  return b.layers[b.layers.length - 1];
}

/**
 * Number of contiguous visible matching layers at the top of a bottle.
 */
export function getTopVisibleRun(b) {
  const len = b.layers.length;
  if (len === 0) return 0;
  const top = b.layers[len - 1];
  let count = 1;
  for (let i = len - 2; i >= 0; i--) {
    if (isLayerHidden(b, i) || b.layers[i] !== top) break;
    count++;
  }
  return count;
}

export function canPour(state, fromIdx, toIdx) {
  if (fromIdx === toIdx) return false;
  const src = state.bottles[fromIdx];
  const dst = state.bottles[toIdx];
  if (!src || !dst) return false;
  if (isBottleLocked(src) || isBottleLocked(dst)) return false;
  if (src.layers.length === 0) return false;
  if (isBottleComplete(src)) return false;
  if (dst.layers.length >= dst.capacity) return false;

  const topColor = getTopColor(src);

  if (dst.recipe) {
    return topColor === dst.recipe[dst.layers.length];
  }

  if (dst.blend) {
    if (dst.blend.brewed) return false;
    if (!dst.blend.colors.includes(topColor)) return false;
    const currentCount = dst.layers.filter((c) => c === topColor).length;
    return currentCount < dst.blend.perColor;
  }

  if (dst.targetColor) {
    if (topColor !== dst.targetColor) return false;
    return dst.layers.length === 0 || getTopColor(dst) === topColor;
  }

  if (dst.layers.length === 0) return true;

  const dstTop = getTopColor(dst);
  return dstTop === topColor || topColor === 'starlight' || dstTop === 'starlight';
}

export function getPourCount(src, dst) {
  const run = getTopVisibleRun(src);
  const space = dst.capacity - dst.layers.length;
  const topColor = getTopColor(src);

  if (dst.recipe) {
    let recipeNeed = 0;
    for (let i = dst.layers.length; i < dst.recipe.length; i++) {
      if (dst.recipe[i] === topColor) recipeNeed++;
      else break;
    }
    return Math.min(run, space, recipeNeed);
  }

  if (dst.blend) {
    const currentCount = dst.layers.filter((c) => c === topColor).length;
    const need = Math.max(0, dst.blend.perColor - currentCount);
    return Math.min(run, space, need);
  }

  return Math.min(run, space);
}

/**
 * Applies a pour move immutably and returns rich metadata for animations, audio & UI feedback.
 */
export function applyPour(state, fromIdx, toIdx) {
  if (!canPour(state, fromIdx, toIdx)) {
    return null;
  }

  const next = cloneState(state);
  const src = next.bottles[fromIdx];
  const dst = next.bottles[toIdx];

  const color = getTopColor(src);
  const movedCount = getPourCount(src, dst);
  if (movedCount <= 0) return null;

  const wasDstComplete = isBottleComplete(dst);

  for (let i = 0; i < movedCount; i++) {
    dst.layers.push(src.layers.pop());
  }

  // Reveal newly uncovered mystery layers in source (bottom-up or middle-mist)
  let revealedInSource = false;
  if (src.hiddenCount > 0 && src.layers.length <= src.hiddenCount) {
    src.hiddenCount = Math.max(0, src.layers.length - 1);
    if (src.layers.length > 0) {
      revealedInSource = true;
    }
  }
  if (Array.isArray(src.hiddenIndices) && src.hiddenIndices.length > 0) {
    src.hiddenIndices = src.hiddenIndices.filter((idx) => idx < src.layers.length);
    if (src.layers.length > 0) {
      const newTopIdx = src.layers.length - 1;
      if (src.hiddenIndices.includes(newTopIdx)) {
        src.hiddenIndices = src.hiddenIndices.filter((idx) => idx !== newTopIdx);
        revealedInSource = true;
      }
    }
  }

  // Tick down any active Melting Frost Runes on the shelf
  const frostTickedIndices = [];
  const frostMeltedIndices = [];
  for (let i = 0; i < next.bottles.length; i++) {
    const b = next.bottles[i];
    if (b.frostMoves && b.frostMoves > 0) {
      b.frostMoves -= 1;
      frostTickedIndices.push(i);
      if (b.frostMoves === 0) {
        frostMeltedIndices.push(i);
      }
    }
  }

  // Check if Blending Cauldron just finished combining its base potions
  let brewedCauldronIdx = -1;
  if (dst.blend && !dst.blend.brewed && dst.layers.length === dst.capacity) {
    const allIngredientsReady = dst.blend.colors.every(
      (c) => dst.layers.filter((x) => x === c).length === dst.blend.perColor
    );
    if (allIngredientsReady) {
      dst.blend.brewed = true;
      dst.layers = Array(dst.capacity).fill(dst.blend.result);
      brewedCauldronIdx = toIdx;
    }
  }

  const completedNow = !wasDstComplete && isBottleComplete(dst);
  const unlockedBottleIndices = [];
  const unlockedDetails = [];

  if (completedNow) {
    const genericIdx = next.bottles.findIndex((b) => b.locked);
    if (genericIdx !== -1) {
      const wasEmpty = next.bottles[genericIdx].layers.length === 0;
      next.bottles[genericIdx].locked = false;
      unlockedBottleIndices.push(genericIdx);
      unlockedDetails.push({
        idx: genericIdx,
        kind: wasEmpty ? 'corked-empty' : 'ribbon',
        color: null,
      });
    }

    const completedColor = dst.recipe ? null : dst.layers[0];
    if (completedColor) {
      for (let i = 0; i < next.bottles.length; i++) {
        if (next.bottles[i].lockedByColor === completedColor) {
          next.bottles[i].lockedByColor = null;
          unlockedBottleIndices.push(i);
          unlockedDetails.push({
            idx: i,
            kind: 'color-seal',
            color: completedColor,
          });
        }
      }
    }
  }

  next.movesCount += 1;

  return {
    state: next,
    fromIdx,
    toIdx,
    color,
    movedCount,
    completedBottleIdx: completedNow ? toIdx : -1,
    unlockedBottleIdx: unlockedBottleIndices.length > 0 ? unlockedBottleIndices[0] : -1,
    unlockedBottleIndices,
    unlockedDetails,
    frostTickedIndices,
    frostMeltedIndices,
    brewedCauldronIdx,
    revealedInSource,
    won: isLevelWon(next),
  };
}

export function isLevelWon(state) {
  let hasNonEmpty = false;
  for (const b of state.bottles) {
    if (isBottleLocked(b)) return false;
    if (b.stagingOnly) {
      if (b.layers.length > 0) return false;
      continue;
    }
    if (b.layers.length === 0) continue;
    hasNonEmpty = true;
    if (!isBottleComplete(b)) return false;
  }
  return hasNonEmpty;
}

export function hasAnyValidMove(state) {
  const n = state.bottles.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (canPour(state, i, j)) return true;
    }
  }
  return false;
}

/**
 * Adds an empty extra flask for stress-free breathing room.
 */
export function addExtraBottle(state) {
  if ((state.extraAdded || 0) >= MAX_EXTRA_BOTTLES) return null;
  const next = cloneState(state);
  const maxCap = Math.max(4, ...next.bottles.map((b) => b.capacity));
  const nextId = next.bottles.reduce((m, b) => Math.max(m, b.id), -1) + 1;
  next.bottles.push({
    id: nextId,
    capacity: maxCap,
    layers: [],
    hiddenCount: 0,
    hiddenIndices: [],
    locked: false,
    lockedByColor: null,
    frostMoves: 0,
    targetColor: null,
    stagingOnly: false,
    recipe: null,
    blend: null,
    isExtra: true,
  });
  next.extraAdded = (next.extraAdded || 0) + 1;
  return next;
}

/**
 * Counts how many completed bottles exist in the state.
 */
export function countCompletedBottles(state) {
  let count = 0;
  for (const b of state.bottles) {
    if (isBottleComplete(b)) count++;
  }
  return count;
}
