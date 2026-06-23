// Procedural background music via Web Audio — a slow drone + arpeggio loop.
// No asset files. Starts on user gesture, looped, low volume, toggleable.

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private schedulerId = 0;
  private nextNoteTime = 0;
  private playing = false;
  private muted = false;
  private step = 0;

  // minor pentatonic — pleasant, tension-appropriate
  private readonly notes = [196, 233, 262, 294, 349]; // G3 A#3 C4 D4 F4

  ensure(): void {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.08;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  start(): void {
    this.ensure();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.schedule();
  }

  stop(): void {
    this.playing = false;
    cancelAnimationFrame(this.schedulerId);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.08;
  }

  private schedule = (): void => {
    if (!this.playing || !this.ctx || !this.master) return;
    const ahead = 0.2;
    while (this.nextNoteTime < this.ctx.currentTime + ahead) {
      const freq = this.notes[this.step % this.notes.length];
      this.blip(freq, 0.45, 'sine', 0.4);
      // bass drone every 4 steps
      if (this.step % 4 === 0) this.blip(98, 1.6, 'triangle', 0.6);
      this.nextNoteTime += 0.45;
      this.step++;
    }
    this.schedulerId = requestAnimationFrame(this.schedule);
  };

  private blip(freq: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
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
  }
}
