/**
 * Moonlight Elixirs — Crisp SVG Potion Flask Renderer, Pour Animator & Sparkle Particle Canvas
 */

import { ALCHEMY_SYMBOLS, COLOR_LABELS } from '../engine/levels.js';
import { isBottleComplete, isBottleLocked, isLayerHidden } from '../engine/rules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Unlockable & special SVG bottle geometries in viewBox="0 0 100 220".
 * All rest cleanly on y=206 so shelf alignment and pouring geometry stay exact.
 */
const BOTTLE_SHAPES = {
  apothecary: {
    bodyPath:
      'M36 46 L64 46 L64 74 C80 86 88 106 88 142 C88 186 72 206 50 206 C28 206 12 186 12 142 C12 106 20 86 36 74 Z',
    rimRect: { x: 29, y: 38, w: 42, h: 10, rx: 5 },
    corkRect: { x: 37, y: 17, w: 26, h: 25, rx: 6 },
    highlightPath: 'M24 114 C19 132 19 156 26 176',
    highlightDot: 'M28 98 C26 101 25 104 25 106',
    liquidTopY: 78,
    liquidBottomY: 204,
    ribbonY: 136,
    crestY: 64,
  },
  vial: {
    bodyPath:
      'M26 42 L74 42 L74 176 C74 195 64 206 50 206 C36 206 26 195 26 176 Z',
    rimRect: { x: 20, y: 34, w: 60, h: 10, rx: 5 },
    corkRect: { x: 31, y: 15, w: 38, h: 23, rx: 6 },
    highlightPath: 'M34 62 L34 174',
    highlightDot: 'M34 50 L34 54',
    liquidTopY: 64,
    liquidBottomY: 204,
    ribbonY: 130,
    crestY: 54,
  },
  decanter: {
    bodyPath:
      'M37 46 L63 46 L63 72 L88 112 L82 186 L62 206 L38 206 L18 186 L12 112 L37 72 Z',
    rimRect: { x: 30, y: 38, w: 40, h: 10, rx: 4 },
    corkRect: { x: 38, y: 17, w: 24, h: 25, rx: 5 },
    highlightPath: 'M22 116 L26 178',
    highlightDot: 'M31 86 L25 100',
    liquidTopY: 78,
    liquidBottomY: 204,
    ribbonY: 140,
    crestY: 62,
  },
  jar: {
    bodyPath:
      'M28 52 L72 52 L72 68 C84 74 88 86 88 104 L88 182 C88 198 76 206 50 206 C24 206 12 198 12 182 L12 104 C12 86 16 74 28 68 Z',
    rimRect: { x: 22, y: 44, w: 56, h: 11, rx: 5 },
    corkRect: { x: 30, y: 24, w: 40, h: 24, rx: 6 },
    highlightPath: 'M22 96 L22 178',
    highlightDot: 'M22 82 L22 87',
    liquidTopY: 74,
    liquidBottomY: 204,
    ribbonY: 138,
    crestY: 63,
  },
  crescent: {
    bodyPath:
      'M38 46 L62 46 L62 72 C84 84 92 116 88 152 C84 186 68 206 48 206 C24 206 10 184 12 146 C14 114 28 96 38 72 Z',
    rimRect: { x: 31, y: 38, w: 38, h: 10, rx: 5 },
    corkRect: { x: 39, y: 17, w: 22, h: 25, rx: 6 },
    highlightPath: 'M22 126 C18 148 21 172 30 186',
    highlightDot: 'M29 108 C27 112 25 116 24 118',
    liquidTopY: 78,
    liquidBottomY: 204,
    ribbonY: 138,
    crestY: 63,
  },
  thimble: {
    bodyPath:
      'M18 118 L82 118 L84 180 C84 198 70 206 50 206 C30 206 16 198 16 180 Z',
    rimRect: { x: 12, y: 110, w: 76, h: 9, rx: 4 },
    corkRect: null,
    highlightPath: 'M24 134 L24 182',
    highlightDot: 'M24 124 L24 128',
    liquidTopY: 128,
    liquidBottomY: 204,
    ribbonY: 164,
    crestY: 112,
  },
  cauldron: {
    bodyPath:
      'M26 74 L74 74 L73 90 C88 102 93 128 89 162 C85 192 70 206 50 206 C30 206 15 192 11 162 C7 128 12 102 27 90 Z',
    rimRect: { x: 18, y: 65, w: 64, h: 11, rx: 5 },
    corkRect: { x: 29, y: 44, w: 42, h: 23, rx: 6 },
    highlightPath: 'M21 128 C18 152 21 174 30 188',
    highlightDot: 'M24 112 C23 116 22 119 22 121',
    liquidTopY: 96,
    liquidBottomY: 204,
    ribbonY: 146,
    crestY: 82,
  },
  vat: {
    viewBoxW: 148,
    viewBoxH: 220,
    bodyPath:
      'M52 44 L96 44 L98 62 C122 74 134 102 134 138 C134 180 114 196 74 196 C34 196 14 180 14 138 C14 102 26 74 50 62 Z',
    rimRect: { x: 40, y: 34, w: 68, h: 11, rx: 5 },
    corkRect: { x: 52, y: 14, w: 44, h: 24, rx: 6 },
    highlightPath: 'M30 106 C24 128 25 154 35 174',
    highlightDot: 'M35 88 C32 92 31 96 30 99',
    liquidTopY: 66,
    liquidBottomY: 194,
    ribbonY: 130,
    crestY: 56,
    cradle: true,
  },
};

function getEffectiveBottleShape(bottle, styleId) {
  if (bottle.pourOnly) return BOTTLE_SHAPES.vat;
  if (bottle.stagingOnly) return BOTTLE_SHAPES.thimble;
  if (bottle.blend) return BOTTLE_SHAPES.cauldron;
  return BOTTLE_SHAPES[styleId] || BOTTLE_SHAPES.apothecary;
}

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}

