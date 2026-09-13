import assert from 'node:assert/strict';
import React from 'react';

// Match Next's JSX runtime when loading components outside its compiler.
globalThis.React = React;
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://jod.test/',
});
for (const name of [
  'window',
  'self',
  'document',
  'HTMLElement',
  'HTMLDialogElement',
  'MutationObserver',
  'localStorage',
]) {
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    configurable: true,
  });
}
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback) => setTimeout(callback, 0),
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// JSDOM has no native modal implementation. Test the component lifecycle;
// real-browser focus trapping and responsive layout remain separate QA checks.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
HTMLElement.prototype.scrollIntoView = function () {};

const { render, screen, fireEvent, cleanup } =
  await import('@testing-library/react');
const { default: WorldHome } =
  await import('../src/components/atlas/WorldHome');
const { default: WorldGallery } =
  await import('../src/components/atlas/WorldGallery');
const { default: WorldPacks } =
  await import('../src/components/atlas/WorldPacks');
const { default: WorldMap } = await import('../src/components/atlas/WorldMap');
const { default: WorldCrew } =
  await import('../src/components/atlas/WorldCrew');
const { useResource } = await import('../src/components/atlas/useResource');
const { DEFAULT_CONFIG } = await import('../src/lib/map-types');

const photos = [
  {
    id: 'a',
    filename: '/screenshots/the-castle.webp',
    title: 'GOÐI CASTLE',
    sublabel: 'FAR AWAY LANDS',
    active: true,
    order: 1,
    gradient: '',
  },
  {
    id: 'b',
    filename: '/screenshots/the-village.webp',
    title: 'THE VILLAGE',
    sublabel: 'NEW BASE',
    active: true,
    order: 2,
    gradient: '',
  },
];
const packs = [
  {
    id: 1,
    name: 'Banner Flags',
    description: 'Place banners',
    category: 'BUILD',
    source: 'modrinth',
    modrinthSlug: 'banner-flags',
    currentVersion: '1',
    gameVersion: '26.1',
  },
  {
    id: 2,
    name: 'Custom pack',
    description: 'Crew recipe',
    category: 'SOCIAL',
    source: 'manual',
    gameVersion: '26.1',
  },
];
function json(data) {
  return { ok: true, json: async () => data };
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

test('server failure is unavailable, retry recovers, and clipboard denial never claims success', async () => {
  let failed = true;
  globalThis.fetch = async (url) =>
    json(
      url === '/api/gallery'
        ? photos
        : {
            online: !failed,
            source: failed ? 'error' : 'exaroton',
            players: { online: 3, max: 20 },
          },
    );
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error('Permission denied');
      },
    },
  });
  render(<WorldHome initialPhotos={photos} />);
  await screen.findByText('Status unavailable');
  assert.equal(screen.queryByText('Server resting'), null);
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
  await screen.findByText('Server online');
  assert.ok(screen.getByText('3 players online'));
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Copy server address play.jodcraft.world',
    }),
  );
  await screen.findByText(/Copy unavailable. Select the address/);
  assert.equal(screen.queryByText('Copied ✓'), null);
});

test('gallery selects published places and wraps keyboard navigation in its dialog', async () => {
  render(
    <WorldGallery
      photos={photos}
      loading={false}
      error={false}
      retry={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /the village/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge THE VILLAGE' }));
  assert.ok(screen.getByRole('dialog', { name: 'World gallery: THE VILLAGE' }));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  await screen.findByRole('dialog', { name: 'World gallery: GOÐI CASTLE' });
  fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
  await screen.findByRole('dialog', { name: 'World gallery: THE VILLAGE' });
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(document.body.style.overflow, '');
});

test('datapack search, category filters, persisted favorites and no-results recovery combine correctly', async () => {
  globalThis.fetch = async () => json(packs);
  localStorage.setItem('jod:favorite-packs', 'not-json');
  const view = render(<WorldPacks />);
  await screen.findByRole('heading', { name: 'Banner Flags' });
  fireEvent.click(screen.getByRole('button', { name: 'Save Banner Flags' }));
  assert.deepEqual(JSON.parse(localStorage.getItem('jod:favorite-packs')), [1]);
  fireEvent.click(screen.getByRole('button', { name: 'Saved 1' }));
  assert.equal(screen.queryByRole('heading', { name: 'Custom pack' }), null);
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'missing' },
  });
  assert.ok(screen.getByText('No datapacks match these filters.'));
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  assert.ok(screen.getByRole('heading', { name: 'Custom pack' }));
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'SOCIAL' },
  });
  assert.equal(screen.queryByRole('heading', { name: 'Banner Flags' }), null);
  view.unmount();
  render(<WorldPacks />);
  await screen.findByRole('button', { name: 'Unsave Banner Flags' });
});

test('map keyboard selection and zoom work with the admin-managed map response', async () => {
  globalThis.fetch = async () => json(DEFAULT_CONFIG);
  render(<WorldMap />);
  const marker = await screen.findByRole('button', {
    name: 'GOÐI CASTLE',
    exact: true,
  });
  fireEvent.keyDown(marker, { key: 'Enter' });
  assert.equal(marker.getAttribute('aria-pressed'), 'true');
  assert.equal(screen.getByRole('combobox').value, '1');
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  assert.ok(screen.getByText('1.5×'));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  assert.equal(screen.getByRole('combobox').value, '');
  assert.equal(screen.getByRole('button', { name: 'Zoom out' }).disabled, true);
});

test('crew sorts numeric metrics and retains cached-data attribution', async () => {
  const players = [
    {
      username: 'Alice',
      playTimeHours: 10,
      mobKills: 80,
      deaths: 2,
      itemsCrafted: 9,
      distanceWalked: 200000,
    },
    {
      username: 'Bob',
      playTimeHours: 20,
      mobKills: 40,
      deaths: 1,
      itemsCrafted: 8,
      distanceWalked: 100000,
    },
  ];
  globalThis.fetch = async (url) =>
    json(
      url === '/api/crew'
        ? players.map((player) => ({ username: player.username }))
        : { players, source: 'cached', cachedAt: '2026-09-01T10:00:00Z' },
    );
  render(
    <WorldCrew onlineNames={['alice']} statusKnown showProfileLink={false} />,
  );
  await screen.findByText(/Last snapshot/);
  assert.match(screen.getAllByRole('listitem')[0].textContent, /Bob/);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
  assert.match(screen.getAllByRole('listitem')[0].textContent, /Alice/);
  assert.ok(screen.getByText('Playing now'));
});

test('resource hook retries HTTP errors and aborts requests on unmount', async () => {
  let signal;
  let succeed = false;
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return succeed ? json({ label: 'Recovered' }) : { ok: false };
  };
  function Probe() {
    const resource = useResource('/resource');
    return (
      <div>
        <p>
          {resource.error ? 'Unavailable' : (resource.data?.label ?? 'Loading')}
        </p>
        <button onClick={resource.retry}>Retry resource</button>
      </div>
    );
  }
  const view = render(<Probe />);
  await screen.findByText('Unavailable');
  succeed = true;
  fireEvent.click(screen.getByRole('button', { name: 'Retry resource' }));
  await screen.findByText('Recovered');
  view.unmount();
  assert.equal(signal.aborted, true);
});
