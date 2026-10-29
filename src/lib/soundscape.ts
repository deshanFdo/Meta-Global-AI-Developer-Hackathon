// ============================================
// Procedural Web Audio Soundscape Synthesizer
// Pure algorithmic sound generation - zero external audio assets
// ============================================

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private windGain: GainNode | null = null;
  private birdInterval: ReturnType<typeof setInterval> | null = null;
  private cricketInterval: ReturnType<typeof setInterval> | null = null;
  private isNightMode: boolean = false;
  private isWalking: boolean = false;
  private lastFootstepTime: number = 0;

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startAmbience();
    } else {
      this.stopAmbience();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setNightMode(night: boolean) {
    this.isNightMode = night;
    if (!this.isMuted) {
      this.stopAmbience();
      this.startAmbience();
    }
  }

  private startAmbience() {
    if (!this.ctx || this.isMuted) return;

    // 1. Procedural Soft Wind (Pink noise buffer filtered through dynamic bandpass)
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.isNightMode ? 260 : 420;
      filter.Q.value = 1.2;

      // Slow LFO for wind swell
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.12; // swell every ~8 seconds
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(filter.frequency);
      lfo.start();

      const masterWind = this.ctx.createGain();
      masterWind.gain.value = 0.08;

      whiteNoise.connect(filter);
      filter.connect(masterWind);
      masterWind.connect(this.ctx.destination);
      whiteNoise.start();
      this.windGain = masterWind;
    } catch {
      // AudioContext policy or unsupported
    }

    // 2. Day or Night Atmosphere
    if (this.isNightMode) {
      // Night: Gentle periodic crickets
      this.cricketInterval = setInterval(() => {
        if (!this.isMuted) this.playCricketChirp();
      }, 1400);
    } else {
      // Day: Gentle birdsong in distance
      this.birdInterval = setInterval(() => {
        if (!this.isMuted && Math.random() > 0.45) {
          this.playBirdChirp();
        }
      }, 3500);
    }
  }

  private stopAmbience() {
    if (this.birdInterval) {
      clearInterval(this.birdInterval);
      this.birdInterval = null;
    }
    if (this.cricketInterval) {
      clearInterval(this.cricketInterval);
      this.cricketInterval = null;
    }
    if (this.windGain && this.ctx) {
      try {
        this.windGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      } catch {
        // Ignored
      }
      this.windGain = null;
    }
  }

  private playBirdChirp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 2400 + Math.random() * 800;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq - 200, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playCricketChirp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4500 + Math.random() * 200, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.006, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastFootstepTime < 0.38) return; // rate limit footsteps
    this.lastFootstepTime = now;

    try {
      // Soft wood floor footstep impulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.value = 180;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignored
    }
  }
}

export const soundscape = new SoundscapeEngine();

