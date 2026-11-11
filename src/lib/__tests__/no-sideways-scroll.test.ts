import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* The page scrolls up and down, never sideways. The clouds slide 120 px east
   as the page is scrolled, and the box that holds them cut them off with
   `overflow: clip`, which Safari counted into the page's width all the same:
   on a phone the board could be dragged to the side, further the lower it
   was scrolled. Kept by two things, read here from the stylesheets: the
   root itself does not scroll sideways, and the sky's boxes hide what
   leaves them rather than clip it. */
const css = (name: string) => readFileSync(join(__dirname, '../../app', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (sheet: string, selector: string) => {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, `${selector} is in the sheet`).toBeGreaterThan(-1);
  return sheet.slice(at, sheet.indexOf('}', at));
};

describe('no sideways scroll', () => {
  it('the root does not scroll sideways', () => {
    expect(rule(css('globals.css'), 'html')).toMatch(/overflow-x:\s*hidden/);
  });

  it('the boxes the drifting clouds and the flight live in hide what leaves them', () => {
    const sheet = css('badlands.css');
    for (const box of ['.b-sky__clouds', '.b-nightsky', '.b-flight']) {
      expect(rule(sheet, box), box).toMatch(/overflow:\s*hidden/);
    }
  });
});
