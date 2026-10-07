import { describe, expect, it } from 'vitest';
import { woodOf, DEFAULT_CONFIG } from '@/lib/map-types';
import { woodClass, isSignWood } from '@/lib/sign-wood';
import { sanitizeMapConfig } from '@/lib/map';

describe('woodOf', () => {
  it('is oak when the post belongs nowhere', () => {
    expect(woodOf(null)).toBe('oak');
    expect(woodOf(undefined)).toBe('oak');
  });

  it("takes the place's own wood first", () => {
    expect(woodOf({ id: 3, label: 'Bleika setrið', wood: 'birch' })).toBe('birch');
  });

  it('keeps the first drawing\'s wood while the place is still that place', () => {
    expect(woodOf({ id: 3, label: 'Bleika setrið' })).toBe('cherry');
    expect(woodOf({ id: 1, label: 'Kastali Goða', wood: null })).toBe('spruce');
  });

  it('gives a pin reused for somewhere else no wood it was not given', () => {
    expect(woodOf({ id: 3, label: 'Nýja höllin' })).toBe('oak');
    expect(woodOf({ id: 99, label: 'Bleika setrið' })).toBe('oak');
  });

  it('ignores a wood it does not know', () => {
    expect(woodOf({ id: 2, label: 'Joðbær', wood: 'warped' as never })).toBe('oak');
  });
});

describe('woodClass', () => {
  it('names the wood, and leaves oak and anything unknown to the sign itself', () => {
    expect(woodClass('dark_oak')).toBe(' w-sign--dark-oak');
    expect(woodClass('cherry')).toBe(' w-sign--cherry');
    expect(woodClass('oak')).toBe('');
    expect(woodClass(undefined)).toBe('');
    expect(woodClass('<script>')).toBe('');
  });

  it('knows only the woods it has colours for', () => {
    expect(isSignWood('mangrove')).toBe(true);
    expect(isSignWood('crimson')).toBe(false);
  });
});

describe('a place\'s wood through the map editor', () => {
  const withWood = (wood: unknown) => ({
    ...DEFAULT_CONFIG,
    locations: [{ ...DEFAULT_CONFIG.locations[1], wood }],
  });

  it('keeps a wood it knows', () => {
    const out = sanitizeMapConfig(withWood('birch'));
    expect('config' in out && out.config.locations[0].wood).toBe('birch');
  });

  it('drops one it does not, so the place falls back to its default', () => {
    const out = sanitizeMapConfig(withWood('lava'));
    expect('config' in out && 'wood' in out.config.locations[0]).toBe(false);
  });
});
