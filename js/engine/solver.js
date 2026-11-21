/**
 * Moonlight Elixirs — Fast Canonical Best-First / A* Solver
 * Powers:
 *  - Gentle Hint button (finds a productive move in < 30ms)
 *  - Safe Shuffle verification
 *  - Level Generator solvability proof across all 12 twists
 */

import {
  applyPour,
  canPour,
  getPourCount,
  getTopColor,
  isBottleComplete,
  isBottleEmpty,
  isBottleLocked,
  isBottleUniform,
  isLevelWon,
} from './rules.js';

function canonicalKey(state) {
  const parts = state.bottles.map((b) => {
    const tags = [];
    if (b.locked) tags.push('L');
    if (b.lockedByColor) tags.push(`K${b.lockedByColor}`);
    if (b.frostMoves) tags.push(`F${b.frostMoves}`);
    if (b.stagingOnly) tags.push('S');
    if (b.targetColor) tags.push(`T${b.targetColor}`);
    if (b.recipe) tags.push(`R${b.recipe.join('.')}`);
    if (b.blend) tags.push(`B${b.blend.brewed ? 1 : 0}:${b.blend.colors.join('.')}`);
    if (b.hiddenCount) tags.push(`H${b.hiddenCount}`);
    if (b.hiddenIndices && b.hiddenIndices.length) tags.push(`I${b.hiddenIndices.join('.')}`);
    return `${b.capacity}${tags.join('')}:${b.layers.join(',')}`;
  });
  parts.sort();
  return parts.join('|');
}

/**
 * Lower score = closer to solved.
 */
function heuristic(state) {
  let score = 0;
  for (const b of state.bottles) {
    if (b.locked) score += 8;
    if (b.lockedByColor) score += 8;
    if (b.frostMoves > 0) score += b.frostMoves * 2;
    const hiddenTotal = (b.hiddenCount || 0) + (b.hiddenIndices ? b.hiddenIndices.length : 0);
    if (hiddenTotal > 0) score += hiddenTotal * 2;

    const len = b.layers.length;
    if (len === 0) continue;

    if (isBottleComplete(b)) {
      score -= b.recipe || b.blend ? 8 : 6;
      continue;
    }

    if (b.stagingOnly) {
      let transitions = 0;
      for (let i = 1; i < len; i++) {
        if (b.layers[i] !== b.layers[i - 1]) transitions++;
      }
      score += len * 1.5 + transitions * 4;
      continue;
    }

    if (b.recipe) {
      let matched = 0;
      for (let i = 0; i < len; i++) {
        if (b.layers[i] === b.recipe[i]) matched++;
        else break;
      }
      if (matched === len) {
        score -= matched * 3.5;
      } else {
        score += 6;
      }
      continue;
    }

    if (b.blend) {
      score -= len * 3.0;
      continue;
    }

    let transitions = 0;
    for (let i = 1; i < len; i++) {
      if (b.layers[i] !== b.layers[i - 1]) transitions++;
    }
    score += transitions * 5;
    if (transitions === 0) {
      score -= len * 1.2;
      if (b.targetColor && b.layers[0] === b.targetColor) score -= 2;
    } else if (b.targetColor && b.layers[0] !== b.targetColor) {
      score += 4;
    }
  }
  return score;
}

class MinHeap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(item) {
    this.items.push(item);
    this._up(this.items.length - 1);
  }
  pop() {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._down(0);
    }
    return top;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].priority <= this.items[i].priority) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.items.length;
    while (true) {
      let best = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < n && this.items[l].priority < this.items[best].priority) best = l;
      if (r < n && this.items[r].priority < this.items[best].priority) best = r;
      if (best === i) break;
      [this.items[i], this.items[best]] = [this.items[best], this.items[i]];
      i = best;
    }
  }
}

/**
 * Generates pruned candidate moves from a state.
 */
