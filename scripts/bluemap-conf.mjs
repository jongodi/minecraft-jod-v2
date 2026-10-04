// BlueMap's map configs (plugins/BlueMap/maps/<id>.conf on the server): the
// base maps' are the main map's (world.conf) with a few keys changed, and
// everything else kept as written. Shared by scripts/map-bases.mjs and the
// admin panel's redraw (src/lib/bluemap-redraw.ts).
//
// A base in src/lib/map-bases.json may carry its own drawing settings under
// "bluemap", set on top of the main map's: Joðville sits in mountains around
// Y 128, far above the main map's cave cut-off (remove-caves-below-y: 62), so
// every cave inside them was drawn and its tiles came out nine times heavier.

export const MAPS_DIR = 'plugins/BlueMap/maps';

/* What decides how heavy a map's tiles are, in BlueMap's map config. */
export const DRAWING = [
  'remove-caves-below-y', 'cave-detection-ocean-floor', 'cave-detection-uses-block-light',
  'min-inhabited-time', 'render-edges', 'edge-light-strength', 'ignore-missing-light-data', 'render-mask',
];

/** Where the value that starts at `i` ends: past its closing bracket for a
    { } or [ ] block, otherwise the end of the line. Skips strings and comments. */
function valueEnd(text, i) {
  while (text[i] === ' ' || text[i] === '\t') i++;
  const open = text[i];
  if (open !== '{' && open !== '[') {
    const nl = text.indexOf('\n', i);
    return nl < 0 ? text.length : nl;
  }
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === '"') {
      for (j++; j < text.length && text[j] !== '"'; j++) if (text[j] === '\\') j++;
    } else if (c === '#' || (c === '/' && text[j + 1] === '/')) {
      const nl = text.indexOf('\n', j);
      j = nl < 0 ? text.length : nl;
    } else if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      if (--depth === 0) return j + 1;
    }
  }
  throw new Error('Lokandi sviga vantar í world.conf');
}

/** Sets a top-level key (one that starts its line, not in a comment) to `value`,
    or adds it at the end if the file doesn't have it. */
export function setKey(text, key, value) {
  const re = new RegExp(`^${key.replace(/-/g, '\\-')}[ \\t]*[:=]?[ \\t]*`, 'm');
  const m = re.exec(text);
  if (!m) return `${text.replace(/\s*$/, '')}\n${key}: ${value}\n`;
  const start = m.index;
  const end = valueEnd(text, start + m[0].length);
  return `${text.slice(0, start)}${key}: ${value}${text.slice(end)}`;
}

/** A top-level key's value as written (a whole { } or [ ] block for one), or null. */
export function getKey(text, key) {
  const re = new RegExp(`^${key.replace(/-/g, '\\-')}[ \\t]*[:=]?[ \\t]*`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  return text.slice(start, valueEnd(text, start)).trim();
}

/* a setting's value as HOCON writes it */
const hocon = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

/** The main map's config, made into the config for `base` (number `n` in the
    list): its name, place, start and render mask, and its own drawing
    settings (`base.bluemap`), if it has any. */
export function baseConfig(worldConf, base, n) {
  const r = base.radius;
  let text = worldConf.replace(/\r\n/g, '\n');
  text = setKey(text, 'name', JSON.stringify(base.name));
  text = setKey(text, 'sorting', String(n));
  text = setKey(text, 'start-pos', `{ x: ${base.x}, z: ${base.z} }`);
  text = setKey(text, 'render-mask', [
    '[',
    '  {',
    `    min-x: ${base.x - r}`,
    `    max-x: ${base.x + r}`,
    `    min-z: ${base.z - r}`,
    `    max-z: ${base.z + r}`,
    '  }',
    ']',
  ].join('\n'));
  const own = Object.entries(base.bluemap ?? {});
  for (const [key, value] of own) text = setKey(text, key, hocon(value));
  const note = own.length ? ` Its own: ${own.map(([k, v]) => `${k} ${hocon(v)}`).join(', ')}.` : '';
  return `# ${base.name}: written by scripts/map-bases.mjs from world.conf. Centre X ${base.x} Z ${base.z}, ${r} blocks each way.${note}\n${text}`;
}

