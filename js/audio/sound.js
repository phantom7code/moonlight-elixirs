/**
 * Moonlight Elixirs — Procedural Cozy ASMR Web Audio Engine
 * Zero external audio assets; 100% offline-ready and iPad Safari friendly.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.noiseBuffer = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      this.noiseBuffer = this._createPinkNoiseBuffer(this.ctx, 3.0);
    }
    return this.ctx;
  }

  _createPinkNoiseBuffer(ctx, durationSec) {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }

  unlockFromGesture() {
    this.ensureContext();
  }

  /** Delicate glass clink when lifting a flask */
  playSelect() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    harm.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.06);
    harm.frequency.setValueAtTime(1760, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.25;

    osc.connect(gain);
    harm.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    harm.start(now);
    osc.stop(now + 0.16);
    harm.stop(now + 0.16);
  }

  /** Soft set-down glass tap when deselecting */
  playDeselect() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Gentle muted wood thud for invalid pour (never harsh) */
  playInvalid() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Soothing ASMR liquid pour with subtle rising pitch and droplet blips */
  playPour(movedCount = 1, fillRatioAfter = 0.5) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const duration = Math.min(0.62, 0.28 + movedCount * 0.10);

    // Filtered liquid stream
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    const startFreq = 460 + fillRatioAfter * 220;
    const endFreq = startFreq + 260 + movedCount * 75;
    bp.frequency.setValueAtTime(startFreq, now);
    bp.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const streamGain = ctx.createGain();
    streamGain.gain.setValueAtTime(0.0001, now);
    streamGain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    streamGain.gain.setValueAtTime(0.14, now + duration - 0.09);
    streamGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.04);

    src.connect(bp);
    bp.connect(streamGain);
    streamGain.connect(ctx.destination);
    src.start(now, Math.random() * 1.5);
    src.stop(now + duration + 0.06);

    // Gentle rising bubble/droplet tones
    const dropCount = 3 + movedCount * 2;
    for (let i = 0; i < dropCount; i++) {
      const t = now + 0.04 + (i / dropCount) * (duration - 0.08) + Math.random() * 0.025;
      const progress = i / Math.max(1, dropCount - 1);
      const basePitch = 340 + fillRatioAfter * 180 + progress * 240 + (Math.random() * 40 - 20);

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(basePitch * 0.84, t);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 1.18, t + 0.055);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.075);
    }
  }

  /** Satisfying wooden cork pop + warm harmonic chime on completed flask */
  playCork() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Soft cork pop
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(240, now);
    popOsc.frequency.exponentialRampToValueAtTime(540, now + 0.045);
    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.11, now + 0.008);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.085);

    // 2. Warm celesta sparkle triad
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, idx) => {
      const t = now + 0.055 + idx * 0.065;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055 - idx * 0.008, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  /** Magical shimmer when a ribboned flask unties or mystery layer reveals */
  playShimmer() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [783.99, 987.77, 1174.66];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /** Warm harp arpeggio on level completion */
  playLevelWin() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chord = [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66]; // G major 9 lush chord
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const g = ctx.createGain();
      const og = ctx.createGain();

      osc.type = 'sine';
      overtone.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      overtone.frequency.setValueAtTime(freq * 2, t);
      og.gain.value = 0.14;

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.065, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);

      osc.connect(g);
      overtone.connect(og);
      og.connect(g);
      g.connect(ctx.destination);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + 1.2);
      overtone.stop(t + 1.2);
    });
  }
}

export const sound = new SoundEngine();
