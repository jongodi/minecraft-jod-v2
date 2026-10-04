import config from '@/lib/map-bases.json';
import { getExarotonServerId } from '@/lib/exaroton';
import { baseConfig, MAPS_DIR } from '../../scripts/bluemap-conf.mjs';

/* Redrawing and freezing the base maps on the server, from the admin panel
   (Þjónn → Grunnkortin) or npm run map:bases -- --redraw / --freeze. A redraw
   writes the base's BlueMap config afresh (the main map's, with the base's
   own drawing settings from src/lib/map-bases.json, scripts/bluemap-conf.mjs),
   reloads BlueMap so it reads it, and draws the whole map again with it. The
   map is unfrozen for that; freeze it again once the drawing is done, then
   send it to the site. The server must be running: these are console
   commands. */

const API = 'https://api.exaroton.com/v1/servers';
/* time for `bluemap reload light` to read the configs before the map is asked for */
export const RELOAD_WAIT_MS = 15_000;

type Wait = (ms: number) => Promise<void>;
const sleep: Wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function exaroton(token: string, id: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}/${id}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    res.body?.cancel().catch(() => undefined);
    throw new Error(`Exaroton svaraði ${res.status} fyrir ${decodeURIComponent(path)}`);
  }
  return res;
}

const encode = (path: string) => path.split('/').map(encodeURIComponent).join('/');

async function command(token: string, id: string, line: string): Promise<void> {
  await exaroton(token, id, 'command/', {
    method: 'POST',
    body: JSON.stringify({ command: line }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Writes each base's config afresh, reloads BlueMap, and draws each base again from scratch. */
export async function redrawBases(token: string, ids: string[], wait: Wait = sleep): Promise<void> {
  const id = await getExarotonServerId(token);
  const world = await (await exaroton(token, id, `files/data/${encode(`${MAPS_DIR}/world.conf`)}`)).text();
  for (const baseId of ids) {
    const n = config.bases.findIndex((b) => b.id === baseId);
    if (n < 0) throw new Error(`Ekkert grunnkort heitir "${baseId}".`);
    await exaroton(token, id, `files/data/${encode(`${MAPS_DIR}/${baseId}.conf`)}`, {
      method: 'PUT',
      body: baseConfig(world, config.bases[n], n + 1),
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }
  await command(token, id, 'bluemap reload light');
  await wait(RELOAD_WAIT_MS);
  for (const baseId of ids) {
    await command(token, id, `bluemap unfreeze ${baseId}`);
    await command(token, id, `bluemap force-update ${baseId}`);
  }
}

/** Freezes each base: it isn't drawn again until it is redrawn. */
export async function freezeBases(token: string, ids: string[]): Promise<void> {
  const id = await getExarotonServerId(token);
  for (const baseId of ids) await command(token, id, `bluemap freeze ${baseId}`);
}
