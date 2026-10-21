import type { GameAudio } from '../game/GameController';
import ballSample from './samples/billiard-clack.mp3?inline';
import cueSample from './samples/cue.ogg?inline';
import cushionSample from './samples/cushion.ogg?inline';
import pocketSample from './samples/pocket.ogg?inline';

type Kind = 'ball' | 'cushion' | 'pocket' | 'cue';
const SAMPLES: Record<Kind, string> = {
  ball: ballSample,
  cue: cueSample,
  cushion: cushionSample,
  pocket: pocketSample,
};
const VOICES: Record<Kind, { ref: number; gain: number; cutoff: number; duration: number }> = {
  ball: { ref: 3500, gain: 0.8, cutoff: 12000, duration: 0.24 },
  cue: { ref: 6000, gain: 0.6, cutoff: 6500, duration: 0.14 },
  cushion: { ref: 3000, gain: 0.65, cutoff: 1800, duration: 0.18 },
  pocket: { ref: 1, gain: 0.7, cutoff: 3000, duration: 0.28 },
};

/** Amostras CC0, intensidade física, panorama estéreo e limite de vozes na saída. */
export class SoundEngine implements GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buffers: Partial<Record<Kind, AudioBuffer>> = {};
  private loading: Promise<void> | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private pending = new Map<Kind, { strength: number; pan: number }>();
  private flushQueued = false;
  private volumeValue = 0.7;
  private mutedValue = false;

  get muted(): boolean {
    return this.mutedValue;
  }
  set muted(value: boolean) {
    this.mutedValue = value;
    this.updateVolume();
  }
  get volume(): number {
    return this.volumeValue;
  }
  set volume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volumeValue = Math.max(0, Math.min(1, value));
    this.updateVolume();
  }
  private updateVolume(): void {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.015);
  }

  /** Falha de áudio nunca impede uma partida. */
  async unlock(): Promise<void> {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -10;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.12;
        this.master.connect(this.compressor).connect(this.ctx.destination);
        const ctx = this.ctx;
        this.loading = Promise.all(
          (Object.keys(SAMPLES) as Kind[]).map(async (kind) => {
            try {
              const response = await fetch(SAMPLES[kind]);
              if (!response.ok) return;
              this.buffers[kind] = await ctx.decodeAudioData(await response.arrayBuffer());
            } catch {
              // O fallback cobre formatos não suportados e falhas de leitura.
            }
          }),
        ).then(() => undefined);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      await this.loading;
    } catch {
      // Navegadores sem Web Audio continuam funcionando sem som.
    }
  }

  private fallback(kind: Kind): AudioBuffer {
    const ctx = this.ctx!;
    const duration = VOICES[kind].duration;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const freq = kind === 'ball' ? 2200 : kind === 'cue' ? 1200 : 160;
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.exp((-t * 9) / duration);
      data[i] = (Math.sin(t * Math.PI * 2 * freq) * 0.5 + (Math.random() - 0.5) * 0.6) * envelope;
    }
    return buffer;
  }

  private enqueue(kind: Kind, strength: number, pan = 0): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted || strength < 0.015) return;
    const previous = this.pending.get(kind);
    if (!previous || strength > previous.strength) this.pending.set(kind, { strength, pan });
    if (this.flushQueued) return;
    this.flushQueued = true;
    // A saída produz muitos contatos no mesmo quadro: preserva o mais forte de cada material.
    queueMicrotask(() => {
      this.flushQueued = false;
      for (const [kind, hit] of this.pending) this.play(kind, hit.strength, hit.pan);
      this.pending.clear();
    });
  }

  private play(kind: Kind, strength: number, pan: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || this.sources.size >= 24) return;
    const voice = VOICES[kind];
    const intensity = Math.min(1, Math.max(0, strength));
    const source = ctx.createBufferSource();
    source.buffer = this.buffers[kind] ??= this.fallback(kind);
    source.playbackRate.value = 0.96 + Math.random() * 0.08;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = voice.cutoff * (0.5 + intensity * 0.5);
    const amp = ctx.createGain();
    const now = ctx.currentTime;
    const duration = Math.min(voice.duration, source.buffer.duration / source.playbackRate.value);
    const level = Math.pow(intensity, 0.65) * voice.gain;
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(level, now + 0.001);
    amp.gain.setValueAtTime(level, now + Math.max(0.001, duration - 0.025));
    amp.gain.linearRampToValueAtTime(0, now + duration);
    const stereo = ctx.createStereoPanner();
    stereo.pan.value = Math.max(-0.65, Math.min(0.65, pan * 0.65));
    source.connect(filter).connect(amp).connect(stereo).connect(this.master);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      filter.disconnect();
      amp.disconnect();
      stereo.disconnect();
    };
    source.start(now);
    source.stop(now + duration);
  }

  cue(speed: number, pan = 0): void {
    this.enqueue('cue', speed / VOICES.cue.ref, pan);
  }
  ball(speed: number, pan = 0): void {
    this.enqueue('ball', speed / VOICES.ball.ref, pan);
  }
  cushion(speed: number, pan = 0): void {
    this.enqueue('cushion', speed / VOICES.cushion.ref, pan);
  }
  pocket(pan = 0): void {
    this.enqueue('pocket', 0.9, pan);
  }
}
