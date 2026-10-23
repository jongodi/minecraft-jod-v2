/* Wind and a distant fire, made from noise in Web Audio. No files.
   Off by default; the choice is remembered in localStorage. */

export const AMBIENCE_KEY = 'jod-ambience-v1';

const WIND_CUTOFF = 420;   // Hz, low-passed brown noise
const WIND_SWELL_HZ = 0.07;
const FIRE_CUTOFF = 1400;  // Hz, band-passed crackle
const GAIN = { wind: 0.16, fire: 0.05 };
const FADE_S = 1.2;

interface Engine { ctx: AudioContext; master: GainNode; crackle: ReturnType<typeof setInterval> }
let engine: Engine | null = null;

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

export function isRemembered(): boolean {
  try { return localStorage.getItem(AMBIENCE_KEY) === '1'; } catch { return false; }
}
export function remember(on: boolean) {
  try { localStorage.setItem(AMBIENCE_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

export function startAmbience(): boolean {
  if (engine) { engine.ctx.resume(); return true; }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return false;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const noise = ctx.createBufferSource();
  noise.buffer = brownNoise(ctx, 4);
  noise.loop = true;

  /* wind: low-passed, with a slow swell on the cutoff */
  const wind = ctx.createBiquadFilter();
  wind.type = 'lowpass';
  wind.frequency.value = WIND_CUTOFF;
  const swell = ctx.createOscillator();
  swell.frequency.value = WIND_SWELL_HZ;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 220;
  swell.connect(swellDepth).connect(wind.frequency);
  const windGain = ctx.createGain();
  windGain.gain.value = GAIN.wind;
  noise.connect(wind).connect(windGain).connect(master);

  /* fire: the same noise band-passed, with random short pops */
  const fire = ctx.createBiquadFilter();
  fire.type = 'bandpass';
  fire.frequency.value = FIRE_CUTOFF;
  fire.Q.value = 0.8;
  const fireGain = ctx.createGain();
  fireGain.gain.value = GAIN.fire;
  noise.connect(fire).connect(fireGain).connect(master);
  const crackle = setInterval(() => {
    const t = ctx.currentTime;
    fireGain.gain.cancelScheduledValues(t);
    fireGain.gain.setValueAtTime(GAIN.fire, t);
    fireGain.gain.linearRampToValueAtTime(GAIN.fire * (2 + Math.random() * 3), t + 0.01);
    fireGain.gain.exponentialRampToValueAtTime(GAIN.fire, t + 0.08 + Math.random() * 0.1);
  }, 260);

  noise.start();
  swell.start();
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_S);
  engine = { ctx, master, crackle };
  return true;
}

/** Made but not playing: the browser held it back for want of a gesture, or
    a phone suspended it while the visitor was in another app. */
export const ambienceHeld = () => engine !== null && engine.ctx.state !== 'running';

/** Whether the sound is really playing, asking the browser to resume it
    first. A context made without a gesture stays suspended and its resume
    may never settle, so the answer waits a moment at most. */
export async function ambienceRunning(): Promise<boolean> {
  const ctx = engine?.ctx;
  if (!ctx) return false;
  if (ctx.state !== 'running') await Promise.race([ctx.resume().catch(() => {}), new Promise(r => setTimeout(r, 400))]);
  return engine?.ctx === ctx && ctx.state === 'running';
}

/** The game's pop when something is picked up, at a pitch of its own each
    time, as the game picks one: only while the wind and the fire are playing,
    since the visitor turned the sound on with them, and never on its own. */
export function pickupPop() {
  if (!engine || engine.ctx.state !== 'running') return;
  const { ctx, master } = engine;
  const t = ctx.currentTime;
  const pitch = 1 + (Math.random() - Math.random()) * 0.35;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(330 * pitch, t + 0.06);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function stopAmbience() {
  if (!engine) return;
  const { ctx, master, crackle } = engine;
  engine = null;
  clearInterval(crackle);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_S);
  setTimeout(() => ctx.close(), FADE_S * 1000 + 100);
}
