import { describe, expect, it } from 'vitest';
import { withCurrentLinks, type MapLocation } from '@/lib/map-types';

const place = (id: number, photoId: string | null): MapLocation => ({ id, label: `s${id}`, sublabel: '', x: 0, y: 0, type: 'surface', photoId });
const links = (ls: MapLocation[]) => ls.map(l => l.photoId ?? null);

describe('saving the map editor over links the gallery made meanwhile', () => {
  const base = [place(1, '1'), place(2, '2'), place(3, null)];

  it('keeps a link the gallery moved, where the editor left it alone', () => {
    /* the editor renamed place 3; the gallery moved photo 1 to place 3 */
    const mine = [place(1, '1'), place(2, '2'), { ...place(3, null), label: 'nýtt' }];
    const current = [place(1, null), place(2, '2'), place(3, '1')];
    const out = withCurrentLinks(mine, base, current);
    expect(links(out)).toEqual([null, '2', '1']);
    expect(out[2].label).toBe('nýtt');
  });

  it('lets a link the editor changed win, and clears the photo where the gallery put it', () => {
    /* the editor gave photo 1 to place 2; the gallery meanwhile moved it to place 3 */
    const mine = [place(1, null), place(2, '1'), place(3, null)];
    const current = [place(1, null), place(2, '2'), place(3, '1')];
    expect(links(withCurrentLinks(mine, base, current))).toEqual([null, '1', null]);
  });

  it('leaves new places and places gone from the store as the editor has them', () => {
    const mine = [place(1, '1'), place(4, '4')];
    const current = [place(2, '2')];
    expect(links(withCurrentLinks(mine, base, current))).toEqual(['1', '4']);
  });
});
