// Procedural background music via Web Audio — a slow drone + arpeggio loop.
// No asset files. Starts on user gesture, looped, low volume, toggleable.

import { getAudioContext } from './audioContext';

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private schedulerId = 0;
  private nextNoteTime = 0;
  private playing = false;
  private muted = false;
  private step = 0;
  private readonly notesPlaying = new Set<OscillatorNode>();

  // minor pentatonic — pleasant, tension-appropriate
  private readonly notes = [196, 233, 262, 294, 349]; // G3 A#3 C4 D4 F4

  ensure(): void {
    if (this.ctx) return;
    this.ctx = getAudioContext();
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
  }

  start(): void {
    if (this.muted || this.playing) return;
    this.ensure();
    if (this.ctx?.state !== 'running' || !this.master) return;
    this.playing = true;
    this.master.gain.value = 0.08;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.schedule();
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    window.clearTimeout(this.schedulerId);
    if (this.master) this.master.gain.value = 0;
    for (const note of this.notesPlaying) note.stop();
    this.notesPlaying.clear();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) this.stop();
  }

  private schedule = (): void => {
    if (!this.playing || !this.ctx || !this.master) return;
    if (this.ctx.state !== 'running') { this.stop(); return; }
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now) this.nextNoteTime = now + 0.02;
    if (this.nextNoteTime < now + 0.2) {
      const freq = this.notes[this.step % this.notes.length];
      this.blip(this.nextNoteTime, freq, 0.45, 'sine', 0.4);
      // bass drone every 4 steps
      if (this.step % 4 === 0) this.blip(this.nextNoteTime, 98, 1.6, 'triangle', 0.6);
      this.nextNoteTime += 0.45;
      this.step++;
    }
    this.schedulerId = window.setTimeout(this.schedule, 100);
  };

  private blip(t: number, freq: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
    this.notesPlaying.add(osc);
    osc.onended = () => { this.notesPlaying.delete(osc); osc.disconnect(); g.disconnect(); };
  }
}
