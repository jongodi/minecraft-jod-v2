// The small pictures beside the welcome letter's list (src/lib/email-copy.ts,
// welcomeLetter), drawn on the game's sixteen-pixel grid the way the items
// are (src/lib/item-art.ts): one letter a colour, a dot is nothing. The mail
// art route (/api/mail-art?d=icon&i=…) draws each one as a PNG, since Gmail
// shows no SVG.

export const MAIL_ICONS = ['wall', 'board', 'fire', 'wanted', 'map'] as const;
export type MailIcon = typeof MAIL_ICONS[number];
export const isMailIcon = (v: unknown): v is MailIcon => typeof v === 'string' && (MAIL_ICONS as readonly string[]).includes(v);

const PALETTE: Record<string, string> = {
  o: '#1E1611',                                                   // the outline, the site's ink
  w: '#C9995B', W: '#8E6236', V: '#5E3F22',                       // oak: face, grain, shade
  p: '#EDE3CC', P: '#C9B89A',                                     // paper and its shade
  k: '#5A4634',                                                   // writing on the paper
  r: '#C23A2E', R: '#8C1A15',                                     // a pin, a marker
  y: '#F7DE9F', a: '#F2A63B', e: '#E0602A', d: '#8F3D2E',         // fire: light to deep
  l: '#8A5D33', L: '#4D3323',                                     // logs
  s: '#8A8580', S: '#5F5A55',                                     // stones
  b: '#5B8FC9', B: '#3A6699', g: '#6FA343', G: '#45702A', u: '#D8B46A', // the map: water, land, sand
  f: '#D9A066',                                                   // a face
};

const ART: Record<MailIcon, readonly string[]> = {
  /* a painting in an oak frame: the badlands at sunset, as the wall hangs prints */
  wall: [
    '................',
    '.oooooooooooooo.',
    '.oWWWWWWWWWWWWo.',
    '.oWooooooooooWo.',
    '.oWoyyyyyyyyoWo.',
    '.oWoyyyyyaayoWo.',
    '.oWoaaaaaaaaoWo.',
    '.oWoeeddeeeeoWo.',
    '.oWodddddeedoWo.',
    '.oWoLLddddddoWo.',
    '.oWoLLLLLdLLoWo.',
    '.oWooooooooooWo.',
    '.oWWWWWWWWWWWWo.',
    '.oooooooooooooo.',
    '................',
    '................',
  ],
  /* the board: oak planks with two notes pinned to them */
  board: [
    '.oooooooooooooo.',
    '.owwwwwwwwwwwwo.',
    '.owpprppwwwwwwo.',
    '.owpkkkpwprppwo.',
    '.owpppppwpkkpwo.',
    '.owpkkppwppppwo.',
    '.owpppppwpkkpwo.',
    '.owpkkkpwppppwo.',
    '.owpppppwpkppwo.',
    '.owWWWWWwppppwo.',
    '.owwwwwwwWWWWwo.',
    '.oVVVVVVVVVVVVo.',
    '.oooooooooooooo.',
    '..oVo......oVo..',
    '..oVo......oVo..',
    '..ooo......ooo..',
  ],
  /* the fire: a flame on crossed logs in a ring of stones */
  fire: [
    '................',
    '.......o........',
    '......oyo.......',
    '......oyao......',
    '.....oyaao......',
    '....oyaaeao.....',
    '....oaaeeao.....',
    '...oyaeedeao....',
    '...oaeedddeo....',
    '...oeeddddeo....',
    '..oollllllloo...',
    '.oLLLllllLLLLo..',
    '.osoLLLLLLLosSo.',
    'osSSosssssoSSsso',
    'oooooooooooooooo',
    '................',
  ],
  /* the wanted board's poster: a face under a hat, and the charge under it */
  wanted: [
    '................',
    '..oooooooooooo..',
    '..oppppppppppo..',
    '..opkkkkkkkkpo..',
    '..opppLLLLpppo..',
    '..opLLLLLLLLpo..',
    '..oppffffffppo..',
    '..oppfkffkfppo..',
    '..oppffffffppo..',
    '..oppRRRRRRppo..',
    '..opRRRRRRRRpo..',
    '..oppppppppppo..',
    '..opkkpkkkpkpo..',
    '..oPPPPPPPPPPo..',
    '..oooooooooooo..',
    '................',
  ],
  /* the map the game makes, on paper: sea, sand and land, a marker on it */
  map: [
    '................',
    '.oooooooooooooo.',
    '.oPpppppppppPPo.',
    '.opbbbbggggbbpo.',
    '.opbbuggGGggbpo.',
    '.opbugggGgrgupo.',
    '.opbugGgggRgupo.',
    '.opbbuggggguBpo.',
    '.opbbbuggGgubpo.',
    '.opBbbuugggubpo.',
    '.opbbbbuuuubbpo.',
    '.opBbbbbbbbBbpo.',
    '.oPpppppppppPPo.',
    '.oooooooooooooo.',
    '................',
    '................',
  ],
};

/** The rows and colours an icon is drawn from. */
export function iconRows(icon: MailIcon): { rows: readonly string[]; palette: Record<string, string> } {
  return { rows: ART[icon], palette: PALETTE };
}

/** An icon as SVG, each run of pixels on a row a rectangle of its colour. */
export function iconSvg(icon: MailIcon): string {
  const { rows, palette } = iconRows(icon);
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (palette[ch]) paths.set(ch, `${paths.get(ch) ?? ''}M${x} ${y}h${w}v1H${x}z`);
      x += w;
    }
  });
  const body = Array.from(paths, ([ch, d]) => `<path fill="${palette[ch]}" d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">${body}</svg>`;
}