function getCandidateMoves(state) {
  const moves = [];
  const bottles = state.bottles;
  const n = bottles.length;

  for (let i = 0; i < n; i++) {
    const src = bottles[i];
    if (isBottleLocked(src) || src.layers.length === 0 || isBottleComplete(src)) continue;

    const srcUniform = isBottleUniform(src);
    const srcTop = getTopColor(src);
    const seenGenericEmpty = new Set();

    for (let j = 0; j < n; j++) {
      if (!canPour(state, i, j)) continue;
      const dst = bottles[j];
      const dstEmpty = isBottleEmpty(dst);
      const isSpecialDst = Boolean(dst.recipe || dst.blend || dst.targetColor);

      // Pruning 1: Never pour a uniform normal bottle into an identical/smaller generic empty bottle
      if (
        srcUniform &&
        dstEmpty &&
        !src.stagingOnly &&
        !dst.stagingOnly &&
        !isSpecialDst &&
        dst.capacity <= src.capacity
      ) {
        continue;
      }

      // Pruning 2: Only try one generic empty destination per (capacity + staging) bucket
      if (dstEmpty && !isSpecialDst) {
        const emptyKey = `${dst.capacity}:${dst.stagingOnly ? 'S' : 'N'}`;
        if (seenGenericEmpty.has(emptyKey)) continue;
        seenGenericEmpty.add(emptyKey);
      }

      // Pruning 3: Don't do a partial split of a uniform bottle into a non-empty generic bottle
      // unless it completes the destination or empties the source
      const count = getPourCount(src, dst);
      if (count <= 0) continue;
      if (
        srcUniform &&
        !dstEmpty &&
        !isSpecialDst &&
        !dst.stagingOnly &&
        srcTop !== 'starlight' &&
        count < src.layers.length &&
        dst.layers.length + count < dst.capacity
      ) {
        continue;
      }

      let moveBonus = 0;
      if (dst.recipe || dst.blend) {
        moveBonus -= dst.layers.length + count === dst.capacity ? 10 : 6;
      } else if (
        !dst.stagingOnly &&
        dst.layers.length + count === dst.capacity &&
        (dstEmpty || (isBottleUniform(dst) && getTopColor(dst) === srcTop))
      ) {
        moveBonus -= 10; // Completing a bottle
      } else if (src.stagingOnly && !dstEmpty && !dst.stagingOnly && getTopColor(dst) === srcTop) {
        moveBonus -= 4;
      } else if (!dstEmpty && !dst.stagingOnly && isBottleUniform(dst) && getTopColor(dst) === srcTop) {
        moveBonus -= 4;
      } else if (dstEmpty && dst.targetColor === srcTop) {
        moveBonus -= 5;
      }

      moves.push({ fromIdx: i, toIdx: j, moveBonus });
    }
  }

  return moves;
}

/**
 * Solves a puzzle state with greedy-weighted A* search.
 * @param {object} initialState
 * @param {object} [options]
 * @param {number} [options.maxNodes=4500]
 * @param {number} [options.weight=2.4]
 * @returns {{ solved: boolean, moves: Array<{fromIdx:number, toIdx:number}>, nodesExplored: number }}
 */
export function solveState(initialState, options = {}) {
  const maxNodes = options.maxNodes ?? 4500;
  const weight = options.weight ?? 2.4;

  if (isLevelWon(initialState)) {
    return { solved: true, moves: [], nodesExplored: 0 };
  }

  const visited = new Set();
  visited.add(canonicalKey(initialState));

  const heap = new MinHeap();
  heap.push({
    state: initialState,
    depth: 0,
    priority: heuristic(initialState) * weight,
    parent: null,
    move: null,
  });

  let nodesExplored = 0;

  while (heap.size > 0 && nodesExplored < maxNodes) {
    const node = heap.pop();
    nodesExplored++;

    const candidates = getCandidateMoves(node.state);
    for (const cand of candidates) {
      const res = applyPour(node.state, cand.fromIdx, cand.toIdx);
      if (!res) continue;

      if (res.won) {
        const moves = [{ fromIdx: cand.fromIdx, toIdx: cand.toIdx }];
        let cur = node;
        while (cur && cur.move) {
          moves.push(cur.move);
          cur = cur.parent;
        }
        moves.reverse();
        return { solved: true, moves, nodesExplored };
      }

      const key = canonicalKey(res.state);
      if (visited.has(key)) continue;
      visited.add(key);

      const nextDepth = node.depth + 1;
      const h = heuristic(res.state);
      heap.push({
        state: res.state,
        depth: nextDepth,
        priority: nextDepth + h * weight + cand.moveBonus * 0.35,
        parent: node,
        move: { fromIdx: cand.fromIdx, toIdx: cand.toIdx },
      });
    }
  }

  return { solved: false, moves: [], nodesExplored };
}

/**
 * Finds a single helpful next move for the Hint button.
 * Falls back to the best heuristic productive move if the board is already dead-ended.
 */
export function findHintMove(state) {
  const res = solveState(state, { maxNodes: 6000, weight: 2.8 });
  if (res.solved && res.moves.length > 0) {
    return { move: res.moves[0], solvable: true };
  }

  const cands = getCandidateMoves(state);
  if (cands.length > 0) {
    cands.sort((a, b) => a.moveBonus - b.moveBonus);
    return { move: { fromIdx: cands[0].fromIdx, toIdx: cands[0].toIdx }, solvable: false };
  }

  for (let i = 0; i < state.bottles.length; i++) {
    for (let j = 0; j < state.bottles.length; j++) {
      if (canPour(state, i, j)) {
        return { move: { fromIdx: i, toIdx: j }, solvable: false };
      }
    }
  }
  return { move: null, solvable: false };
}
