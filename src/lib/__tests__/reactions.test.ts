import { describe, expect, it } from 'vitest';
import { ITEMS, give, gaveIt, given, isItem, settle, type Reactions } from '@/lib/reactions';
import { ART, itemSvg, itemsCss } from '@/lib/item-art';
import { normalizeEntry, normalizeProfile, normalizeReactions } from '@/lib/crew-types';

describe('the items', () => {
  it('are eight, so with the slot that opens the inventory they fill one hotbar of nine', () => {
    expect(ITEMS).toHaveLength(8);
    expect(new Set(ITEMS.map(i => i.id)).size).toBe(8);
  });

  it('are each drawn sixteen by sixteen, in the palette, and say something', () => {
    for (const item of ITEMS) {
      expect(ART[item.id], item.id).toHaveLength(16);
      for (const row of ART[item.id]) expect(row, item.id).toMatch(/^[.owWrsScCd+hHpgGkiIjtTmMxeEfbBn]{16}$/);
      expect(item.name.trim() && item.says.trim(), item.id).toBeTruthy();
    }
  });

  it('draw as one path a colour, and draw back to the art pixel for pixel', () => {
    expect(itemSvg('creeper').match(/<path /g)).toHaveLength(4);
    for (const item of ITEMS) {
      const svg = itemSvg(item.id);
      const grid = Array.from({ length: 16 }, () => Array<string>(16).fill('.'));
      for (const [, fill, d] of svg.matchAll(/<path fill='(#[0-9A-F]{6})' d='([^']+)'\/>/g)) {
        /* the letter the art gives this colour, read off a pixel the art paints it on */
        const [x0, y0] = d.match(/^M(\d+) (\d+)/)!.slice(1).map(Number);
        const ch = ART[item.id][y0][x0];
        for (const [, x, y, w, h] of d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)H\d+z/g)) {
          for (let j = 0; j < Number(h); j++) for (let i = 0; i < Number(w); i++) {
            expect(grid[Number(y) + j][Number(x) + i], `${item.id} ${fill} twice`).toBe('.');
            grid[Number(y) + j][Number(x) + i] = ch;
          }
        }
      }
      expect(grid.map(r => r.join('')), item.id).toEqual([...ART[item.id]]);
    }
  });

  it('are drawn on the sheet the site shows them from', async () => {
    await expect(itemsCss()).toMatchFileSnapshot('../../app/items.css');
  });
});

describe('giving', () => {
  it('puts an item first given after the others, and takes one nobody gives any longer away', () => {
    let r: Reactions = give(undefined, 'cake', 'stebbias', true);
    r = give(r, 'skull', 'joenana', true);
    r = give(r, 'cake', 'joenana', true);
    expect(given(r)).toEqual([{ id: 'cake', who: ['stebbias', 'joenana'] }, { id: 'skull', who: ['joenana'] }]);
    r = give(r, 'skull', 'JOENANA', false);
    expect(Object.keys(r)).toEqual(['cake']);
    expect(gaveIt(r, 'cake', 'Stebbias')).toBe(true);
    expect(gaveIt(r, 'cake', null)).toBe(false);
  });

  it('gives an item once a member however many times it is given', () => {
    const r = give(give(undefined, 'diamond', 'AmmaGaur', true), 'diamond', 'ammagaur', true);
    expect(r.diamond).toHaveLength(1);
  });

  it('settles one item from an answer and leaves the rest as they stand', () => {
    const mine: Reactions = { cake: ['stebbias'], heart: ['stebbias'] };
    const answer: Reactions = { cake: ['joenana', 'stebbias'], poppy: ['joenana'] };
    expect(settle(mine, 'cake', answer)).toEqual({ cake: ['joenana', 'stebbias'], heart: ['stebbias'] });
    expect(settle(mine, 'heart', {})).toEqual({ cake: ['stebbias'] });
    expect(Object.keys(settle(mine, 'poppy', answer))).toEqual(['cake', 'heart', 'poppy']);
  });

  it('knows its items from anything else', () => {
    expect(isItem('cake')).toBe(true);
    expect(isItem('__proto__')).toBe(false);
    expect(isItem(3)).toBe(false);
  });
});

describe('what is stored', () => {
  it('keeps the crew\'s own names once, in the crew list\'s spelling, and only items there are', () => {
    expect(normalizeReactions({
      skull: ['JOENANA', 'joenana', 'someone', 4],
      cake: ['stebbias'],
      sword: ['stebbias'],
      heart: [],
      poppy: 'stebbias',
    })).toEqual({ skull: ['joenana'], cake: ['stebbias'] });
    expect(Object.keys(normalizeReactions({ skull: ['joenana'], cake: ['stebbias'] })!)).toEqual(['skull', 'cake']);
    expect(normalizeReactions({ heart: [] })).toBeNull();
    expect(normalizeReactions(['cake'])).toBeNull();
    expect(normalizeReactions(JSON.parse('{"__proto__": ["stebbias"]}'))).toBeNull();
  });

  it('leaves a sign nobody gave anything as it always was', () => {
    const plain = normalizeEntry({ id: 'e', text: 'hæ', photos: [], placeId: null, createdAt: '2026-10-01T00:00:00.000Z', reactions: { cake: [] } });
    expect(plain && 'reactions' in plain).toBe(false);
    const given = normalizeProfile({ entries: [{ id: 'e', text: 'hæ', photos: [], placeId: null, createdAt: '2026-10-01T00:00:00.000Z', reactions: { cake: ['ingunnbirta'] } }] }, 'stebbias');
    expect(given.entries[0].reactions).toEqual({ cake: ['ingunnbirta'] });
  });
});