/**
 * Computes balanced 1- or 2-row layout and responsive bottle dimensions for iPad & phone screens.
 */
export function computeLayoutMetrics(bottleCount, stageWidth, stageHeight, hasGiantVat = false) {
  const isLandscape = stageWidth > stageHeight;
  const maxOneRow = isLandscape ? (hasGiantVat ? 6 : 7) : (hasGiantVat ? 4 : 5);
  const rows = bottleCount <= maxOneRow ? 1 : 2;
  const maxPerRow = rows === 1 ? bottleCount : Math.ceil(bottleCount / 2);

  const availW = Math.max(280, stageWidth - 48);
  const availH = Math.max(240, stageHeight - (rows === 2 ? 78 : 44));

  const gap = Math.max(12, Math.min(34, Math.floor(availW / (maxPerRow * 4.8))));
  const effectiveCols = maxPerRow + (hasGiantVat ? 0.5 : 0);
  const maxWByWidth = (availW - gap * (maxPerRow - 1) - 32) / effectiveCols;
  const maxHByHeight = rows === 1 ? availH * 0.78 : (availH - 36) / 2;
  const maxWByHeight = maxHByHeight / 2.22;

  const bottleW = Math.max(50, Math.min(118, Math.floor(Math.min(maxWByWidth, maxWByHeight))));
  const bottleH = Math.floor(bottleW * 2.2);

  return { rows, maxPerRow, bottleW, bottleH, gap };
}

/**
 * Shared SVG builder for both live shelf slots and Twist Discovery popup previews.
 */
