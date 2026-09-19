import { describe, expect, it } from 'vitest';
import { normalizeProfile, allPhotos, coverPhoto, cleanText, takenAtFromFilename, canonicalUsername, isCrewUsername, LIMITS } from '@/lib/crew-types';

describe('normalizeProfile', () => {
  it('turns the old posts and photos into entries, newest first', () => {
    const p = normalizeProfile({
      username: 'stebbias',
      bio: 'hi',
      posts:  [{ id: 'a', text: 'newest note', createdAt: '2026-09-10T20:00:00.000Z' }, { id: 'b', text: 'old note', createdAt: '2026-07-01T20:00:00.000Z' }],
      photos: [{ id: 'p1', filename: '/screenshots/x.webp', caption: 'castle', uploadedAt: '2026-08-12T20:00:00.000Z' }],
    }, 'stebbias');
    expect(p.entries.map(e => e.id)).toEqual(['a', 'p1', 'b']);
    expect(p.entries[1].photos[0]).toMatchObject({ id: 'p1', caption: 'castle', takenAt: null });
    expect(p.entries[1].text).toBe('');
    expect(p.coverPhotoId).toBeNull();
    expect(p.bestDrawMs).toBeNull();
  });

  it('keeps entries that are already in today\'s shape and drops empty ones', () => {
    const p = normalizeProfile({
      entries: [
        { id: 'e1', text: '  ', photos: [], createdAt: '2026-09-01T00:00:00.000Z' },
        { id: 'e2', text: 'note', photos: [], placeId: 3, createdAt: '2026-09-02T00:00:00.000Z', lanterns: ['AmmaGaur', 'AmmaGaur'], replies: [{ id: 'r', username: 'joenana', text: 'nice', createdAt: 'x' }] },
      ],
    }, 'stebbias');
    expect(p.entries).toHaveLength(1);
    expect(p.entries[0]).toMatchObject({ id: 'e2', placeId: 3, lanterns: ['AmmaGaur'] });
    expect(p.entries[0].replies).toHaveLength(1);
  });

  it('only keeps a cover that is still on the wall', () => {
    const base = { entries: [{ id: 'e', text: '', photos: [{ id: 'ph', filename: '/screenshots/a.webp', caption: '', uploadedAt: '2026-01-01T00:00:00.000Z' }], createdAt: '2026-01-01T00:00:00.000Z' }] };
    expect(normalizeProfile({ ...base, coverPhotoId: 'ph' }, 'x').coverPhotoId).toBe('ph');
    expect(normalizeProfile({ ...base, coverPhotoId: 'gone' }, 'x').coverPhotoId).toBeNull();
    expect(coverPhoto(normalizeProfile(base, 'x'))?.id).toBe('ph');
  });

  it('fills a bare wall for an unknown store value', () => {
    const p = normalizeProfile(null, 'joenana');
    expect(p).toEqual({ username: 'joenana', bio: '', entries: [], coverPhotoId: null, bestDrawMs: null });
    expect(allPhotos(p)).toEqual([]);
  });
});

describe('cleanText', () => {
  it('stores what was typed, without entities, trimmed and capped', () => {
    expect(cleanText('  Tom & Jerry\'s <castle>  ', LIMITS.bio)).toBe('Tom & Jerry\'s <castle>');
    expect(cleanText('a\r\nb', 10)).toBe('a\nb');
    expect(cleanText('x'.repeat(600), LIMITS.bio)).toHaveLength(LIMITS.bio);
    expect(cleanText(42, 10)).toBe('');
  });
});

describe('takenAtFromFilename', () => {
  it('reads the moment off a Minecraft screenshot name', () => {
    const d = takenAtFromFilename('2026-09-10_20.15.33.png');
    expect(d).not.toBeNull();
    expect([d!.getFullYear(), d!.getMonth(), d!.getDate(), d!.getHours(), d!.getMinutes(), d!.getSeconds()]).toEqual([2026, 8, 10, 20, 15, 33]);
    expect(takenAtFromFilename('Screenshot 2026-09-10_20.15.33 (1).png')).not.toBeNull();
  });
  it('gives up on anything else', () => {
    expect(takenAtFromFilename('IMG_2041.jpg')).toBeNull();
    expect(takenAtFromFilename('2026-13-40_25.61.61.png')).toBeNull();
    expect(takenAtFromFilename('2099-01-01_00.00.00.png')).toBeNull();
  });
});

describe('usernames', () => {
  it('matches the crew list in any case and hands back the spelling used there', () => {
    expect(isCrewUsername('AMMAGAUR')).toBe(true);
    expect(isCrewUsername('nobody')).toBe(false);
    expect(canonicalUsername('ammagaur')).toBe('AmmaGaur');
  });
});
