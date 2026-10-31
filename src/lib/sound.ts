// Procedural sound effects (Web Audio, zero assets).
// Footsteps are short filtered noise bursts with stride variation; doors get a
// latch click plus a swing whoosh. Everything fails silent — audio never breaks the app.

let ctx: AudioContext | null = null;
let stepAlt = false;

function storedMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("b2d-muted") === "1";
  } catch {
    return false;
  }
}

let muted = storedMuted();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("b2d-muted", value ? "1" : "0");
  } catch {
    // Private mode etc. — ignore.
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One enveloped noise burst through a biquad filter. */
function burst(duration: number, frequency: number, gain: number, type: BiquadFilterType = "lowpass", delay = 0): void {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const amp = c.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(c.destination);
    src.start(t);
    src.stop(t + duration + 0.02);
  } catch {
    // Ignore audio failures.
  }
}

export function footstep(running: boolean): void {
  stepAlt = !stepAlt;
  const pitch = (running ? 520 : 430) * (stepAlt ? 1 : 0.87);
  burst(0.09, pitch, running ? 0.3 : 0.2);
}

export function landThud(): void {
  burst(0.16, 200, 0.38);
}

export function doorSound(opening: boolean): void {
  burst(0.045, 2600, 0.16, "highpass"); // latch click
  burst(opening ? 0.3 : 0.24, 640, 0.11, "lowpass", 0.05); // swing whoosh
}

export function uiClick(): void {
  burst(0.035, 1900, 0.1, "highpass");
}