function buildBottleSvg(bottle, idPrefix, options) {
  const { styleId, showSymbols = false, forceShowCork = false } = options;
  const shape = getEffectiveBottleShape(bottle, styleId);
  const vbW = shape.viewBoxW || 100;
  const vbH = shape.viewBoxH || 220;
  const cx = vbW / 2;
  const clipId = `${idPrefix}-clip`;
  const corkGradId = `${idPrefix}-cork`;
  const starGradId = `${idPrefix}-star`;

  const svg = el('svg', {
    class: 'bottle-svg',
    viewBox: `0 0 ${vbW} ${vbH}`,
    'aria-hidden': 'true',
  });

  // Defs
  const defs = el('defs');
  const clipPath = el('clipPath', { id: clipId });
  clipPath.appendChild(el('path', { d: shape.bodyPath }));
  defs.appendChild(clipPath);

  const corkGrad = el('linearGradient', { id: corkGradId, x1: '0', y1: '0', x2: '1', y2: '0' });
  corkGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#92623f' }));
  corkGrad.appendChild(el('stop', { offset: '45%', 'stop-color': '#c79367' }));
  corkGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#784d2f' }));
  defs.appendChild(corkGrad);

  const starGrad = el('linearGradient', { id: starGradId, x1: '0', y1: '0', x2: '1', y2: '1' });
  starGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#d4f1ff' }));
  starGrad.appendChild(el('stop', { offset: '52%', 'stop-color': '#f5d5ff' }));
  starGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#fff0b3' }));
  defs.appendChild(starGrad);

  svg.appendChild(defs);

  // 1. Wooden Cork (shown when complete or when Corked Empty Reserve is locked)
  if (shape.corkRect) {
    const corkGroup = el('g', { class: 'bottle-cork' });
    if (forceShowCork) {
      corkGroup.style.opacity = '1';
      corkGroup.style.transform = 'translateY(0)';
    }
    corkGroup.appendChild(
      el('rect', {
        x: shape.corkRect.x,
        y: shape.corkRect.y,
        width: shape.corkRect.w,
        height: shape.corkRect.h,
        rx: shape.corkRect.rx,
        fill: `url(#${corkGradId})`,
        stroke: 'rgba(60,34,16,0.45)',
        'stroke-width': '1.5',
      })
    );
    corkGroup.appendChild(
      el('rect', {
        x: shape.corkRect.x + 5,
        y: shape.corkRect.y + 4,
        width: 5,
        height: shape.corkRect.h - 8,
        rx: 2.5,
        fill: 'rgba(255,230,200,0.28)',
      })
    );
    svg.appendChild(corkGroup);
  }

  // 2. Liquid layers clipped strictly to glass interior
  const liqGroup = el('g', { 'clip-path': `url(#${clipId})`, class: 'liquid-group' });
  const totalFillH = shape.liquidBottomY - shape.liquidTopY;
  const unitH = totalFillH / bottle.capacity;

  for (let i = 0; i < bottle.layers.length; i++) {
    const colorId = bottle.layers[i];
    const isHidden = isLayerHidden(bottle, i);
    const segBottom = shape.liquidBottomY - i * unitH;
    const segTop = segBottom - unitH;

    const fillVal = isHidden
      ? 'var(--mystery-bg)'
      : colorId === 'starlight'
        ? `url(#${starGradId})`
        : `var(--p-${colorId})`;

    // Tiny +1px overlap prevents hairline seams between identical layers
    const rect = el('rect', {
      class: 'liquid-segment',
      'data-layer-index': i,
      x: 4,
      y: segTop - 0.5,
      width: vbW - 8,
      height: unitH + 1.2,
      fill: fillVal,
    });
    liqGroup.appendChild(rect);

    if (isHidden) {
      liqGroup.appendChild(
        el('line', {
          x1: 10,
          y1: segTop,
          x2: vbW - 10,
          y2: segTop,
          stroke: 'var(--mystery-stroke)',
          'stroke-width': '1.2',
          'stroke-dasharray': '4 3',
        })
      );
      liqGroup.appendChild(
        el('line', {
          x1: 10,
          y1: segBottom,
          x2: vbW - 10,
          y2: segBottom,
          stroke: 'var(--mystery-stroke)',
          'stroke-width': '1.2',
          'stroke-dasharray': '4 3',
        })
      );
      const q = el('text', {
        class: 'mystery-q',
        x: cx,
        y: segTop + unitH / 2 + 1,
      });
      q.textContent = '?';
      liqGroup.appendChild(q);
    } else {
      const prevColor = i > 0 ? bottle.layers[i - 1] : null;
      const prevHidden = i > 0 ? isLayerHidden(bottle, i - 1) : false;
      if (i > 0 && (prevColor !== colorId || prevHidden)) {
        liqGroup.appendChild(
          el('line', {
            x1: 10,
            y1: segBottom,
            x2: vbW - 10,
            y2: segBottom,
            stroke: 'rgba(0,0,0,0.14)',
            'stroke-width': '1',
          })
        );
      }

      if (colorId === 'starlight') {
        const star = el('text', {
          class: 'starlight-glyph',
          'data-layer-index': i,
          x: cx,
          y: segTop + unitH / 2,
        });
        star.textContent = ALCHEMY_SYMBOLS.starlight || '✧';
        liqGroup.appendChild(star);
      } else if (showSymbols) {
        const sym = el('text', {
          class: 'liquid-symbol',
          'data-layer-index': i,
          x: cx,
          y: segTop + unitH / 2,
        });
        sym.textContent = ALCHEMY_SYMBOLS[colorId] || '•';
        liqGroup.appendChild(sym);
      }
    }
  }

  // Meniscus surface glow on topmost liquid layer
  if (bottle.layers.length > 0) {
    const topIdx = bottle.layers.length - 1;
    const topColor = bottle.layers[topIdx];
    const topY = shape.liquidBottomY - bottle.layers.length * unitH;
    const isTopHidden = isLayerHidden(bottle, topIdx);

    liqGroup.appendChild(
      el('ellipse', {
        class: 'liquid-meniscus',
        cx,
        cy: topY,
        rx: vbW * 0.38,
        ry: 4.5,
        fill: isTopHidden ? 'rgba(255,255,255,0.22)' : `var(--p-${topColor}-hi)`,
        opacity: '0.72',
      })
    );

    if (bottle.layers.length >= 2) {
      liqGroup.appendChild(
        el('circle', {
          cx: cx - 14 + ((bottle.id * 7) % 10),
          cy: shape.liquidBottomY - unitH * 0.7,
          r: 2.6,
          fill: 'rgba(255,255,255,0.28)',
        })
      );
      liqGroup.appendChild(
        el('circle', {
          cx: cx + 10 - ((bottle.id * 5) % 8),
          cy: shape.liquidBottomY - unitH * 1.45,
          r: 1.9,
          fill: 'rgba(255,255,255,0.24)',
        })
      );
    }
  }
  svg.appendChild(liqGroup);

  // 2b. Heavy Brass & Timber Cradle + Graduation Ticks for Grand Elixir Vat
  if (shape.cradle) {
    const cradleGroup = el('g', { class: 'vat-cradle', style: 'pointer-events:none;' });
    cradleGroup.appendChild(
      el('path', {
        d: 'M24 180 L18 206 L36 206 L44 190 Z',
        fill: '#8b5e34',
        stroke: '#f3c677',
        'stroke-width': '1.6',
        'stroke-linejoin': 'round',
      })
    );
    cradleGroup.appendChild(
      el('path', {
        d: 'M124 180 L130 206 L112 206 L104 190 Z',
        fill: '#8b5e34',
        stroke: '#f3c677',
        'stroke-width': '1.6',
        'stroke-linejoin': 'round',
      })
    );
    cradleGroup.appendChild(
      el('path', {
        d: 'M20 176 Q74 202 128 176',
        fill: 'none',
        stroke: '#f3c677',
        'stroke-width': '3.5',
        'stroke-linecap': 'round',
      })
    );
    cradleGroup.appendChild(
      el('path', {
        d: 'M18 140 Q74 152 130 140',
        fill: 'none',
        stroke: 'rgba(243, 198, 119, 0.45)',
        'stroke-width': '2',
        'stroke-linecap': 'round',
      })
    );
    for (let t = 1; t < bottle.capacity; t++) {
      const ty = shape.liquidBottomY - t * unitH;
      const isMajor = t % (bottle.capacity / 2) === 0;
      cradleGroup.appendChild(
        el('line', {
          x1: 21,
          y1: ty,
          x2: isMajor ? 31 : 27,
          y2: ty,
          stroke: 'var(--glass-highlight)',
          'stroke-width': isMajor ? '1.6' : '1.1',
          opacity: isMajor ? '0.68' : '0.42',
          'stroke-linecap': 'round',
        })
      );
    }
    svg.appendChild(cradleGroup);
  }

  // 3. Glass Body Outline, Rim & Specular Reflections
  svg.appendChild(
    el('path', {
      d: shape.bodyPath,
      fill: 'var(--glass-fill)',
      stroke: 'var(--glass-stroke)',
      'stroke-width': '3.4',
      'stroke-linejoin': 'round',
    })
  );

  svg.appendChild(
    el('rect', {
      x: shape.rimRect.x,
      y: shape.rimRect.y,
      width: shape.rimRect.w,
      height: shape.rimRect.h,
      rx: shape.rimRect.rx,
      fill: 'var(--glass-fill)',
      stroke: 'var(--glass-stroke)',
      'stroke-width': '2.6',
    })
  );

  svg.appendChild(
    el('path', {
      d: shape.highlightPath,
      fill: 'none',
      stroke: 'var(--glass-highlight)',
      'stroke-width': '3.5',
      'stroke-linecap': 'round',
    })
  );
  svg.appendChild(
    el('path', {
      d: shape.highlightDot,
      fill: 'none',
      stroke: 'var(--glass-highlight)',
      'stroke-width': '3',
      'stroke-linecap': 'round',
    })
  );

  // 4. Layered Recipe Flask guide gems
  if (Array.isArray(bottle.recipe)) {
    const recipeGroup = el('g', { class: 'recipe-guides', style: 'pointer-events:none;' });
    for (let i = 0; i < bottle.recipe.length; i++) {
      const yMid = shape.liquidBottomY - i * unitH - unitH / 2;
      const filled = i < bottle.layers.length;
      const isNext = i === bottle.layers.length;
      const rColor = bottle.recipe[i];

      recipeGroup.appendChild(
        el('circle', {
          cx: 50,
          cy: yMid,
          r: isNext ? 8.5 : 6.5,
          fill: `var(--p-${rColor})`,
          stroke: filled ? '#ffffff' : isNext ? 'var(--accent-strong)' : 'rgba(255,255,255,0.62)',
          'stroke-width': isNext ? 2.4 : 1.5,
          opacity: filled ? '0.32' : '0.96',
        })
      );

      if (isNext) {
        recipeGroup.appendChild(
          el('circle', {
            cx: 50,
            cy: yMid,
            r: 11.5,
            fill: 'none',
            stroke: 'var(--accent-strong)',
            'stroke-width': '1.4',
            'stroke-dasharray': '3 2',
          })
        );
      }

      if (showSymbols && !filled) {
        const sym = el('text', {
          x: 50,
          y: yMid + 0.5,
          fill: '#ffffff',
          'font-size': isNext ? '9' : '7.5',
          'font-weight': '700',
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        });
        sym.textContent = ALCHEMY_SYMBOLS[rColor] || '';
        recipeGroup.appendChild(sym);
      }
    }
    svg.appendChild(recipeGroup);
  }

  // 5. Elixir Blending Cauldron ingredient tracker badge
  if (bottle.blend && !bottle.blend.brewed) {
    const [cA, cB] = bottle.blend.colors;
    const countA = bottle.layers.filter((c) => c === cA).length;
    const countB = bottle.layers.filter((c) => c === cB).length;
    const badge = el('g', { style: 'pointer-events:none;' });

    badge.appendChild(
      el('rect', {
        x: 17,
        y: 124,
        width: 66,
        height: 24,
        rx: 12,
        fill: 'rgba(20, 15, 32, 0.88)',
        stroke: 'var(--accent)',
        'stroke-width': '1.5',
      })
    );

    const pips = [
      { x: 28, color: cA, lit: countA >= 1 },
      { x: 40, color: cA, lit: countA >= 2 },
      { x: 60, color: cB, lit: countB >= 1 },
      { x: 72, color: cB, lit: countB >= 2 },
    ];
    for (const p of pips) {
      badge.appendChild(
        el('circle', {
          cx: p.x,
          cy: 136,
          r: 4.8,
          fill: `var(--p-${p.color})`,
          opacity: p.lit ? '1' : '0.35',
          stroke: p.lit ? '#ffffff' : 'rgba(255,255,255,0.45)',
          'stroke-width': p.lit ? '1.5' : '0.8',
        })
      );
    }
    svg.appendChild(badge);
  }

  // 6. Color-Keyed Gemstone Crest (when targetColor is set)
  if (bottle.targetColor) {
    const crest = el('g', { class: 'crest-badge' });
    const cy = shape.crestY;
    const crestR = bottle.pourOnly ? 13 : 11;
    const gemR = bottle.pourOnly ? 8 : 6.5;
    crest.appendChild(
      el('circle', {
        cx,
        cy,
        r: crestR,
        fill: 'var(--surface-strong)',
        stroke: 'var(--accent)',
        'stroke-width': '2',
      })
    );
    crest.appendChild(
      el('circle', {
        cx,
        cy,
        r: gemR,
        fill: `var(--p-${bottle.targetColor})`,
      })
    );
    if (showSymbols) {
      const sym = el('text', {
        x: cx,
        y: cy + 0.5,
        fill: '#fff',
        'font-size': bottle.pourOnly ? '9.5' : '8.5',
        'font-weight': '700',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      sym.textContent = ALCHEMY_SYMBOLS[bottle.targetColor] || '';
      crest.appendChild(sym);
    }
    svg.appendChild(crest);
  }

  // Subtle downward pour-in cue on an empty Grand Vat
  if (bottle.pourOnly && bottle.layers.length === 0) {
    const cue = el('text', {
      x: cx,
      y: 126,
      fill: 'var(--accent)',
      'font-size': '18',
      'font-weight': '700',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      opacity: '0.68',
      style: 'pointer-events:none;',
    });
    cue.textContent = '▾';
    svg.appendChild(cue);
  }

  // 7. Locks & Seals (Ribboned/Corked, Color-Keyed Seal, or Melting Frost Runes)
  if (bottle.locked) {
    const rib = el('g', { class: 'ribbon-group' });
    const ry = shape.ribbonY;
    rib.appendChild(
      el('rect', {
        x: 11,
        y: ry - 9,
        width: 78,
        height: 18,
        rx: 5,
        fill: '#8e2c48',
        stroke: '#f3c677',
        'stroke-width': '1.6',
      })
    );
    rib.appendChild(
      el('circle', {
        cx: 50,
        cy: ry,
        r: 12,
        fill: '#b5385a',
        stroke: '#f6d58e',
        'stroke-width': '2',
      })
    );
    const seal = el('text', {
      x: 50,
      y: ry + 0.5,
      fill: '#fce4a6',
      'font-size': '11',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    seal.textContent = '✦';
    rib.appendChild(seal);
    svg.appendChild(rib);
  } else if (bottle.lockedByColor) {
    const sealGroup = el('g', { class: 'ribbon-group' });
    const ry = shape.ribbonY;
    sealGroup.appendChild(
      el('rect', {
        x: 11,
        y: ry - 9,
        width: 78,
        height: 18,
        rx: 5,
        fill: '#261d34',
        stroke: `var(--p-${bottle.lockedByColor})`,
        'stroke-width': '2',
      })
    );
    sealGroup.appendChild(
      el('circle', {
        cx: 50,
        cy: ry,
        r: 12,
        fill: '#261d34',
        stroke: '#f6d58e',
        'stroke-width': '2',
      })
    );
    sealGroup.appendChild(
      el('circle', {
        cx: 50,
        cy: ry,
        r: 7,
        fill: `var(--p-${bottle.lockedByColor})`,
      })
    );
    if (showSymbols) {
      const sym = el('text', {
        x: 50,
        y: ry + 0.5,
        fill: '#ffffff',
        'font-size': '8.5',
        'font-weight': '700',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      sym.textContent = ALCHEMY_SYMBOLS[bottle.lockedByColor] || '';
      sealGroup.appendChild(sym);
    }
    svg.appendChild(sealGroup);
  } else if (bottle.frostMoves && bottle.frostMoves > 0) {
    const frostGroup = el('g', { class: 'frost-group' });
    const ry = shape.ribbonY;
    frostGroup.appendChild(
      el('path', {
        d: shape.bodyPath,
        fill: 'rgba(176, 232, 255, 0.16)',
        stroke: 'rgba(220, 246, 255, 0.72)',
        'stroke-width': '2.2',
      })
    );
    frostGroup.appendChild(
      el('rect', {
        x: 12,
        y: ry - 12,
        width: 76,
        height: 24,
        rx: 8,
        fill: 'rgba(182, 234, 255, 0.92)',
        stroke: '#ffffff',
        'stroke-width': '1.8',
      })
    );
    const fText = el('text', {
      x: 50,
      y: ry + 1,
      fill: '#133b56',
      'font-size': '13',
      'font-weight': '800',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    fText.textContent = `❄ ${bottle.frostMoves}`;
    frostGroup.appendChild(fText);
    svg.appendChild(frostGroup);
  }

  return svg;
}

/**
 * Builds an interactive SVG potion flask element for a bottle state on the shelf.
 */
export function createBottleElement(bottle, idx, options) {
  const { styleId, showSymbols, selected, hintRole, hasVariableCap } = options;
  const complete = isBottleComplete(bottle);
  const locked = isBottleLocked(bottle);

  const slot = document.createElement('div');
  slot.className = 'bottle-slot';
  slot.dataset.index = String(idx);
  slot.setAttribute('role', 'button');
  slot.setAttribute('tabindex', '0');
  slot.setAttribute(
    'aria-label',
    `Flask ${idx + 1}, ${locked ? 'sealed' : complete ? 'completed' : `${bottle.layers.length} of ${bottle.capacity} filled`}`
  );

  if (selected) slot.classList.add('selected');
  if (complete) slot.classList.add('completed');
  if (locked) slot.classList.add('locked');
  if (bottle.locked && bottle.layers.length === 0) slot.classList.add('locked-empty');
  if (bottle.stagingOnly) slot.classList.add('staging-cup');
  if (bottle.pourOnly) slot.classList.add('giant-vat');
  if (bottle.recipe) slot.classList.add('recipe-flask');
  if (bottle.blend) slot.classList.add('cauldron-flask');
  if (bottle.capacity === 3) slot.classList.add('cap-3');
  if (bottle.capacity === 5) slot.classList.add('cap-5');
  if (bottle.capacity === 6) slot.classList.add('cap-6');
  if (hintRole === 'source') slot.classList.add('hint-source');
  if (hintRole === 'target') slot.classList.add('hint-target');

  const svg = buildBottleSvg(bottle, `flask-${idx}-${bottle.id}`, {
    styleId,
    showSymbols,
  });
  slot.appendChild(svg);

  // Subtle vessel / capacity badges
  let pillText = null;
  if (bottle.pourOnly) {
    pillText = `${bottle.layers.length}/${bottle.capacity}`;
  } else if (bottle.stagingOnly) {
    pillText = '2u Cup';
  } else if (bottle.recipe && !complete) {
    pillText = 'Recipe';
  } else if (bottle.blend) {
    const resName = COLOR_LABELS[bottle.blend.result] || 'Blend';
    pillText = bottle.blend.brewed ? resName : `→ ${resName}`;
  } else if (hasVariableCap && bottle.capacity !== 4) {
    pillText = `${bottle.capacity}`;
  }

  if (pillText) {
    const pill = document.createElement('span');
    pill.className = 'cap-pill';
    pill.textContent = pillText;
    slot.appendChild(pill);
  }

  return slot;
}

/**
 * Renders a crisp preview SVG for the First-Time Twist Discovery popup modal.
 */
export function createTwistPreviewSvg(sampleBottle, styleId, showSymbols = false) {
  const complete = isBottleComplete(sampleBottle);
  const corkedEmpty = Boolean(sampleBottle.locked && sampleBottle.layers.length === 0);
  const svg = buildBottleSvg(sampleBottle, `twist-prev-${sampleBottle.id}`, {
    styleId,
    showSymbols,
    forceShowCork: complete || corkedEmpty,
  });
  svg.setAttribute('class', 'twist-preview-svg');
  return svg;
}

/**
 * Renders a crisp miniature preview SVG of a bottle style for the Collection tab
 * (filled with 3 sample potion layers from the active palette + cork).
 */
export function createBottlePreviewSvg(styleId) {
  const sample = {
    id: 888,
    capacity: 4,
    layers: ['amethyst', 'teal', 'amber'],
    hiddenCount: 0,
    hiddenIndices: [],
    locked: false,
    lockedByColor: null,
    frostMoves: 0,
    targetColor: null,
    stagingOnly: false,
    recipe: null,
    blend: null,
  };
  const svg = buildBottleSvg(sample, `preview-${styleId}`, {
    styleId,
    showSymbols: false,
    forceShowCork: true,
  });
  svg.setAttribute('class', 'bottle-preview-svg');
  return svg;
}

/**
 * Refreshes an existing bottle slot's SVG & completion classes in place,
 * preserving active pouring transforms and animating newly seated corks cleanly.
 */
export function updateBottleSlotVisual(slot, bottle, idx, options) {
  if (!slot) return;
  const wasCompleted = slot.classList.contains('completed');
  const fresh = createBottleElement(bottle, idx, options);
  const nowCompleted = fresh.classList.contains('completed');
  const preservePouring = slot.classList.contains('pouring-source');
  const preserveTransform = slot.style.transform;

  slot.className = fresh.className;
  if (!wasCompleted && nowCompleted) {
    // Allow cork drop-in CSS transition to animate smoothly on the next frame
    slot.classList.remove('completed');
  }
  if (preservePouring) {
    slot.classList.add('pouring-source');
    slot.style.transform = preserveTransform;
  }
  slot.setAttribute('aria-label', fresh.getAttribute('aria-label'));
  slot.replaceChildren(...fresh.childNodes);

  if (!wasCompleted && nowCompleted) {
    requestAnimationFrame(() => {
      slot.classList.add('completed');
    });
  }
}

/**
 * Animates a physical, rim-to-rim pouring sequence across any combination of bottle shapes.
 */
export function animatePourSequence(params) {
  const {
    srcSlot,
    dstSlot,
    srcBottle,
    dstBottle,
    colorId,
    movedCount,
    styleId,
    onPourStart,
  } = params;

  return new Promise((resolve) => {
    if (!srcSlot || !dstSlot || !srcBottle || !dstBottle) {
      if (onPourStart) onPourStart();
      resolve();
      return;
    }

    const srcShape = getEffectiveBottleShape(srcBottle, styleId);
    const dstShape = getEffectiveBottleShape(dstBottle, styleId);
    const srcVbW = srcShape.viewBoxW || 100;
    const srcVbH = srcShape.viewBoxH || 220;
    const dstVbW = dstShape.viewBoxW || 100;
    const dstVbH = dstShape.viewBoxH || 220;
    const srcMouthNormY = (srcShape.rimRect.y + srcShape.rimRect.h * 0.5) / srcVbH;
    const dstMouthNormY = (dstShape.rimRect.y + dstShape.rimRect.h * 0.5) / dstVbH;

    // 1. Measure exact untransformed resting rect of srcSlot without visual jump
    const wasSelected = srcSlot.classList.contains('selected');
    srcSlot.style.transition = 'none';
    srcSlot.classList.remove('selected');
    srcSlot.style.transform = '';
    const srcRestRect = srcSlot.getBoundingClientRect();
    const dstRect = dstSlot.getBoundingClientRect();

    // Set pivot directly at the source flask mouth so rotating swings the body cleanly to the side
    srcSlot.style.transformOrigin = `50% ${(srcMouthNormY * 100).toFixed(2)}%`;
    if (wasSelected) {
      srcSlot.style.transform = 'translate(0px, -24px) scale(1.04)';
    }
    void srcSlot.offsetWidth;

    // 2. Choose approach side (avoiding viewport edge clipping on iPad Portrait/Landscape)
    const dstMouthX = dstRect.left + dstRect.width * 0.5;
    const dstMouthY = dstRect.top + dstRect.height * dstMouthNormY;

    let pourFromRight = srcRestRect.left >= dstRect.left;
    const neededSideSpace = srcRestRect.height * 0.88;
    if (pourFromRight && dstMouthX + neededSideSpace > window.innerWidth - 10) {
      pourFromRight = false;
    } else if (!pourFromRight && dstMouthX - neededSideSpace < 10) {
      pourFromRight = true;
    }

    // Position the pouring flask's mouth right beside/above the destination vessel's rim
    const goalMouthX = dstMouthX + (pourFromRight ? dstRect.width * 0.20 : -dstRect.width * 0.20);
    const goalMouthY = dstMouthY - dstRect.height * 0.085;

    const srcMouthRestX = srcRestRect.left + srcRestRect.width * 0.5;
    const srcMouthRestY = srcRestRect.top + srcRestRect.height * srcMouthNormY;
    const dx = goalMouthX - srcMouthRestX;
    const dy = goalMouthY - srcMouthRestY;

    const startTilt = pourFromRight ? -78 : 78;
    const endTilt = pourFromRight ? -102 : 102;

    srcSlot.classList.add('pouring-source');
    srcSlot.style.transition = 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)';

    requestAnimationFrame(() => {
      srcSlot.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${startTilt}deg)`;
    });

    const streamOverlay = document.getElementById('pour-stream-overlay');
    let streamGroup = null;
    let streamPath = null;
    let streamShine = null;
    let splashDot = null;
    if (streamOverlay) {
      streamGroup = el('g');
      streamPath = el('path', { class: 'pour-stream-path', d: '' });
      streamShine = el('path', { class: 'pour-stream-shine', d: '' });
      splashDot = el('ellipse', { class: 'pour-splash-dot', cx: 0, cy: 0, rx: 8, ry: 3 });
      streamGroup.appendChild(streamPath);
      streamGroup.appendChild(streamShine);
      streamGroup.appendChild(splashDot);
      streamOverlay.appendChild(streamGroup);
    }

    const srcTotalFillH = srcShape.liquidBottomY - srcShape.liquidTopY;
    const dstTotalFillH = dstShape.liquidBottomY - dstShape.liquidTopY;
    const srcUnitH = srcTotalFillH / srcBottle.capacity;
    const dstUnitH = dstTotalFillH / dstBottle.capacity;

    const srcStartLen = srcBottle.layers.length;
    const srcEndLen = srcStartLen - movedCount;
    const srcStartTopY = srcShape.liquidBottomY - srcStartLen * srcUnitH;
    const srcEndTopY = srcShape.liquidBottomY - srcEndLen * srcUnitH;

    const dstStartLen = dstBottle.layers.length;
    const dstEndLen = dstStartLen + movedCount;
    const dstStartTopY = dstShape.liquidBottomY - dstStartLen * dstUnitH;
    const dstEndTopY = dstShape.liquidBottomY - dstEndLen * dstUnitH;

    const travelMs = 240;
    const pourMs = Math.min(580, 320 + movedCount * 80);
    const returnMs = 250;

    setTimeout(() => {
      if (!srcSlot.isConnected || !dstSlot.isConnected) {
        if (streamGroup) streamGroup.remove();
        resolve();
        return;
      }
      if (onPourStart) onPourStart();

      srcSlot.style.transition = 'none';

      const srcLiqGroup = srcSlot.querySelector('.liquid-group');
      let srcDrainRect = null;
      let srcNeckFlow = null;
      let srcLiveMeniscus = null;

      if (srcLiqGroup) {
        for (let i = srcEndLen; i < srcStartLen; i++) {
          srcLiqGroup.querySelectorAll(`[data-layer-index="${i}"]`).forEach((n) => {
            n.style.opacity = '0';
          });
        }
        const staticMen = srcLiqGroup.querySelector('.liquid-meniscus');
        if (staticMen) staticMen.style.opacity = '0';

        const neckW = Math.max(12, srcShape.rimRect.w * 0.42);
        srcNeckFlow = el('rect', {
          x: srcVbW / 2 - neckW / 2,
          y: srcShape.rimRect.y,
          width: neckW,
          height: Math.max(4, srcStartTopY - srcShape.rimRect.y + 6),
          fill: `var(--p-${colorId})`,
          opacity: '0.94',
        });
        srcDrainRect = el('rect', {
          x: 4,
          y: srcStartTopY - 0.5,
          width: srcVbW - 8,
          height: Math.max(0, srcEndTopY - srcStartTopY + 1.4),
          fill: `var(--p-${colorId})`,
        });
        srcLiveMeniscus = el('ellipse', {
          cx: srcVbW / 2,
          cy: srcStartTopY,
          rx: srcVbW * 0.38,
          ry: 4.5,
          fill: `var(--p-${colorId}-hi)`,
          opacity: '0.75',
        });

        srcLiqGroup.appendChild(srcNeckFlow);
        srcLiqGroup.appendChild(srcDrainRect);
        srcLiqGroup.appendChild(srcLiveMeniscus);
      }

      const dstLiqGroup = dstSlot.querySelector('.liquid-group');
      let dstRiseRect = null;
      let dstLiveMeniscus = null;
      let dstRippleRing = null;

      if (dstLiqGroup) {
        const oldMen = dstLiqGroup.querySelector('.liquid-meniscus');
        if (oldMen) oldMen.style.opacity = '0';

        dstRiseRect = el('rect', {
          x: 4,
          y: dstStartTopY,
          width: dstVbW - 8,
          height: 0,
          fill: `var(--p-${colorId})`,
        });
        dstLiveMeniscus = el('ellipse', {
          cx: dstVbW / 2,
          cy: dstStartTopY,
          rx: dstVbW * 0.38,
          ry: 4.5,
          fill: `var(--p-${colorId}-hi)`,
          opacity: '0.82',
        });
        dstRippleRing = el('ellipse', {
          cx: dstVbW / 2,
          cy: dstStartTopY,
          rx: 12,
          ry: 3,
          fill: 'none',
          stroke: 'rgba(255,255,255,0.6)',
          'stroke-width': '1.6',
          opacity: '0',
        });

        dstLiqGroup.appendChild(dstRiseRect);
        dstLiqGroup.appendChild(dstLiveMeniscus);
        dstLiqGroup.appendChild(dstRippleRing);
      }

      const streamWidth = Math.max(5, Math.min(9.5, srcRestRect.width * 0.088));
      const rimHalfPx = ((srcShape.rimRect.w * 0.36) / srcVbW) * srcRestRect.width;

      if (streamPath) {
        streamPath.setAttribute('stroke', `var(--p-${colorId})`);
        streamPath.setAttribute('stroke-width', streamWidth.toFixed(1));
        streamPath.classList.add('active');
      }
      if (streamShine) {
        streamShine.setAttribute('stroke-width', (streamWidth * 0.32).toFixed(1));
        streamShine.classList.add('active');
      }
      if (splashDot) {
        splashDot.setAttribute('fill', `var(--p-${colorId}-hi)`);
        splashDot.classList.add('active');
      }

      const startTime = performance.now();

      const step = (now) => {
        if (!srcSlot.isConnected || !dstSlot.isConnected) {
          if (streamGroup) streamGroup.remove();
          resolve();
          return;
        }
        const rawT = Math.min(1, (now - startTime) / pourMs);
        const eased = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const curTilt = startTilt + (endTilt - startTilt) * eased;
        srcSlot.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${curTilt.toFixed(2)}deg)`;

        const curSrcTopY = srcStartTopY + (srcEndTopY - srcStartTopY) * eased;
        if (srcDrainRect) {
          srcDrainRect.setAttribute('y', (curSrcTopY - 0.5).toFixed(2));
          srcDrainRect.setAttribute('height', Math.max(0, srcEndTopY - curSrcTopY + 1.4).toFixed(2));
        }
        if (srcNeckFlow) {
          srcNeckFlow.setAttribute('height', Math.max(0, curSrcTopY - srcShape.rimRect.y + 6).toFixed(2));
          const neckOpacity = rawT > 0.84 ? Math.max(0, (1 - rawT) / 0.16) : 0.94;
          srcNeckFlow.setAttribute('opacity', neckOpacity.toFixed(2));
        }
        if (srcLiveMeniscus) {
          srcLiveMeniscus.setAttribute('cy', curSrcTopY.toFixed(2));
          if (srcEndLen === 0 && rawT > 0.85) {
            srcLiveMeniscus.setAttribute('opacity', Math.max(0, ((1 - rawT) / 0.15) * 0.75).toFixed(2));
          }
        }

        const fillT = Math.max(0, Math.min(1, (rawT - 0.08) / 0.88));
        const fillEased = fillT < 0.5 ? 2 * fillT * fillT : 1 - Math.pow(-2 * fillT + 2, 2) / 2;
        const curDstTopY = dstStartTopY + (dstEndTopY - dstStartTopY) * fillEased;

        if (dstRiseRect) {
          dstRiseRect.setAttribute('y', (curDstTopY - 0.5).toFixed(2));
          dstRiseRect.setAttribute('height', Math.max(0, dstStartTopY - curDstTopY + 1.8).toFixed(2));
        }
        if (dstLiveMeniscus) {
          const ripple = Math.sin(rawT * Math.PI * 8) * 1.3;
          dstLiveMeniscus.setAttribute('cy', curDstTopY.toFixed(2));
          dstLiveMeniscus.setAttribute('ry', (4.5 + ripple).toFixed(2));
        }
        if (dstRippleRing) {
          const ringPhase = (rawT * 3.5) % 1;
          dstRippleRing.setAttribute('cy', curDstTopY.toFixed(2));
          dstRippleRing.setAttribute('rx', (8 + ringPhase * 18).toFixed(1));
          dstRippleRing.setAttribute('opacity', ((1 - ringPhase) * (rawT < 0.92 ? 0.65 : 0)).toFixed(2));
        }

        const rad = (curTilt * Math.PI) / 180;
        const localLipX = pourFromRight ? -rimHalfPx : rimHalfPx;
        const lipX = goalMouthX + localLipX * Math.cos(rad);
        const lipY = goalMouthY + localLipX * Math.sin(rad);

        const surfaceY = dstRect.top + (curDstTopY / dstVbH) * dstRect.height;

        const headFrac = Math.min(1, rawT / 0.12);
        const tailFrac = rawT > 0.86 ? (rawT - 0.86) / 0.14 : 0;

        const streamTopX = lipX + (dstMouthX - lipX) * tailFrac;
        const streamTopY = lipY + (surfaceY - lipY) * tailFrac;
        const streamBotX = lipX + (dstMouthX - lipX) * headFrac;
        const streamBotY = lipY + (surfaceY - lipY) * headFrac;
        const ctrlX = dstMouthX;
        const ctrlY = Math.min(streamBotY, streamTopY + 14);

        const dStr = `M ${streamTopX.toFixed(1)} ${streamTopY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${streamBotX.toFixed(1)} ${streamBotY.toFixed(1)}`;
        if (streamPath) streamPath.setAttribute('d', dStr);
        if (streamShine) streamShine.setAttribute('d', dStr);

        if (splashDot) {
          const splashVis = headFrac >= 0.95 && tailFrac < 0.85;
          splashDot.setAttribute('cx', dstMouthX.toFixed(1));
          splashDot.setAttribute('cy', surfaceY.toFixed(1));
          splashDot.setAttribute('rx', (6 + Math.abs(Math.sin(rawT * 18)) * 4).toFixed(1));
          splashDot.style.opacity = splashVis ? '0.78' : '0';
        }

        if (rawT < 1) {
          requestAnimationFrame(step);
        } else {
          if (streamPath) streamPath.classList.remove('active');
          if (streamShine) streamShine.classList.remove('active');
          if (splashDot) {
            splashDot.classList.remove('active');
            splashDot.style.opacity = '0';
          }
          if (streamGroup) {
            setTimeout(() => streamGroup.remove(), 120);
          }
          if (srcNeckFlow) srcNeckFlow.remove();
          if (dstRippleRing) dstRippleRing.remove();

          srcSlot.style.transition = `transform ${returnMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          requestAnimationFrame(() => {
            srcSlot.style.transform = '';
          });

          setTimeout(() => {
            srcSlot.classList.remove('pouring-source');
            srcSlot.style.transition = '';
            srcSlot.style.transformOrigin = '';
            resolve();
          }, returnMs + 15);
        }
      };

      requestAnimationFrame(step);
    }, travelMs);
  });
}

/**
 * Ambient Dust Motes & Celebratory Sparkle Particle System (Canvas)
 */
export class SparkleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.motes = [];
    this.bursts = [];
    this.rafId = null;
    this.width = 0;
    this.height = 0;
    this._onResize = this._resize.bind(this);
    this._resize();
    window.addEventListener('resize', this._onResize);
    this._initMotes();
    this._loop();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _initMotes() {
    this.motes = [];
    const count = 26;
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1.0 + Math.random() * 2.1,
        vy: -0.12 - Math.random() * 0.22,
        vx: (Math.random() - 0.5) * 0.16,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /** Spawns golden celebration sparkles at (x, y) */
  burstAt(x, y, count = 22, colors = ['#f8d896', '#fce9bc', '#ffffff', '#b89cf7']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 1.4 + Math.random() * 3.8;
      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        r: 2 + Math.random() * 3.2,
        life: 1.0,
        decay: 0.014 + Math.random() * 0.015,
        color: colors[i % colors.length],
        star: i % 3 === 0,
      });
    }
  }

  /** Lush celebratory shower across the top of the screen on level win */
  celebrateWin() {
    const spots = [0.25, 0.5, 0.75];
    spots.forEach((ratio, idx) => {
      setTimeout(() => {
        this.burstAt(this.width * ratio, this.height * 0.34, 28, [
          '#f8d896',
          '#7ee4e6',
          '#f5a8c9',
          '#c5a5fa',
          '#ffffff',
        ]);
      }, idx * 140);
    });
  }

  _loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const m of this.motes) {
      m.x += m.vx;
      m.y += m.vy;
      m.phase += 0.018;
      if (m.y < -10) {
        m.y = this.height + 10;
        m.x = Math.random() * this.width;
      }
      if (m.x < -10) m.x = this.width + 10;
      if (m.x > this.width + 10) m.x = -10;

      const alpha = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(m.phase));
      ctx.fillStyle = `rgba(248, 224, 168, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const p = this.bursts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.055;
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.bursts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.star) {
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        const s = p.r * 1.9;
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this.rafId = requestAnimationFrame(() => this._loop());
  }
}
