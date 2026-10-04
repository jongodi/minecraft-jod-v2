import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeBases, redrawBases, RELOAD_WAIT_MS } from '@/lib/bluemap-redraw';
import { baseConfig } from '../../../scripts/bluemap-conf.mjs';

const WORLD = 'name: "World"\nsorting: 0\nremove-caves-below-y: 62\ncave-detection-ocean-floor: -5\ncave-detection-uses-block-light: true\nrender-mask: [\n  { type: "box" min-x: 1 }\n]\n';
const API = 'https://api.exaroton.com/v1/servers/srv';

describe('a base map\'s own drawing settings', () => {
  it('are set on top of the main map\'s, and only where a base has them', () => {
    const joðville = { id: 'jodville', name: 'Joðville', x: 136, y: 128, z: -84, radius: 550, bluemap: { 'remove-caves-below-y': 10000 } };
    const conf = baseConfig(WORLD, joðville, 1);
    expect(conf).toContain('\nremove-caves-below-y: 10000\n');
    expect(conf).not.toContain('remove-caves-below-y: 62');
    /* the rest of the main map's drawing stays as it is */
    expect(conf).toContain('cave-detection-ocean-floor: -5');
    expect(conf).toContain('cave-detection-uses-block-light: true');
    expect(conf.split('\n')[0]).toContain('Its own: remove-caves-below-y 10000.');

    const plain = baseConfig(WORLD, { ...joðville, id: 'faraway', bluemap: undefined }, 2);
    expect(plain).toContain('remove-caves-below-y: 62');
  });
});

describe('redrawing and freezing on the server', () => {
  const fetchMock = vi.fn();
  const calls = () => fetchMock.mock.calls.map((call) => {
    const [url, init] = call as [string, RequestInit | undefined];
    const body = init?.body ? String(init.body) : '';
    return `${init?.method ?? 'GET'} ${url.replace(API, '')}${body.startsWith('{') ? ` ${JSON.parse(body).command}` : ''}`;
  });

  beforeEach(() => {
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/world.conf') ? new Response(WORLD) : new Response('{}')));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('writes the base\'s config, reloads BlueMap, and purges the map so it is drawn again from scratch', async () => {
    const wait = vi.fn(async () => undefined);
    await redrawBases('key', ['jodville'], wait);
    expect(calls()).toEqual([
      'GET /files/data/plugins/BlueMap/maps/world.conf',
      'PUT /files/data/plugins/BlueMap/maps/jodville.conf',
      'POST /command/ bluemap reload light',
      'POST /command/ bluemap unfreeze jodville',
      'POST /command/ bluemap purge jodville',
    ]);
    const conf = String(fetchMock.mock.calls[1][1].body);
    expect(conf).toContain('remove-caves-below-y: 10000');
    /* 500 blocks each way around 136, -84 */
    expect(conf).toContain('min-x: -364');
    expect(conf).toContain('max-z: 416');
    /* the map is asked for only once BlueMap has had time to read the config */
    expect(wait).toHaveBeenCalledWith(RELOAD_WAIT_MS);
  });

  it('stops at the first thing exaroton turns down', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/world.conf') ? new Response(WORLD) : new Response(null, { status: 403 })));
    await expect(redrawBases('key', ['jodville'], async () => undefined)).rejects.toThrow(/403/);
    expect(calls()).toHaveLength(2);
  });

  it('freezes each base named', async () => {
    await freezeBases('key', ['jodville', 'shroomy']);
    expect(calls()).toEqual(['POST /command/ bluemap freeze jodville', 'POST /command/ bluemap freeze shroomy']);
  });
});
