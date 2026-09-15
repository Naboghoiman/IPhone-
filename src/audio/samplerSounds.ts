/**
 * Real-time synthesized DJ sound effects for the 8 Performance MPC pads.
 * Produces crisp, punchy audio using standard Web Audio nodes.
 */

export class SamplerAudioEngine {
  private audioCtx: AudioContext | null = null;

  constructor(ctx?: AudioContext) {
    if (ctx) this.audioCtx = ctx;
  }

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // 1. KICK (Punchy sub bass kick)
  public playKick(volume = 0.9) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // 2. SNARE (909 style crisp snare)
  public playSnare(volume = 0.8) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Noise buffer
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

    oscGain.gain.setValueAtTime(volume * 0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.2);
    osc.stop(now + 0.2);
  }

  // 3. CLAP (Layered 808 clap)
  public playClap(volume = 0.8) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.8;

    const clapGain = ctx.createGain();
    // 3 quick pre-bursts
    clapGain.gain.setValueAtTime(0, now);
    clapGain.gain.setValueAtTime(volume * 0.7, now + 0.01);
    clapGain.gain.setValueAtTime(0.05, now + 0.02);
    clapGain.gain.setValueAtTime(volume * 0.8, now + 0.03);
    clapGain.gain.setValueAtTime(0.05, now + 0.04);
    clapGain.gain.setValueAtTime(volume, now + 0.05);
    clapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    noise.connect(filter);
    filter.connect(clapGain);
    clapGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  // 4. HI-HAT (Metallic closed hat)
  public playHiHat(volume = 0.7) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.07);
  }

  // 5. VOCAL (Synthesized vocal formant "HEY!")
  public playVocal(volume = 0.8) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 800;
    f1.Q.value = 4.0;

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1800;
    f2.Q.value = 4.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // 6. AIRHORN (Authentic Jamaican DJ Airhorn!)
  public playAirhorn(volume = 0.85) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const freqs = [370, 466, 554, 740]; // Multi-tone cluster
    const dur = 0.45;

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      // Pitch vibrato / drop
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.02, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + dur);

      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.setValueAtTime(volume * 0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur);
    });
  }

  // 7. RISER (Club build sweep)
  public playRiser(volume = 0.8) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const dur = 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(8000, now + dur);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(volume * 0.8, now + dur * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur);
  }

  // 8. DROP (Sub rumble impact)
  public playDrop(volume = 0.9) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const dur = 0.9;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(20, now + dur);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur);
  }
}

export const samplerEngine = new SamplerAudioEngine();
