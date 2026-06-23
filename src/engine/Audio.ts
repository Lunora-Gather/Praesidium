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

  private blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.5): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  shoot(): void {
    this.blip(660, 0.08, 'square', 0.18);
  }

  hit(): void {
    this.blip(220, 0.06, 'triangle', 0.25);
  }

  enemyDie(): void {
    this.blip(140, 0.18, 'sawtooth', 0.3);
  }

  place(): void {
    this.blip(440, 0.12, 'sine', 0.35);
  }

  waveStart(): void {
    this.blip(330, 0.15, 'sawtooth', 0.3);
    window.setTimeout(() => this.blip(494, 0.2, 'sawtooth', 0.3), 130);
  }

  win(): void {
    this.blip(523, 0.15, 'sine', 0.35);
    window.setTimeout(() => this.blip(659, 0.15, 'sine', 0.35), 140);
    window.setTimeout(() => this.blip(784, 0.25, 'sine', 0.35), 280);
  }

  lose(): void {
    this.blip(220, 0.3, 'sawtooth', 0.35);
    window.setTimeout(() => this.blip(110, 0.5, 'sawtooth', 0.35), 200);
  }
}
