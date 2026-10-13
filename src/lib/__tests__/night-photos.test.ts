import { describe, expect, it } from 'vitest';
import { eveningPhotos } from '@/lib/night-photos';
import { normalizeProfile } from '@/lib/crew-types';

const photo = (id: string, takenAt: string | null) => ({ id, filename: `/blob/${id}.webp`, caption: '', uploadedAt: '2026-10-05T00:00:00Z', takenAt });
const wall = (username: string, entries: { id: string; text?: string; placeId?: number | null; photos: ReturnType<typeof photo>[] }[]) =>
  normalizeProfile({ username, entries: entries.map(e => ({ text: '', placeId: null, createdAt: '2026-10-05T00:00:00Z', ...e })) }, username);

describe('the evening\'s pictures', () => {
  const at = '2026-10-03T20:00:00.000Z';
  const walls = [
    wall('stebbias', [{ id: 'e1', text: 'Brúin', placeId: 4, photos: [photo('p1', '2026-10-03T21:14:00.000Z'), photo('p2', '2026-10-04T03:00:00.000Z')] }]),
    wall('joenana', [{ id: 'e2', photos: [photo('p3', '2026-10-03T19:35:00.000Z'), photo('p4', '2026-10-03T19:20:00.000Z'), photo('p5', null)] }]),
  ];

  it('takes those from the half hour before until the evening is over, in the order they were taken', () => {
    const found = eveningPhotos(at, walls, id => (id === 4 ? 'spruce' : 'oak'));
    expect(found.map(p => p.id)).toEqual(['p3', 'p1']);
    expect(found[1]).toMatchObject({ username: 'stebbias', entryId: 'e1', caption: 'Brúin', wood: 'spruce' });
    expect(found[0]).toMatchObject({ username: 'joenana', wood: 'oak' });
  });

  it('finds nothing on an evening nobody took a picture', () => {
    expect(eveningPhotos('2026-09-01T20:00:00.000Z', walls)).toEqual([]);
  });
});
