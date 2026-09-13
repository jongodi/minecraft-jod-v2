'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatapackMeta } from '@/data/datapacks';
import type { DatapackUpdateResult } from '@/app/api/datapacks/check-updates/route';
import { useResource } from './useResource';
import { Arrow } from './Arrow';

export default function WorldPacks() {
  const { data, loading, error, retry } = useResource<DatapackMeta[]>('/api/datapacks');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [updates, setUpdates] = useState<DatapackUpdateResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('jod:favorite-packs') ?? '[]');
      if (Array.isArray(stored)) setFavorites(stored.filter((id): id is number => typeof id === 'number'));
    } catch { /* Favorites still work for this visit. */ }
  }, []);
  const packs = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const categories = ['All', ...Array.from(new Set(packs.map(pack => pack.category)))];
  const shown = packs.filter(pack => (category === 'All' || category === pack.category) && (!onlyFavorites || favorites.includes(pack.id)) && `${pack.name} ${pack.description}`.toLowerCase().includes(search.toLowerCase()));
  function favorite(id: number) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem('jod:favorite-packs', JSON.stringify(next)); } catch { setStorageError(true); }
  }
  async function checkUpdates() {
    setChecking(true); setCheckError(false);
    try {
      const response = await fetch('/api/datapacks/check-updates', { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error('Check failed');
      const results = await response.json();
      if (!Array.isArray(results)) throw new Error('Invalid results');
      setUpdates(results);
    } catch { setCheckError(true); }
    finally { setChecking(false); }
  }
  if (!data) return <div className="atlas-empty">{loading ? 'Loading datapacks…' : 'Datapacks are unavailable.'}{error && <button className="atlas-text-button" onClick={retry}>Try again</button>}</div>;
  return <div className="atlas-packs">
    <div className="atlas-packs__head"><div><h3>A little more Minecraft.</h3><p>The datapacks in our world. Find one, save it, make something.</p></div><button className="atlas-text-button" disabled={checking} onClick={checkUpdates}>{checking ? 'Checking…' : 'Check for updates'} <span aria-hidden="true">↻</span></button></div>
    <div className="atlas-pack-filters"><label><span className="atlas-sr-only">Search datapacks</span><input type="search" placeholder="Find a datapack…" value={search} onChange={event => setSearch(event.target.value)} /></label><label><span className="atlas-sr-only">Datapack category</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item} value={item}>{item === 'All' ? 'All categories' : item.toLowerCase()}</option>)}</select></label><button aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(value => !value)}>Saved <span>{favorites.length}</span></button></div>
    <div role="status">{checkError && <p className="atlas-notice">The update service didn’t respond. Please try again.</p>}{storageError && <p className="atlas-notice">Saved for this visit. Browser storage is unavailable.</p>}{updates.length > 0 && <p className="atlas-notice">{updates.filter(item => item.updateAvailable).length} updates available{updates.some(item => item.error) ? ' · Some sources could not be checked.' : '.'}</p>}</div>
    <div className="atlas-pack-list">{shown.map(pack => {
      const result = updates.find(item => item.id === pack.id);
      const href = pack.modrinthSlug ? `https://modrinth.com/datapack/${encodeURIComponent(pack.modrinthSlug)}` : pack.githubRepo ? `https://github.com/${pack.githubRepo}` : null;
      return <article key={pack.id} className="atlas-pack"><button aria-label={`${favorites.includes(pack.id) ? 'Unsave' : 'Save'} ${pack.name}`} aria-pressed={favorites.includes(pack.id)} className="atlas-pack__save" onClick={() => favorite(pack.id)}>{favorites.includes(pack.id) ? '★' : '☆'}</button><div><h4>{pack.name}</h4><p>{pack.description}</p>{result && <span className="atlas-pack__update">{result.error ? 'Couldn’t check this source' : result.updateAvailable ? `Update: ${result.latestVersion}` : result.source === 'manual' ? 'Managed manually' : 'Up to date'}</span>}</div><span className="atlas-pack__category">{pack.category.toLowerCase()}</span><span className="atlas-pack__version">{pack.currentVersion ? `v${pack.currentVersion}` : '—'}</span>{href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`View ${pack.name} (opens in new tab)`}><Arrow diagonal /></a> : <span className="atlas-pack__manual">Custom</span>}</article>;
    })}</div>
    {shown.length === 0 && <div className="atlas-empty">No datapacks match these filters.<button className="atlas-text-button" onClick={() => { setSearch(''); setCategory('All'); setOnlyFavorites(false); }}>Clear filters</button></div>}
    <div className="atlas-packs__foot"><span>{shown.length} of {packs.length} datapacks</span><a href="/rp-editor">Open resource-pack editor <Arrow diagonal /></a></div>
  </div>;
}
