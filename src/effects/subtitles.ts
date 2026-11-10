/* Skjátextar: the game's subtitles for what the site sounds. In the game,
   with subtitles on, every sound is written in a dark box at the foot of the
   screen, on the right: "Eldur snarkar". A line stays three seconds after
   the sound and fades as it goes; the same sound heard again takes its line
   back to full, it is not written twice. Here the box says what the wind,
   the fire and the four small sounds are, to someone who turned the sound on
   and cannot hear it (a phone on silent says nothing, and the toggle alone
   could not tell the two apart).
   Pure, so the lines and their three seconds are tested without a browser. */

export type SoundKey = 'wind' | 'fire' | 'pop' | 'flint' | 'ding' | 'thud' | 'chime';

/** What each sound is called, as the game names its own: the thing, then what it does. */
export const SOUND_LINE: Record<SoundKey, string> = {
  wind: 'Vindur gnauðar',
  fire: 'Eldur snarkar',
  pop: 'Hlutur smellur',
  flint: 'Tinna slegin',
  ding: 'Ör hæfir',
  thud: 'Nótukubbur drynur',
  chime: 'Reynslustig hækkar',
};

/** How long a line stays after its sound, as in the game. */
export const LINE_MS = 3000;

export interface HeardLine { key: SoundKey; at: number }

/** The lines after a sound is heard at `now`: one that is still up is heard
    again where it stands, a new one goes on at the foot, and those whose
    three seconds are over are gone. */
export function hear(lines: readonly HeardLine[], key: SoundKey, now: number): HeardLine[] {
  const kept = still(lines, now);
  return kept.some(l => l.key === key)
    ? kept.map(l => (l.key === key ? { key, at: now } : l))
    : [...kept, { key, at: now }];
}

/** The lines still up at `now`. */
export function still(lines: readonly HeardLine[], now: number): HeardLine[] {
  return lines.filter(l => now - l.at < LINE_MS);
}

/** When the next line goes, in ms from `now`; null with none up. */
export function nextGone(lines: readonly HeardLine[], now: number): number | null {
  if (!lines.length) return null;
  return Math.max(0, Math.min(...lines.map(l => l.at + LINE_MS)) - now);
}

/* what is heard goes to whoever writes it down (Subtitles.tsx); the engine
   (ambience.ts) says it and knows nothing of the box */
const listeners = new Set<(key: SoundKey) => void>();
export function onSound(listener: (key: SoundKey) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function sounded(key: SoundKey): void {
  listeners.forEach(l => l(key));
}
