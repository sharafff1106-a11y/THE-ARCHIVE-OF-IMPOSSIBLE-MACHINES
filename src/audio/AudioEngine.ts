/**
 * Procedural sound for the archive. No samples, no music, no licences.
 *
 * Everything is synthesised with the Web Audio API on demand. The context
 * is only created after the visitor explicitly turns sound on (a user
 * gesture), and every public method is a no-op while disabled, so callers
 * never have to check.
 */

type Hum = {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  sub: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lfo: OscillatorNode;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hum: Hum | null = null;
  private enabled = false;

  get isEnabled() {
    return this.enabled;
  }

  enable() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(comp).connect(this.ctx.destination);
      this.noise = this.makeNoise();
    }
    this.enabled = true;
    void this.ctx.resume();
    this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.15);
  }

  disable() {
    this.enabled = false;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    const ctx = this.ctx;
    window.setTimeout(() => {
      if (!this.enabled) void ctx.suspend();
    }, 400);
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private ready() {
    return this.enabled && this.ctx && this.master ? this.ctx : null;
  }

  private envGain(ctx: AudioContext, peak: number, attack: number, decay: number, at = ctx.currentTime) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    g.connect(this.master!);
    return g;
  }

  private noiseBurst(freq: number, q: number, peak: number, decay: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ready();
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.envGain(ctx, peak, 0.002, decay));
    src.start(ctx.currentTime, Math.random());
    src.stop(ctx.currentTime + decay + 0.05);
  }

  private tone(freq: number, type: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number) {
    const ctx = this.ready();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + attack + decay);
    osc.connect(this.envGain(ctx, peak, attack, decay));
    osc.start();
    osc.stop(ctx.currentTime + attack + decay + 0.05);
  }

  // ── Interface vocabulary ────────────────────────────────

  /** Dry relay click for UI. */
  click() {
    this.noiseBurst(3800, 6, 0.18, 0.025);
    this.tone(1900, 'square', 0.02, 0.001, 0.02);
  }

  /** Detent of a mechanical dial. `pitch` 0..1 rises with value. */
  tick(pitch = 0) {
    this.noiseBurst(2200 + pitch * 2600, 9, 0.12, 0.018);
  }

  /** Heavy lever / latch. */
  thunk() {
    this.tone(120, 'sine', 0.5, 0.004, 0.32, 48);
    this.noiseBurst(500, 1.2, 0.25, 0.12, 'lowpass');
  }

  /** Fingernail on borosilicate. */
  glass() {
    [2637, 3951, 5274].forEach((f, i) => this.tone(f * (1 + Math.random() * 0.004), 'sine', 0.05 / (i + 1), 0.002, 1.1 - i * 0.25));
  }

  /** Soft data blip for readouts. */
  blip(high = false) {
    this.tone(high ? 1320 : 880, 'triangle', 0.035, 0.002, 0.06);
  }

  /** A warning that does not quite commit to being alarming. */
  warn() {
    this.tone(415, 'sawtooth', 0.04, 0.01, 0.25);
    window.setTimeout(() => this.tone(392, 'sawtooth', 0.04, 0.01, 0.35), 180);
  }

  /** The sound of something being kept. */
  stored() {
    const ctx = this.ready();
    if (!ctx) return;
    [196, 293.66, 392, 587.33].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.envGain(ctx, 0.06 / (i * 0.6 + 1), 0.9, 3.4, ctx.currentTime + i * 0.12);
      osc.connect(g);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 4.5);
    });
  }

  // ── Memory Engine hum ───────────────────────────────────

  humStart() {
    const ctx = this.ready();
    if (!ctx || this.hum) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 6;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const sub = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    sub.type = 'sine';
    oscA.frequency.value = 55;
    oscB.frequency.value = 55.4;
    sub.frequency.value = 27.5;
    // slow mechanical wobble on the filter
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.35;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain).connect(filter.frequency);
    oscA.connect(filter);
    oscB.connect(filter);
    sub.connect(gain);
    filter.connect(gain).connect(this.master!);
    [oscA, oscB, sub, lfo].forEach((o) => o.start());
    this.hum = { oscA, oscB, sub, filter, gain, lfo };
  }

  /** level 0..1 — machine energy. */
  humSet(level: number) {
    const ctx = this.ctx;
    const h = this.hum;
    if (!ctx || !h || !this.enabled) return;
    const t = ctx.currentTime;
    const base = 55 * (1 + level * 0.5);
    h.oscA.frequency.setTargetAtTime(base, t, 0.2);
    h.oscB.frequency.setTargetAtTime(base * 1.007 + level * 1.5, t, 0.2);
    h.sub.frequency.setTargetAtTime(base / 2, t, 0.2);
    h.filter.frequency.setTargetAtTime(160 + level * level * 1600, t, 0.15);
    h.lfo.frequency.setTargetAtTime(0.35 + level * 6, t, 0.3);
    h.gain.gain.setTargetAtTime(0.05 + level * 0.14, t, 0.2);
  }

  /** Cut the hum instantly. Not a fade: silence must feel like an event. */
  silence() {
    if (!this.ctx || !this.hum) return;
    this.hum.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.hum.gain.gain.setValueAtTime(0, this.ctx.currentTime);
  }

  humStop() {
    const h = this.hum;
    if (!h || !this.ctx) return;
    this.hum = null;
    const t = this.ctx.currentTime;
    h.gain.gain.setTargetAtTime(0, t, 0.1);
    [h.oscA, h.oscB, h.sub, h.lfo].forEach((o) => o.stop(t + 0.6));
  }
}

export const audio = new AudioEngine();
