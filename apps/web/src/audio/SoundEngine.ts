import type { GameAudio } from '../game/GameController';

type Kind = 'ball' | 'cushion' | 'pocket' | 'cue';

const VOICES: Record<Kind, { freq: number; q: number; decay: number; gain: number; ref: number }> =
  {
    ball: { freq: 3400, q: 6, decay: 0.05, gain: 1.1, ref: 3500 },
    cushion: { freq: 520, q: 2, decay: 0.09, gain: 0.9, ref: 3000 },
    pocket: { freq: 180, q: 2, decay: 0.24, gain: 1, ref: 1 },
    cue: { freq: 1700, q: 3, decay: 0.05, gain: 0.9, ref: 6000 },
  };

/**
 * Sons sintetizados com ruído filtrado (sem arquivos de áudio).
 * O navegador só libera áudio após uma interação: chame `unlock()` no primeiro toque.
 */
export class SoundEngine implements GameAudio {
  muted = false;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private last: Partial<Record<Kind, number>> = {};

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      const n = Math.floor(this.ctx.sampleRate * 0.3);
      this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    } catch {
      this.ctx = null;
    }
  }

  private play(kind: Kind, strength: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || this.muted) return;
    const now = ctx.currentTime;
    if ((this.last[kind] ?? -1) > now - 0.018) return;
    this.last[kind] = now;
    const v = VOICES[kind];
    const gain = Math.min(1, Math.pow(strength, 0.7)) * v.gain;
    if (gain < 0.02) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = v.freq;
    filter.Q.value = v.q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain * 0.6, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + v.decay);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(now);
    src.stop(now + v.decay + 0.02);
  }

  cue(speed: number): void {
    this.play('cue', speed / VOICES.cue.ref);
  }
  ball(speed: number): void {
    this.play('ball', speed / VOICES.ball.ref);
  }
  cushion(speed: number): void {
    this.play('cushion', speed / VOICES.cushion.ref);
  }
  pocket(): void {
    this.play('pocket', 0.9);
  }
}
