import { describe, expect, it, vi } from 'vitest';
import { LINE_MS, SOUND_LINE, hear, nextGone, onSound, sounded, still, type SoundKey } from '../subtitles';

describe('the subtitle box', () => {
  it('writes a sound once, at the foot, and keeps it three seconds', () => {
    const a = hear([], 'wind', 1000);
    const b = hear(a, 'fire', 1000);
    expect(b.map(l => l.key)).toEqual(['wind', 'fire']);
    expect(still(b, 1000 + LINE_MS - 1)).toHaveLength(2);
    expect(still(b, 1000 + LINE_MS)).toHaveLength(0);
  });

  it('takes a line heard again back to full where it stands, never twice', () => {
    const lines = hear(hear(hear([], 'fire', 0), 'ding', 500), 'fire', 2000);
    expect(lines).toEqual([{ key: 'fire', at: 2000 }, { key: 'ding', at: 500 }]);
  });

  it('drops what is over when the next sound is heard', () => {
    const lines = hear(hear([], 'pop', 0), 'thud', LINE_MS + 1);
    expect(lines).toEqual([{ key: 'thud', at: LINE_MS + 1 }]);
  });

  it('knows when the next line goes', () => {
    expect(nextGone([], 0)).toBeNull();
    expect(nextGone([{ key: 'wind', at: 0 }, { key: 'ding', at: 1000 }], 2500)).toBe(500);
    expect(nextGone([{ key: 'wind', at: 0 }], LINE_MS + 50)).toBe(0);
  });

  it('has a line for every sound, short enough for a 320 px phone and with no full stop', () => {
    for (const key of Object.keys(SOUND_LINE) as SoundKey[]) {
      expect(SOUND_LINE[key].length).toBeGreaterThan(3);
      expect(SOUND_LINE[key].length).toBeLessThanOrEqual(20);
      expect(SOUND_LINE[key]).not.toMatch(/[.!]$/);
    }
  });

  it('tells whoever listens, until they stop', () => {
    const heard = vi.fn();
    const off = onSound(heard);
    sounded('chime');
    off();
    sounded('chime');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith('chime');
  });
});
