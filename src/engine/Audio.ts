// Web Audio synth-based SFX — no asset files needed, zero install.
// Generates short blips/zaps procedurally. Safe to call before user gesture
// (AudioContext resumes lazily on first interaction).

import { getAudioContext } from './audioContext';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  private ensure(): void {
    if (this.ctx) return;
    this.ctx = getAudioContext();
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.25;
      this.master.connect(this.ctx.destination);
    }
  }

  resume(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.25;
  }

  isMuted(): boolean {
    return this.muted;
  }



  private synth(f1: number, f2: number, dur: number, type: OscillatorType = 'square', vol = 0.5): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  shoot(): void {
    this.synth(800, 200, 0.1, 'sawtooth', 0.15); // futuristic laser chirp
  }

  hit(): void {
    this.synth(180, 60, 0.08, 'triangle', 0.22); // deep solid impact thud
  }

  enemyDie(): void {
    this.synth(140, 30, 0.22, 'sawtooth', 0.25); // rumbling explosion sound
  }

  place(): void {
    this.synth(440, 880, 0.12, 'sine', 0.3); // positive rising UI sweep
  }

  waveStart(): void {
    this.synth(220, 440, 0.2, 'sawtooth', 0.25);
    window.setTimeout(() => this.synth(330, 660, 0.25, 'sawtooth', 0.25), 120);
  }

  spellCast(id: string): void {
    if (this.muted) return;
    if (id === 'meteor') {
      // Roaring impact + rumble
      this.synth(300, 60, 0.55, 'sawtooth', 0.4);
      window.setTimeout(() => this.synth(120, 30, 0.7, 'triangle', 0.45), 100);
    } else if (id === 'freeze') {
      // Shimmering upward sweep
      this.synth(500, 1500, 0.35, 'sine', 0.3);
      window.setTimeout(() => this.synth(700, 2100, 0.3, 'sine', 0.2), 50);
    } else if (id === 'repair') {
      // Harmonious ascending healing chime
      this.synth(523, 1046, 0.2, 'sine', 0.3);
      window.setTimeout(() => this.synth(659, 1318, 0.2, 'sine', 0.3), 100);
      window.setTimeout(() => this.synth(784, 1568, 0.3, 'sine', 0.3), 200);
    }
  }

  win(): void {
    this.synth(523, 1046, 0.15, 'sine', 0.35);
    window.setTimeout(() => this.synth(659, 1318, 0.15, 'sine', 0.35), 140);
    window.setTimeout(() => this.synth(784, 1568, 0.25, 'sine', 0.35), 280);
  }

  lose(): void {
    this.synth(220, 80, 0.3, 'sawtooth', 0.35);
    window.setTimeout(() => this.synth(110, 40, 0.5, 'sawtooth', 0.35), 200);
  }
}
