// Web Audio synth-based SFX — no asset files needed, zero install.
// Generates short blips/zaps procedurally. Safe to call before user gesture
// (AudioContext resumes lazily on first interaction). Commercial polish pass:
// soft master gain, dynamics compressor, and per-effect throttling to reduce
// clipping/harsh repetition during dense waves.

import { getAudioContext } from './audioContext';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private muted = false;
  private readonly lastPlayed = new Map<string, number>();
  private readonly masterVolume = 0.2;

  private ensure(): void {
    if (this.ctx) return;
    this.ctx = getAudioContext();
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.master.gain.value = this.muted ? 0 : this.masterVolume;
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 24;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.006;
      this.compressor.release.value = 0.16;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
  }

  resume(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.masterVolume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private canPlay(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < minGapMs) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  private synth(f1: number, f2: number, dur: number, type: OscillatorType = 'square', vol = 0.5): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f1), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  shoot(id: string): void {
    if (this.muted) return;
    if (!this.canPlay(`shoot:${id}`, id === 'tesla' ? 42 : 55)) return;
    if (id === 'sniper') {
      this.synth(400, 80, 0.22, 'sawtooth', 0.2); // Heavy sniper thump
    } else if (id === 'mortar' || id === 'cannon') {
      this.synth(200, 50, 0.32, 'triangle', 0.28); // Mortar launch boom
    } else if (id === 'frost') {
      this.synth(900, 300, 0.13, 'sine', 0.2); // Frost chime
    } else if (id === 'tesla') {
      this.synth(1200, 800, 0.07, 'sawtooth', 0.16); // Tesla electric zap
    } else {
      this.synth(800, 200, 0.08, 'sawtooth', 0.12); // Regular turret chirp
    }
  }

  hit(): void {
    if (!this.canPlay('hit', 34)) return;
    this.synth(180, 60, 0.07, 'triangle', 0.15); // deep solid impact thud
  }

  enemyDie(): void {
    if (!this.canPlay('enemyDie', 48)) return;
    this.synth(140, 30, 0.2, 'sawtooth', 0.2); // rumbling explosion sound
  }

  place(): void {
    if (!this.canPlay('place', 60)) return;
    this.synth(440, 880, 0.11, 'sine', 0.25); // positive rising UI sweep
  }

  lifeLost(): void {
    if (!this.canPlay('lifeLost', 250)) return;
    this.synth(300, 150, 0.15, 'sawtooth', 0.3); // alarm chirp
    window.setTimeout(() => this.synth(200, 100, 0.18, 'sawtooth', 0.3), 80);
  }

  waveStart(): void {
    if (!this.canPlay('waveStart', 250)) return;
    this.synth(220, 440, 0.18, 'sawtooth', 0.22);
    window.setTimeout(() => this.synth(330, 660, 0.22, 'sawtooth', 0.2), 120);
  }

  spellCast(id: string): void {
    if (this.muted) return;
    if (!this.canPlay(`spell:${id}`, 280)) return;
    if (id === 'meteor') {
      // Roaring impact + rumble, softened by compressor.
      this.synth(300, 60, 0.5, 'sawtooth', 0.34);
      window.setTimeout(() => this.synth(120, 30, 0.6, 'triangle', 0.34), 100);
    } else if (id === 'freeze') {
      // Shimmering upward sweep.
      this.synth(500, 1500, 0.32, 'sine', 0.24);
      window.setTimeout(() => this.synth(700, 2100, 0.28, 'sine', 0.16), 50);
    } else if (id === 'repair') {
      // Harmonious ascending healing chime.
      this.synth(523, 1046, 0.18, 'sine', 0.24);
      window.setTimeout(() => this.synth(659, 1318, 0.18, 'sine', 0.22), 100);
      window.setTimeout(() => this.synth(784, 1568, 0.26, 'sine', 0.22), 200);
    }
  }

  win(): void {
    if (!this.canPlay('win', 900)) return;
    this.synth(523, 1046, 0.15, 'sine', 0.28);
    window.setTimeout(() => this.synth(659, 1318, 0.15, 'sine', 0.28), 140);
    window.setTimeout(() => this.synth(784, 1568, 0.25, 'sine', 0.28), 280);
  }

  lose(): void {
    if (!this.canPlay('lose', 900)) return;
    this.synth(220, 80, 0.28, 'sawtooth', 0.28);
    window.setTimeout(() => this.synth(110, 40, 0.45, 'sawtooth', 0.28), 200);
  }

  achievement(): void {
    if (!this.canPlay('achievement', 500)) return;
    this.synth(523.25, 783.99, 0.28, 'sine', 0.18);
    window.setTimeout(() => this.synth(659.25, 1046.50, 0.36, 'sine', 0.15), 120);
  }
}
