// What the site's link cards are drawn with: the three faces as files the
// card renderer reads (it takes woff, not woff2) and the palette, since the
// renderer cannot read CSS variables. The same values as tokens.css.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CARD = { width: 1200, height: 630 };

export const C = {
  night: '#15100D', paper: '#E8DCC4', paper2: '#DCCDB0', ink: '#1E1611', inkSoft: '#5A4634', inkFaint: '#6E5A45',
  red: '#8F3D2E', orange: '#A15325', yellow: '#BA8523', white: '#D1B2A1', brown: '#4D3323', lantern: '#F2A63B',
};

/** The badlands' terracotta bands, top to bottom, as the strata under every section. */
export const STRATA = [C.orange, C.yellow, C.white, C.red, C.brown];

const FONT_DIR = join(process.cwd(), 'node_modules/@fontsource');

export async function cardFonts() {
  const [display, data, text] = await Promise.all([
    readFile(join(FONT_DIR, 'alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'silkscreen/files/silkscreen-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'pixelify-sans/files/pixelify-sans-latin-400-normal.woff')),
  ]);
  return [
    { name: 'Alfa Slab One', data: display, weight: 400 as const, style: 'normal' as const },
    { name: 'Silkscreen', data, weight: 400 as const, style: 'normal' as const },
    { name: 'Pixelify Sans', data: text, weight: 400 as const, style: 'normal' as const },
  ];
}
