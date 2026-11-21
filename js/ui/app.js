/**
 * Moonlight Elixirs — Main Application Controller
 * Manages screens, cozy interactions, auto-save, Daily calendar, Zen mode, Collection & Settings.
 */

import { sound } from '../audio/sound.js';
import {
  generateCampaignLevel,
  generateDailyLevel,
  generateZenLevel,
  safeShuffleState,
} from '../engine/generator.js';
import {
  BOTTLE_STYLES,
  COLOR_LABELS,
  PALETTES,
  THEMES,
  getChapterForLevel,
  getNextUnlockMilestone,
  getTwistById,
  getUnlockAtLevel,
} from '../engine/levels.js';
import {
  MAX_EXTRA_BOTTLES,
  addExtraBottle,
  applyPour,
  canPour,
  cloneState,
  detectBoardTwists,
  getTopColor,
  getUniformBaseCapacity,
  hasAnyValidMove,
  hasMixedBottleCapacities,
  isBottleComplete,
  isBottleLocked,
  isLevelWon,
} from '../engine/rules.js';
import { findHintMove } from '../engine/solver.js';
import {
  SparkleSystem,
  animatePourSequence,
  computeLayoutMetrics,
  createBottleElement,
  createBottlePreviewSvg,
  createTwistPreviewSvg,
  updateBottleSlotVisual,
} from './renderer.js';

const STORAGE_KEY = 'moonlight-elixirs-save-v1';

const WIN_MESSAGES = [
  'Brew Perfected',
  'Peacefully Sorted',
  'Radiant Elixirs',
  'A Tranquil Pour',
  'Moonlit Harmony',
  'Shelf Complete',
];

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultSave() {
  return {
    highestCompletedLevel: 0,
    currentJourneyLevel: 1,
    dailyCompleted: [],
    seenTwists: [],
    settings: {
      theme: 'candlelit-apothecary',
      bottleStyle: 'apothecary',
      palette: 'apothecary-gems',
      sfx: true,
      showSymbols: false,
      pureClassic: false,
    },
    activeSession: null,
  };
}

class MoonlightApp {
  constructor() {
    this.save = this._loadSave();
    this.session = null;
    this.selectedIdx = -1;
    this.hintPair = null;
    this.isAnimating = false;
    this.activePourCount = 0;
    this.busyBottles = new Map();
    this.levelWonPending = false;
    this.pendingResize = false;
    this.sessionToken = 0;
    this.collectionTab = 'themes';
    this.toastTimer = null;
    this.twistPopupTimer = null;
    this.winAdvanceTimer = null;
    this.winFadeTimer = null;

    this._cacheDom();
    this.sparkles = new SparkleSystem(this.dom.sparkleCanvas);

    this._applyVisualSettings();
    this._applyAudioSettings();
    this._bindEvents();
    this._registerServiceWorker();

    // Resume mid-level automatically if player had made moves, otherwise show serene Home screen
    if (this.save.activeSession && this.save.activeSession.state && this.save.activeSession.state.movesCount > 0 && !isLevelWon(this.save.activeSession.state)) {
      this.session = this.save.activeSession;
      this._openGameplayScreen();
    } else {
      this._renderHome();
      this._showScreen('home');
    }
  }

  _cacheDom() {
    const q = (id) => document.getElementById(id);
    this.dom = {
      sparkleCanvas: q('sparkle-canvas'),
      homeScreen: q('home-screen'),
      gameScreen: q('game-screen'),

      // Home
      homePlayBtn: q('home-play-btn'),
      homeChapterPill: q('home-chapter-pill'),
      homeDailySub: q('home-daily-sub'),
      homeCollectionSub: q('home-collection-sub'),
      homeMuteBtn: q('home-mute-btn'),
      homeSettingsBtn: q('home-settings-btn'),
      openDailyBtn: q('open-daily-btn'),
      openZenBtn: q('open-zen-btn'),
      openCollectionBtn: q('open-collection-btn'),

      // Game
      gameHomeBtn: q('game-home-btn'),
      gameLevelTitle: q('game-level-title'),
      gameChapterSub: q('game-chapter-sub'),
      gameBanner: q('game-banner'),
      gameMuteBtn: q('game-mute-btn'),
      gameCollectionBtn: q('game-collection-btn'),
      gameSettingsBtn: q('game-settings-btn'),
      boardStage: q('board-stage'),

      // Helper dock
      btnUndo: q('btn-undo'),
      btnRestart: q('btn-restart'),
      btnHint: q('btn-hint'),
      btnShuffle: q('btn-shuffle'),
      btnExtra: q('btn-extra'),
      extraBadge: q('extra-badge'),

      // Win overlay
      winModal: q('win-modal'),
      winTitle: q('win-title'),
      winSub: q('win-sub'),
      winUnlockBox: q('win-unlock-box'),
      winUnlockName: q('win-unlock-name'),
      winUnlockEquip: q('win-unlock-equip'),
      winProgressNote: q('win-progress-note'),
      winNextBtn: q('win-next-btn'),
      winHomeBtn: q('win-home-btn'),

      // First-time twist discovery overlay
      twistIntroModal: q('twist-intro-modal'),
      twistIntroKicker: q('twist-intro-kicker'),
      twistIntroTabs: q('twist-intro-tabs'),
      twistIntroPreview: q('twist-intro-preview'),
      twistIntroTitle: q('twist-intro-title'),
      twistIntroMeta: q('twist-intro-meta'),
      twistIntroDesc: q('twist-intro-desc'),
      twistIntroTip: q('twist-intro-tip'),
      twistIntroClose: q('twist-intro-close'),

      // Collection modal
      collectionModal: q('collection-modal'),
      collectionGrid: q('collection-grid'),
      collectionTabs: document.querySelectorAll('.tab-btn'),

      // Zen modal
      zenModal: q('zen-modal'),
      zenCards: document.querySelectorAll('[data-zen]'),

      // Daily modal
      dailyModal: q('daily-modal'),
      dailyGrid: q('daily-grid'),
      dailyProgressText: q('daily-progress-text'),

      // Settings modal
      settingsModal: q('settings-modal'),
      toggleSfx: q('toggle-sfx'),
      toggleSymbols: q('toggle-symbols'),
      toggleClassic: q('toggle-classic'),
      btnExportSave: q('btn-export-save'),
      btnImportSave: q('btn-import-save'),

      toast: q('toast'),
    };
  }

  _loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      return {
        ...base,
        ...parsed,
        seenTwists: Array.isArray(parsed.seenTwists) ? parsed.seenTwists : [],
        settings: { ...base.settings, ...(parsed.settings || {}) },
      };
    } catch (_) {
      return defaultSave();
    }
  }

  _persistSave() {
    try {
      this.save.activeSession = this.session;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save));
    } catch (_) {
      // Ignore storage quota issues quietly
    }
  }

  _applyVisualSettings() {
    const { theme, palette } = this.save.settings;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-palette', palette);
  }

  _applyAudioSettings() {
    const { sfx } = this.save.settings;
    sound.setSfxEnabled(sfx);
    const muteIcon = sfx ? '🔊' : '🔇';
    if (this.dom.homeMuteBtn) this.dom.homeMuteBtn.textContent = muteIcon;
    if (this.dom.gameMuteBtn) this.dom.gameMuteBtn.textContent = muteIcon;
  }

  _bindEvents() {
    // Unlock iOS Web Audio on first touch/click anywhere
    const unlockOnce = () => {
      sound.unlockFromGesture();
      window.removeEventListener('pointerdown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });

    // Home actions
    this.dom.homePlayBtn.addEventListener('click', () => this._startOrContinueJourney());
    this.dom.openDailyBtn.addEventListener('click', () => this._openDailyModal());
    this.dom.openZenBtn.addEventListener('click', () => this._openModal('zenModal'));
    this.dom.openCollectionBtn.addEventListener('click', () => this._openCollectionModal());
    this.dom.homeSettingsBtn.addEventListener('click', () => this._openSettingsModal());
    this.dom.homeMuteBtn.addEventListener('click', () => this._toggleMute());

    // Game top bar
    this.dom.gameHomeBtn.addEventListener('click', () => {
      this._cancelPendingAdvance();
      this._persistSave();
      this._renderHome();
      this._showScreen('home');
    });
    this.dom.gameMuteBtn.addEventListener('click', () => this._toggleMute());
    this.dom.gameCollectionBtn.addEventListener('click', () => this._openCollectionModal());
    this.dom.gameSettingsBtn.addEventListener('click', () => this._openSettingsModal());

    // Helper dock
    this.dom.btnUndo.addEventListener('click', () => this._handleUndo());
    this.dom.btnRestart.addEventListener('click', () => this._handleRestart());
    this.dom.btnHint.addEventListener('click', () => this._handleHint());
    this.dom.btnShuffle.addEventListener('click', () => this._handleShuffle());
    this.dom.btnExtra.addEventListener('click', () => this._handleExtraBottle());

    // Deselect when tapping empty background area of board
    this.dom.boardStage.addEventListener('click', (e) => {
      if (e.target === this.dom.boardStage || e.target.classList.contains('shelf-row')) {
        if (this.selectedIdx !== -1 && !this.levelWonPending) {
          this.selectedIdx = -1;
          sound.playDeselect();
          this._syncSelectionAndHints();
        }
      }
    });

    // Win actions
    this.dom.winNextBtn.addEventListener('click', () => this._handleWinNext());
    this.dom.winHomeBtn.addEventListener('click', () => {
      this._closeAllModals();
      this._renderHome();
      this._showScreen('home');
    });

    // Twist discovery modal action
    if (this.dom.twistIntroClose) {
      this.dom.twistIntroClose.addEventListener('click', () => this._closeAllModals());
    }

    // Modal close buttons & backdrop taps
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => this._closeAllModals());
    });
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop && backdrop.id !== 'win-modal') {
          this._closeAllModals();
        }
      });
    });

    // Collection tabs
    this.dom.collectionTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.collectionTab = btn.dataset.tab;
        this.dom.collectionTabs.forEach((b) => b.classList.toggle('active', b === btn));
        this._renderCollectionGrid();
      });
    });

    // Zen difficulty cards
    this.dom.zenCards.forEach((card) => {
      card.addEventListener('click', () => {
        this._closeAllModals();
        this._startZenLevel(card.dataset.zen);
      });
    });

    // Settings controls
    this.dom.toggleSfx.addEventListener('change', (e) => {
      this.save.settings.sfx = e.target.checked;
      this._applyAudioSettings();
      this._persistSave();
    });

    this.dom.toggleSymbols.addEventListener('change', (e) => {
      this.save.settings.showSymbols = e.target.checked;
      this._persistSave();
      if (this.session) this._renderBoard();
    });

    this.dom.toggleClassic.addEventListener('change', (e) => {
      this.save.settings.pureClassic = e.target.checked;
      this._persistSave();
      this._showToast(
        e.target.checked ? 'Pure Classic Mode active for upcoming levels' : 'Gradual Magic Twists enabled'
      );
    });

    this.dom.btnExportSave.addEventListener('click', () => this._exportSaveCode());
    this.dom.btnImportSave.addEventListener('click', () => this._importSaveCode());

    // Reflow bottle sizing smoothly on iPad rotation or window resize
    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (this.session && this.dom.gameScreen.classList.contains('active')) {
          if (this.activePourCount > 0) {
            this.pendingResize = true;
          } else {
            this._renderBoard();
          }
        }
      });
    });
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  _showScreen(which) {
    this.dom.homeScreen.classList.toggle('active', which === 'home');
    this.dom.gameScreen.classList.toggle('active', which === 'game');
  }

  _openModal(modalKey) {
    this._closeAllModals();
    const el = this.dom[modalKey];
    if (el) el.classList.add('open');
  }

  _closeAllModals() {
    document.querySelectorAll('.modal-backdrop.open').forEach((el) => el.classList.remove('open'));
  }

  _toggleMute() {
    this.save.settings.sfx = !this.save.settings.sfx;
    this._applyAudioSettings();
    this._syncSettingsUi();
    this._persistSave();
    this._showToast(this.save.settings.sfx ? 'Sound Effects On' : 'Sound Effects Muted');
  }

  _showToast(message) {
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('visible');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove('visible');
    }, 2400);
  }

  // ==================== HOME SCREEN ====================
  _renderHome() {
    const levelNum = this.save.currentJourneyLevel;
    const hasInProgressJourney =
      this.session &&
      this.session.mode === 'journey' &&
      this.session.levelNum === levelNum &&
      this.session.state.movesCount > 0 &&
      !isLevelWon(this.session.state);

    this.dom.homePlayBtn.textContent = hasInProgressJourney
      ? `Continue Level ${levelNum}`
      : `Play Level ${levelNum}`;

    this.dom.homeChapterPill.textContent = `Chapter · ${getChapterForLevel(levelNum)}`;

    const todayDone = this.save.dailyCompleted.includes(getTodayKey());
    this.dom.homeDailySub.textContent = todayDone ? 'Today Complete ✦' : 'Fresh Brew Ready';

    const unlockedCount = this._countUnlockedCosmetics();
    const totalCount = THEMES.length + BOTTLE_STYLES.length + PALETTES.length;
    this.dom.homeCollectionSub.textContent = `${unlockedCount} / ${totalCount} Unlocked`;
  }

  _countUnlockedCosmetics() {
    const lvl = Math.max(1, this.save.highestCompletedLevel + 1);
    return (
      THEMES.filter((t) => t.unlockLevel <= lvl).length +
      BOTTLE_STYLES.filter((b) => b.unlockLevel <= lvl).length +
      PALETTES.filter((p) => p.unlockLevel <= lvl).length
    );
  }

  // ==================== STARTING LEVELS ====================
  _startOrContinueJourney() {
    const targetLevel = this.save.currentJourneyLevel;
    if (
      this.session &&
      this.session.mode === 'journey' &&
      this.session.levelNum === targetLevel &&
      !isLevelWon(this.session.state)
    ) {
      this._openGameplayScreen();
      return;
    }
    this._loadCampaignLevel(targetLevel);
  }

  _loadCampaignLevel(levelNum) {
    const generated = generateCampaignLevel(levelNum, {
      pureClassic: this.save.settings.pureClassic,
    });
    this.session = {
      ...generated,
      initialState: cloneState(generated.state),
      undoStack: [],
    };
    this.selectedIdx = -1;
    this.hintPair = null;
    this._persistSave();
    this._openGameplayScreen();
  }

  _startZenLevel(difficulty) {
    const generated = generateZenLevel(difficulty, Date.now(), this.save.settings.pureClassic);
    this.session = {
      ...generated,
      initialState: cloneState(generated.state),
      undoStack: [],
    };
    this.selectedIdx = -1;
    this.hintPair = null;
    this._persistSave();
    this._openGameplayScreen();
  }

  _startDailyLevel(dateKey) {
    const generated = generateDailyLevel(dateKey, this.save.settings.pureClassic);
    this.session = {
      ...generated,
      initialState: cloneState(generated.state),
      undoStack: [],
    };
    this.selectedIdx = -1;
    this.hintPair = null;
    this._persistSave();
    this._openGameplayScreen();
  }

  _openGameplayScreen() {
    this._resetPourTracking();
    this._showScreen('game');
    this._renderGameHeader();
    this._renderBoard();
    this._updateDockButtons();
    this._checkFirstTimeTwistPopup();
  }

  _renderTwistModalContent(twist) {
    if (!twist) return;
    this.dom.twistIntroPreview.replaceChildren(
      createTwistPreviewSvg(
        twist.sampleBottle,
        this.save.settings.bottleStyle,
        this.save.settings.showSymbols
      )
    );
    this.dom.twistIntroTitle.textContent = twist.name;
    this.dom.twistIntroMeta.textContent = `Introduces at Level ${twist.introLevel} · ${twist.chapter}`;
    this.dom.twistIntroDesc.textContent = twist.description;
    this.dom.twistIntroTip.textContent = `Tip: ${twist.tip}`;
  }

  _showTwistModal(twistId, isFirstTime = true, twistList = null) {
    const twist = getTwistById(twistId);
    if (!twist) return;

    const tabsEl = this.dom.twistIntroTabs;
    const multiIds = !isFirstTime && Array.isArray(twistList) && twistList.length > 1 ? twistList : null;

    if (multiIds && tabsEl) {
      this.dom.twistIntroKicker.textContent = this.session?.isFinale
        ? 'Chapter Finale · Active Twists'
        : 'Active Twists on This Shelf';
      tabsEl.classList.remove('hidden');
      tabsEl.innerHTML = '';

      multiIds.forEach((id) => {
        const item = getTwistById(id);
        if (!item) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'twist-tab-btn';
        btn.setAttribute('role', 'tab');
        const isCurrent = id === twistId;
        btn.classList.toggle('active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        btn.textContent = item.badgeLabel;
        btn.addEventListener('click', () => {
          tabsEl.querySelectorAll('.twist-tab-btn').forEach((other) => {
            const active = other === btn;
            other.classList.toggle('active', active);
            other.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          this._renderTwistModalContent(item);
          sound.playSelect();
        });
        tabsEl.appendChild(btn);
      });
    } else {
      if (tabsEl) {
        tabsEl.classList.add('hidden');
        tabsEl.innerHTML = '';
      }
      this.dom.twistIntroKicker.textContent = isFirstTime
        ? 'New Twist Discovered'
        : 'Apothecary Twist Guide';
    }

    this._renderTwistModalContent(twist);
    this.dom.twistIntroClose.textContent = isFirstTime ? "Got It — Let's Brew" : 'Back to Shelf';
    sound.playShimmer();
    this._openModal('twistIntroModal');
  }

  _checkFirstTimeTwistPopup() {
    if (this.twistPopupTimer) {
      clearTimeout(this.twistPopupTimer);
      this.twistPopupTimer = null;
    }
    if (!this.session || !this.session.state || this.save.settings.pureClassic) return;

    const seen = new Set(this.save.seenTwists || []);
    const activeTwists = detectBoardTwists(this.session.state);
    if (activeTwists.length === 0) return;

    let nextTwistId = null;
    if (
      this.session.introTwistId &&
      !seen.has(this.session.introTwistId) &&
      activeTwists.includes(this.session.introTwistId)
    ) {
      nextTwistId = this.session.introTwistId;
    } else {
      nextTwistId = activeTwists.find((id) => !seen.has(id)) || null;
    }

    if (!nextTwistId) return;

    if (!Array.isArray(this.save.seenTwists)) this.save.seenTwists = [];
    this.save.seenTwists.push(nextTwistId);
    this._persistSave();

    const token = this.sessionToken;
    this.twistPopupTimer = setTimeout(() => {
      if (token !== this.sessionToken || !this.dom.gameScreen.classList.contains('active')) return;
      this._showTwistModal(nextTwistId, true);
    }, 220);
  }

  _resetPourTracking() {
    this.sessionToken += 1;
    this.activePourCount = 0;
    this.busyBottles.clear();
    this.levelWonPending = false;
    this.pendingResize = false;
    this.isAnimating = false;
    const streamOverlay = document.getElementById('pour-stream-overlay');
    if (streamOverlay) streamOverlay.replaceChildren();
  }

  _isBottleBusy(idx) {
    return (this.busyBottles.get(idx) || 0) > 0;
  }

  _markBottleBusy(idx, delta) {
    const next = Math.max(0, (this.busyBottles.get(idx) || 0) + delta);
    if (next === 0) this.busyBottles.delete(idx);
    else this.busyBottles.set(idx, next);
  }

  _syncSelectionAndHints() {
    this.dom.boardStage.querySelectorAll('.bottle-slot').forEach((slot) => {
      const i = Number(slot.dataset.index);
      const isSelected = this.selectedIdx === i && !this._isBottleBusy(i);
      slot.classList.toggle('selected', isSelected);
      slot.classList.toggle('hint-source', Boolean(this.hintPair && this.hintPair.fromIdx === i));
      slot.classList.toggle('hint-target', Boolean(this.hintPair && this.hintPair.toIdx === i));
    });
  }

  // ==================== GAMEPLAY RENDERING ====================
  _renderGameHeader() {
    if (!this.session) return;
    this.dom.gameLevelTitle.textContent = this.session.title;

    const sub = this.dom.gameChapterSub;
    sub.innerHTML = '';
    const chSpan = document.createElement('span');
    chSpan.textContent = this.session.chapter;
    sub.appendChild(chSpan);

    const activeTwists = detectBoardTwists(this.session.state);
    const primaryTwistId =
      (this.session.introTwistId && activeTwists.includes(this.session.introTwistId)
        ? this.session.introTwistId
        : activeTwists[0]) || null;

    const uniformCap = getUniformBaseCapacity(this.session.state.bottles);
    if (uniformCap) {
      const capPill = document.createElement('span');
      capPill.className = 'cap-header-pill';
      capPill.textContent = `${uniformCap}u Flasks`;
      sub.appendChild(capPill);
    }

    if (this.session.twistBadge) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'twist-pill';
      if (this.session.isFinale) pill.classList.add('is-finale');
      pill.textContent = primaryTwistId ? `${this.session.twistBadge} ⓘ` : this.session.twistBadge;
      if (primaryTwistId) {
        pill.setAttribute('aria-label', `Explain ${this.session.twistBadge} twist`);
        pill.addEventListener('click', () =>
          this._showTwistModal(primaryTwistId, false, activeTwists)
        );
      }
      sub.appendChild(pill);
    }

    if (this.session.subtitle) {
      this.dom.gameBanner.textContent = this.session.subtitle;
      this.dom.gameBanner.classList.remove('hidden');
    } else {
      this.dom.gameBanner.classList.add('hidden');
    }
  }

  _renderBoard() {
    if (!this.session) return;
    const state = this.session.state;
    const bottles = state.bottles;
    const stage = this.dom.boardStage;

    const rect = stage.getBoundingClientRect();
    const stageW = rect.width || window.innerWidth;
    const stageH = rect.height || window.innerHeight * 0.65;
    const hasGiantVat = bottles.some((b) => Boolean(b.pourOnly));
    const metrics = computeLayoutMetrics(bottles.length, stageW, stageH, hasGiantVat);

    stage.style.setProperty('--bottle-w', `${metrics.bottleW}px`);
    stage.style.setProperty('--bottle-h', `${metrics.bottleH}px`);
    stage.style.setProperty('--bottle-gap', `${metrics.gap}px`);

    const hasVariableCap = hasMixedBottleCapacities(bottles);

    // Split into 1 or 2 balanced rows
    const rowSplits =
      metrics.rows === 1
        ? [bottles.map((b, i) => ({ b, i }))]
        : [
            bottles.slice(0, metrics.maxPerRow).map((b, i) => ({ b, i })),
            bottles.slice(metrics.maxPerRow).map((b, i) => ({ b, i: i + metrics.maxPerRow })),
          ];

    stage.innerHTML = '';
    for (const rowItems of rowSplits) {
      const rowEl = document.createElement('div');
      rowEl.className = 'shelf-row';

      for (const { b, i } of rowItems) {
        const hintRole =
          this.hintPair && this.hintPair.fromIdx === i
            ? 'source'
            : this.hintPair && this.hintPair.toIdx === i
              ? 'target'
              : null;

        const slot = createBottleElement(b, i, {
          styleId: this.save.settings.bottleStyle,
          showSymbols: this.save.settings.showSymbols,
          selected: this.selectedIdx === i,
          hintRole,
          hasVariableCap,
        });

        slot.addEventListener('click', (e) => {
          e.stopPropagation();
          this._handleBottleTap(i);
        });
        slot.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._handleBottleTap(i);
          }
        });

        rowEl.appendChild(slot);
      }

      stage.appendChild(rowEl);
    }
  }

  _updateDockButtons() {
    if (!this.session) return;
    const state = this.session.state;
    const busyGlobal = this.activePourCount > 0 || this.levelWonPending;
    this.dom.btnUndo.disabled = this.session.undoStack.length === 0 || busyGlobal;
    this.dom.btnRestart.disabled = (state.movesCount === 0 && state.extraAdded === 0) || busyGlobal;
    const remainingExtra = Math.max(0, MAX_EXTRA_BOTTLES - (state.extraAdded || 0));
    this.dom.btnExtra.disabled = remainingExtra === 0 || busyGlobal;
    this.dom.extraBadge.textContent = `+${remainingExtra}`;
    this.dom.btnHint.disabled = this.levelWonPending;
    this.dom.btnShuffle.disabled = busyGlobal;
  }

  // ==================== BOTTLE INTERACTION ====================
  async _handleBottleTap(idx) {
    if (this.levelWonPending || !this.session) return;
    if (this._isBottleBusy(idx)) return;

    const state = this.session.state;
    const tapped = state.bottles[idx];
    if (!tapped) return;

    this.hintPair = null;

    // Sealed/locked bottle gentle feedback
    if (isBottleLocked(tapped)) {
      sound.playInvalid();
      this._nudgeBottle(idx);
      this._showToast(this._lockedFeedbackMessage(tapped));
      return;
    }

    // Nothing selected yet -> try selecting this bottle
    if (this.selectedIdx === -1) {
      if (tapped.pourOnly) {
        if (!isBottleComplete(tapped)) {
          const cName = COLOR_LABELS[tapped.targetColor] || tapped.targetColor || 'matching';
          sound.playInvalid();
          this._nudgeBottle(idx);
          this._showToast(`Too heavy to lift — pour ${cName} elixirs into this vat`);
        }
        return;
      }
      if (tapped.layers.length === 0 || isBottleComplete(tapped)) {
        return;
      }
      this.selectedIdx = idx;
      sound.playSelect();
      this._syncSelectionAndHints();
      return;
    }

    // Tapped same bottle -> deselect
    if (this.selectedIdx === idx) {
      this.selectedIdx = -1;
      sound.playDeselect();
      this._syncSelectionAndHints();
      return;
    }

    // Attempt pour from selectedIdx -> idx
    const fromIdx = this.selectedIdx;
    if (this._isBottleBusy(fromIdx)) {
      this.selectedIdx = -1;
      this._syncSelectionAndHints();
      return;
    }

    if (!canPour(state, fromIdx, idx)) {
      // Friendly ergonomics: if tapped bottle is a valid selectable source, switch selection cleanly
      if (
        !tapped.pourOnly &&
        tapped.layers.length > 0 &&
        !isBottleComplete(tapped) &&
        !isBottleLocked(tapped)
      ) {
        this.selectedIdx = idx;
        sound.playSelect();
        this._syncSelectionAndHints();
      } else {
        sound.playInvalid();
        this._nudgeBottle(idx);
        const invalidHint = this._invalidPourFeedback(state.bottles[fromIdx], tapped);
        if (invalidHint) this._showToast(invalidHint);
        this.selectedIdx = -1;
        this._syncSelectionAndHints();
      }
      return;
    }

    // Valid pour! Launch immediately without blocking other bottles on the shelf
    const prevSnapshot = cloneState(state);
    const result = applyPour(state, fromIdx, idx);
    if (!result) return;

    const token = this.sessionToken;
    this.selectedIdx = -1;
    this.session.undoStack.push(prevSnapshot);
    this.session.state = result.state;
    this.activePourCount += 1;
    this._markBottleBusy(fromIdx, 1);
    this._markBottleBusy(idx, 1);
    if (result.won) {
      this.levelWonPending = true;
    }
    this._persistSave();
    this._syncSelectionAndHints();
    this._updateDockButtons();

    const srcSlot = this.dom.boardStage.querySelector(`.bottle-slot[data-index="${fromIdx}"]`);
    const dstSlot = this.dom.boardStage.querySelector(`.bottle-slot[data-index="${idx}"]`);
    const fillRatioAfter = result.state.bottles[idx].layers.length / result.state.bottles[idx].capacity;

    await animatePourSequence({
      srcSlot,
      dstSlot,
      srcBottle: prevSnapshot.bottles[fromIdx],
      dstBottle: prevSnapshot.bottles[idx],
      colorId: result.color,
      movedCount: result.movedCount,
      styleId: this.save.settings.bottleStyle,
      onPourStart: () => {
        if (token !== this.sessionToken) return;
        sound.playPour(result.movedCount, fillRatioAfter);
        if (result.revealedInSource) {
          setTimeout(() => {
            if (token === this.sessionToken) sound.playShimmer();
          }, 340);
        }
      },
    });

    if (token !== this.sessionToken || !this.session) return;

    this.activePourCount = Math.max(0, this.activePourCount - 1);
    this._markBottleBusy(fromIdx, -1);
    this._markBottleBusy(idx, -1);

    // Refresh only the affected slots in place so any other concurrent pours continue undisturbed!
    const currentState = this.session.state;
    const hasVariableCap = hasMixedBottleCapacities(currentState.bottles);
    const styleId = this.save.settings.bottleStyle;
    const showSymbols = this.save.settings.showSymbols;

    const refreshIdx = (bIdx) => {
      if (this._isBottleBusy(bIdx)) return;
      const slot = this.dom.boardStage.querySelector(`.bottle-slot[data-index="${bIdx}"]`);
      if (!slot || !currentState.bottles[bIdx]) return;
      updateBottleSlotVisual(slot, currentState.bottles[bIdx], bIdx, {
        styleId,
        showSymbols,
        selected: this.selectedIdx === bIdx,
        hintRole:
          this.hintPair && this.hintPair.fromIdx === bIdx
            ? 'source'
            : this.hintPair && this.hintPair.toIdx === bIdx
              ? 'target'
              : null,
        hasVariableCap,
      });
    };

    const refreshSet = new Set([fromIdx, idx]);
    for (const uIdx of result.unlockedBottleIndices || []) refreshSet.add(uIdx);
    for (const fIdx of result.frostTickedIndices || []) refreshSet.add(fIdx);
    for (const rIdx of refreshSet) {
      refreshIdx(rIdx);
    }

    this._updateDockButtons();

    // Blending Cauldron brewed!
    if (result.brewedCauldronIdx !== -1) {
      const brewedBottle = currentState.bottles[result.brewedCauldronIdx];
      const brewedName = COLOR_LABELS[brewedBottle.blend.result] || brewedBottle.blend.result;
      const cSlot = this.dom.boardStage.querySelector(
        `.bottle-slot[data-index="${result.brewedCauldronIdx}"]`
      );
      if (cSlot) {
        const r = cSlot.getBoundingClientRect();
        this.sparkles.burstAt(r.left + r.width / 2, r.top + r.height * 0.45, 28, [
          '#f8d896',
          '#c5a5fa',
          '#7ee4e6',
          '#ffffff',
        ]);
      }
      this._showToast(`Brewed a gleaming ${brewedName} Elixir! ✦`);
    }

    // Bottle completion cork celebration!
    if (result.completedBottleIdx !== -1) {
      sound.playCork();
      const compSlot = this.dom.boardStage.querySelector(
        `.bottle-slot[data-index="${result.completedBottleIdx}"]`
      );
      if (compSlot) {
        const r = compSlot.getBoundingClientRect();
        this.sparkles.burstAt(r.left + r.width / 2, r.top + r.height * 0.25, 24);
      }
    }

    // Melting Frost Runes thawed!
    if (result.frostMeltedIndices && result.frostMeltedIndices.length > 0) {
      setTimeout(() => {
        if (token !== this.sessionToken) return;
        sound.playShimmer();
        for (const fIdx of result.frostMeltedIndices) {
          const fSlot = this.dom.boardStage.querySelector(`.bottle-slot[data-index="${fIdx}"]`);
          if (fSlot) {
            const r = fSlot.getBoundingClientRect();
            this.sparkles.burstAt(r.left + r.width / 2, r.top + r.height * 0.5, 20, [
              '#b6eaff',
              '#ffffff',
              '#7ee5e5',
            ]);
          }
        }
        this._showToast('Frost melted — flask unlocked! ❄');
      }, 180);
    }

    // Ribboned / Corked / Color-Keyed seals unlocked!
    if (result.unlockedDetails && result.unlockedDetails.length > 0) {
      setTimeout(() => {
        if (token !== this.sessionToken) return;
        sound.playShimmer();
        let lastMsg = 'Velvet ribbon untied ✦';
        for (const detail of result.unlockedDetails) {
          const unlSlot = this.dom.boardStage.querySelector(
            `.bottle-slot[data-index="${detail.idx}"]`
          );
          if (unlSlot) {
            const r = unlSlot.getBoundingClientRect();
            this.sparkles.burstAt(r.left + r.width / 2, r.top + r.height * 0.5, 20, [
              '#f8d896',
              '#f58ca8',
              '#ffffff',
            ]);
          }
          if (detail.kind === 'corked-empty') {
            lastMsg = 'Corked reserve popped open! ✦';
          } else if (detail.kind === 'color-seal') {
            const cName = COLOR_LABELS[detail.color] || detail.color;
            lastMsg = `${cName} gemstone seal melted! ✦`;
          } else {
            lastMsg = 'Velvet ribbon untied ✦';
          }
        }
        this._showToast(lastMsg);
      }, 220);
    }

    // Handle deferred viewport resize once all active pours settle
    if (this.pendingResize && this.activePourCount === 0 && !this.levelWonPending) {
      this.pendingResize = false;
      this._renderBoard();
    }

    // Level Won (wait for any other overlapping pours to land cleanly before advancing)
    if (this.levelWonPending && this.activePourCount === 0) {
      this.winAdvanceTimer = setTimeout(() => this._handleLevelWin(), 380);
      return;
    }

    // Gentle dead-end guidance once all active pours settle
    if (this.activePourCount === 0 && !this.levelWonPending && !hasAnyValidMove(currentState)) {
      this._showToast('No pours left — try Undo, Shuffle, or + Flask');
    }
  }

  _lockedFeedbackMessage(bottle) {
    if (bottle.lockedByColor) {
      const cName = COLOR_LABELS[bottle.lockedByColor] || bottle.lockedByColor;
      return `Complete the ${cName} flask to melt this seal`;
    }
    if (bottle.frostMoves > 0) {
      return `Make ${bottle.frostMoves} more ${bottle.frostMoves === 1 ? 'pour' : 'pours'} anywhere to melt the frost`;
    }
    if (bottle.layers.length === 0) {
      return 'Complete any flask to pop this corked reserve';
    }
    return 'Complete any other flask to untie this ribbon';
  }

  _invalidPourFeedback(src, dst) {
    if (!src || !dst) return null;
    const srcColor = getTopColor(src);
    if (dst.recipe && dst.layers.length < dst.recipe.length) {
      const needed = COLOR_LABELS[dst.recipe[dst.layers.length]] || dst.recipe[dst.layers.length];
      return `Recipe flask needs ${needed} next`;
    }
    if (dst.blend && !dst.blend.brewed) {
      const [cA, cB] = dst.blend.colors;
      return `Cauldron blends 2 ${COLOR_LABELS[cA] || cA} + 2 ${COLOR_LABELS[cB] || cB}`;
    }
    if (dst.targetColor && srcColor !== dst.targetColor) {
      const targetName = COLOR_LABELS[dst.targetColor] || dst.targetColor;
      return dst.pourOnly
        ? `Grand Vat only accepts ${targetName}`
        : `Crested flask only accepts ${targetName}`;
    }
    return null;
  }

  _nudgeBottle(idx) {
    const slot = this.dom.boardStage.querySelector(`.bottle-slot[data-index="${idx}"]`);
    if (!slot) return;
    slot.classList.remove('invalid-shake');
    void slot.offsetWidth;
    slot.classList.add('invalid-shake');
  }

  // ==================== HELPER DOCK ACTIONS ====================
  _handleUndo() {
    if (this.activePourCount > 0 || this.levelWonPending || !this.session || this.session.undoStack.length === 0) return;
    this.session.state = this.session.undoStack.pop();
    this.selectedIdx = -1;
    this.hintPair = null;
    sound.playDeselect();
    this._persistSave();
    this._renderBoard();
    this._updateDockButtons();
  }

  _handleRestart() {
    if (this.activePourCount > 0 || this.levelWonPending || !this.session) return;
    this.session.state = cloneState(this.session.initialState);
    this.session.undoStack = [];
    this.selectedIdx = -1;
    this.hintPair = null;
    sound.playDeselect();
    this._persistSave();
    this._renderBoard();
    this._updateDockButtons();
    this._showToast('Shelf reset cleanly');
  }

  _handleHint() {
    if (this.levelWonPending || !this.session) return;
    const { move, solvable } = findHintMove(this.session.state);
    if (!move) {
      this._showToast('Try Undo, Shuffle, or + Flask for more room');
      return;
    }
    this.selectedIdx = -1;
    this.hintPair = move;
    sound.playShimmer();
    this._syncSelectionAndHints();
    if (!solvable) {
      this._showToast('Tight spot — Undo or + Flask can help open space');
    }
  }

  _handleShuffle() {
    if (this.activePourCount > 0 || this.levelWonPending || !this.session) return;
    const shuffled = safeShuffleState(this.session.state);
    if (!shuffled) {
      this._showToast('Already nearly sorted — try Undo or + Flask');
      return;
    }
    this.session.undoStack.push(cloneState(this.session.state));
    this.session.state = shuffled;
    this.selectedIdx = -1;
    this.hintPair = null;
    sound.playShimmer();
    this._persistSave();
    this._renderBoard();
    this._updateDockButtons();
    this._showToast('Elixirs gently reshuffled ✦');
  }

  _handleExtraBottle() {
    if (this.activePourCount > 0 || this.levelWonPending || !this.session) return;
    const updated = addExtraBottle(this.session.state);
    if (!updated) {
      this._showToast('All spare flasks are already on the shelf');
      return;
    }
    this.session.undoStack.push(cloneState(this.session.state));
    this.session.state = updated;
    this.selectedIdx = -1;
    this.hintPair = null;
    sound.playShimmer();
    this._persistSave();
    this._renderBoard();
    this._updateDockButtons();
    this._showToast('Added a spare empty flask');
  }

  _cancelPendingAdvance() {
    if (this.twistPopupTimer) {
      clearTimeout(this.twistPopupTimer);
      this.twistPopupTimer = null;
    }
    if (this.winAdvanceTimer) {
      clearTimeout(this.winAdvanceTimer);
      this.winAdvanceTimer = null;
    }
    if (this.winFadeTimer) {
      clearTimeout(this.winFadeTimer);
      this.winFadeTimer = null;
    }
    this.dom.boardStage.classList.remove('transitioning');
    this._resetPourTracking();
  }

  // ==================== LEVEL COMPLETION ====================
  _handleLevelWin() {
    if (!this.session) return;
    sound.playLevelWin();
    this.sparkles.celebrateWin();

    const msg = WIN_MESSAGES[(this.session.levelNum || this.session.state.movesCount) % WIN_MESSAGES.length];
    let newlyUnlocked = [];

    if (this.session.mode === 'journey') {
      const completedNum = this.session.levelNum;
      const wasNewHighest = completedNum > this.save.highestCompletedLevel;
      if (wasNewHighest) {
        this.save.highestCompletedLevel = completedNum;
        newlyUnlocked = getUnlockAtLevel(completedNum + 1);
      }
      this.save.currentJourneyLevel = completedNum + 1;
      this.dom.winSub.textContent = `Level ${completedNum} · ${this.session.chapter}`;
      this.dom.winNextBtn.textContent = `Next Level (${completedNum + 1})`;
    } else if (this.session.mode === 'daily') {
      if (!this.save.dailyCompleted.includes(this.session.dateKey)) {
        this.save.dailyCompleted.push(this.session.dateKey);
      }
      this.dom.winSub.textContent = `Daily Elixir · ${this.session.dateKey}`;
      this.dom.winNextBtn.textContent = 'Daily Calendar';
    } else {
      this.dom.winSub.textContent = `${this.session.title} Complete`;
      this.dom.winNextBtn.textContent = 'Brew Another';
    }

    this._persistSave();

    // Only interrupt flow with a popup when a new cosmetic gift is unlocked!
    if (newlyUnlocked.length > 0) {
      this.isAnimating = false;
      this.dom.winTitle.textContent = msg;

      const gift = newlyUnlocked[0];
      this.dom.winUnlockBox.classList.remove('hidden');
      this.dom.winUnlockName.textContent = `${gift.kind}: ${gift.item.name}`;
      this.dom.winUnlockEquip.onclick = () => {
        if (gift.kind === 'Theme') this.save.settings.theme = gift.item.id;
        if (gift.kind === 'Bottle') this.save.settings.bottleStyle = gift.item.id;
        if (gift.kind === 'Palette') this.save.settings.palette = gift.item.id;
        this._applyVisualSettings();
        this._renderBoard();
        this._persistSave();
        this._showToast(`Equipped ${gift.item.name} ✦`);
      };

      const nextMilestone = getNextUnlockMilestone(this.save.highestCompletedLevel + 1);
      if (nextMilestone) {
        const left = Math.max(1, nextMilestone.item.unlockLevel - (this.save.highestCompletedLevel + 1));
        this.dom.winProgressNote.textContent = `Next gift in ${left} ${left === 1 ? 'level' : 'levels'}: ${nextMilestone.item.name}`;
      } else {
        this.dom.winProgressNote.textContent = '';
      }

      this._openModal('winModal');
      return;
    }

    // No unlock: celebrate gently on the shelf and seamlessly flow into the next level
    const toastText =
      this.session.mode === 'daily' ? 'Daily Elixir Complete ☾' : `${msg} ✦`;
    this._showToast(toastText);

    this.winAdvanceTimer = setTimeout(() => {
      this.dom.boardStage.classList.add('transitioning');
      this.winFadeTimer = setTimeout(() => {
        this.isAnimating = false;
        this._handleWinNext();
        requestAnimationFrame(() => {
          this.dom.boardStage.classList.remove('transitioning');
        });
      }, 280);
    }, 1050);
  }

  _handleWinNext() {
    this._closeAllModals();
    if (!this.session) {
      this._loadCampaignLevel(this.save.currentJourneyLevel);
      return;
    }
    if (this.session.mode === 'journey') {
      this._loadCampaignLevel(this.save.currentJourneyLevel);
    } else if (this.session.mode === 'zen') {
      this._startZenLevel(this.session.zenDifficulty || 'relaxing');
    } else if (this.session.mode === 'daily') {
      this._openDailyModal();
    }
  }

  // ==================== COLLECTION DRAWER ====================
  _openCollectionModal() {
    this._renderCollectionGrid();
    this._openModal('collectionModal');
  }

  _renderCollectionGrid() {
    const grid = this.dom.collectionGrid;
    grid.innerHTML = '';
    const unlockedLevel = Math.max(1, this.save.highestCompletedLevel + 1);

    if (this.collectionTab === 'themes') {
      for (const theme of THEMES) {
        const locked = theme.unlockLevel > unlockedLevel;
        const selected = this.save.settings.theme === theme.id;
        const card = this._makeChoiceCard(
          theme.name,
          locked ? `Unlocks at Level ${theme.unlockLevel}` : theme.subtitle,
          selected,
          locked,
          theme.previewColors
        );
        if (!locked) {
          card.addEventListener('click', () => {
            this.save.settings.theme = theme.id;
            this._applyVisualSettings();
            this._persistSave();
            this._renderCollectionGrid();
            sound.playSelect();
          });
        }
        grid.appendChild(card);
      }
    } else if (this.collectionTab === 'bottles') {
      for (const style of BOTTLE_STYLES) {
        const locked = style.unlockLevel > unlockedLevel;
        const selected = this.save.settings.bottleStyle === style.id;
        const card = this._makeChoiceCard(
          style.name,
          locked ? `Unlocks at Level ${style.unlockLevel}` : style.subtitle,
          selected,
          locked,
          null,
          style.id
        );
        if (!locked) {
          card.addEventListener('click', () => {
            this.save.settings.bottleStyle = style.id;
            this._persistSave();
            this._renderCollectionGrid();
            if (this.session && this.activePourCount === 0) this._renderBoard();
            sound.playSelect();
          });
        }
        grid.appendChild(card);
      }
    } else {
      for (const pal of PALETTES) {
        const locked = pal.unlockLevel > unlockedLevel;
        const selected = this.save.settings.palette === pal.id;
        const card = this._makeChoiceCard(
          pal.name,
          locked ? `Unlocks at Level ${pal.unlockLevel}` : pal.subtitle,
          selected,
          locked,
          pal.swatches
        );
        if (!locked) {
          card.addEventListener('click', () => {
            this.save.settings.palette = pal.id;
            this._applyVisualSettings();
            this._persistSave();
            this._renderCollectionGrid();
            sound.playSelect();
          });
        }
        grid.appendChild(card);
      }
    }
  }

  _makeChoiceCard(name, sub, selected, locked, swatches, bottleStyleId = null) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-card';
    if (selected) btn.classList.add('selected');
    if (locked) btn.classList.add('locked');

    if (bottleStyleId) {
      const row = document.createElement('div');
      row.className = 'choice-card-row';

      const previewWrap = document.createElement('div');
      previewWrap.className = 'bottle-preview-wrap';
      previewWrap.appendChild(createBottlePreviewSvg(bottleStyleId));
      row.appendChild(previewWrap);

      const info = document.createElement('div');
      info.className = 'choice-card-info';

      const title = document.createElement('div');
      title.className = 'choice-name';
      title.innerHTML = `<span>${name}</span><span>${selected ? '✦' : locked ? '🔒' : ''}</span>`;
      info.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'choice-sub';
      desc.textContent = sub;
      info.appendChild(desc);

      row.appendChild(info);
      btn.appendChild(row);
      return btn;
    }

    const title = document.createElement('div');
    title.className = 'choice-name';
    title.innerHTML = `<span>${name}</span><span>${selected ? '✦' : locked ? '🔒' : ''}</span>`;
    btn.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'choice-sub';
    desc.textContent = sub;
    btn.appendChild(desc);

    if (swatches && swatches.length > 0) {
      const row = document.createElement('div');
      row.className = 'swatch-row';
      for (const color of swatches) {
        const dot = document.createElement('span');
        dot.className = 'swatch-dot';
        dot.style.background = color;
        row.appendChild(dot);
      }
      btn.appendChild(row);
    }

    return btn;
  }

  // ==================== DAILY ELIXIR CALENDAR ====================
  _openDailyModal() {
    const grid = this.dom.dailyGrid;
    grid.innerHTML = '';

    const todayKey = getTodayKey();
    const days = [];
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let offset = 27; offset >= 0; offset--) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        key,
        dayNum: d.getDate(),
        dow: dowNames[d.getDay()],
        isToday: key === todayKey,
        done: this.save.dailyCompleted.includes(key),
      });
    }

    const doneCount = days.filter((d) => d.done).length;
    this.dom.dailyProgressText.textContent = `${doneCount} of last 28 brews enjoyed — play any day at your own pace`;

    for (const day of days) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'daily-cell';
      if (day.isToday) cell.classList.add('today');
      if (day.done) cell.classList.add('done');

      cell.innerHTML = `
        <span class="daily-cell-dow">${day.isToday ? 'Today' : day.dow}</span>
        <span>${day.dayNum}</span>
        <span class="daily-cell-mark">${day.done ? '☾' : ''}</span>
      `;
      cell.addEventListener('click', () => {
        this._closeAllModals();
        this._startDailyLevel(day.key);
      });
      grid.appendChild(cell);
    }

    this._openModal('dailyModal');
  }

  // ==================== SETTINGS SHEET ====================
  _openSettingsModal() {
    this._syncSettingsUi();
    this._openModal('settingsModal');
  }

  _syncSettingsUi() {
    this.dom.toggleSfx.checked = this.save.settings.sfx;
    this.dom.toggleSymbols.checked = this.save.settings.showSymbols;
    this.dom.toggleClassic.checked = this.save.settings.pureClassic;
  }

  async _exportSaveCode() {
    const compact = {
      h: this.save.highestCompletedLevel,
      c: this.save.currentJourneyLevel,
      d: this.save.dailyCompleted,
      t: this.save.seenTwists,
      s: this.save.settings,
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
    try {
      await navigator.clipboard.writeText(code);
      this._showToast('Progress backup code copied');
    } catch (_) {
      window.prompt('Copy your Moonlight Elixirs backup code:', code);
    }
  }

  _importSaveCode() {
    const input = window.prompt('Paste your Moonlight Elixirs backup code:');
    if (!input) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(input.trim()))));
      if (typeof parsed.c !== 'number') throw new Error('Invalid code');
      this.save.highestCompletedLevel = parsed.h || 0;
      this.save.currentJourneyLevel = Math.max(1, parsed.c || 1);
      this.save.dailyCompleted = Array.isArray(parsed.d) ? parsed.d : [];
      if (Array.isArray(parsed.t)) this.save.seenTwists = parsed.t;
      if (parsed.s) this.save.settings = { ...this.save.settings, ...parsed.s };
      this._applyVisualSettings();
      this._applyAudioSettings();
      this._syncSettingsUi();
      this._persistSave();
      this._renderHome();
      this._showToast('Progress restored ✦');
    } catch (_) {
      this._showToast('Could not read that backup code');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__moonlightApp = new MoonlightApp();
});
