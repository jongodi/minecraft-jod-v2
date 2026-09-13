'use client';

import Image from 'next/image';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { StatusResponse } from '@/app/api/server-status/route';
import type { GalleryPhoto } from '@/lib/gallery';
import { useResource } from './useResource';
import AtlasDialog from './AtlasDialog';
import WorldGallery from './WorldGallery';
import { Arrow } from './Arrow';

const WorldMap = dynamic(() => import('./WorldMap'), { loading: () => <p className="atlas-empty">Opening map…</p> });
const WorldPacks = dynamic(() => import('./WorldPacks'), { loading: () => <p className="atlas-empty">Opening datapacks…</p> });
const WorldCrew = dynamic(() => import('./WorldCrew'), { loading: () => <p className="atlas-empty">Opening crew…</p> });
const ADDRESS = 'play.jodcraft.world';
const TABS = ['gallery', 'map', 'datapacks', 'crew'] as const;
type Tab = typeof TABS[number];


export default function WorldHome({ initialPhotos }: { initialPhotos: GalleryPhoto[] }) {
  const status = useResource<StatusResponse>('/api/server-status', 60_000);
  const gallery = useResource<GalleryPhoto[]>('/api/gallery');
  const [tab, setTab] = useState<Tab>('gallery');
  const [join, setJoin] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const explorer = useRef<HTMLElement>(null);
  const photos = Array.isArray(gallery.data) ? gallery.data : initialPhotos;
  const hero = photos[0];
  const unavailable = status.error || status.data?.source === 'error';
  const state = unavailable ? 'Status unavailable' : status.loading && !status.data ? 'Checking server' : status.data?.online ? 'Server online' : 'Server resting';
  const onlineNames = unavailable ? [] : (status.data?.players?.list ?? []).map(player => player.name);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1);
      if (TABS.includes(hash as Tab)) setTab(hash as Tab);
      if (hash === 'stats' || hash === 'server') setTab('crew');
      if (hash === 'join') setJoin(true);
      if ([...TABS, 'stats', 'server'].includes(hash as Tab)) requestAnimationFrame(() => explorer.current?.scrollIntoView());
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => { window.removeEventListener('hashchange', syncHash); clearTimeout(copyTimer.current); };
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  }

  async function copyAddress() {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(ADDRESS);
      setCopy('copied');
    } catch { setCopy('error'); }
    copyTimer.current = setTimeout(() => setCopy('idle'), 4000);
  }

  return (
    <div className="atlas">
      <a href="#explore" className="atlas-skip">Skip to world explorer</a>
      <header className="atlas-nav">
        <Link href="/" className="atlas-brand" aria-label="JOÐ home">JOÐ<span className="atlas-brand__square" /></Link>
        <span className="atlas-nav__edition">A private Minecraft world</span>
        <nav aria-label="Main navigation"><a href="#explore">Explore</a><Link href="/crew">The crew</Link><button onClick={() => setJoin(true)}>Join the server <Arrow diagonal /></button></nav>
      </header>

      <main>
        <section className="atlas-hero" id="hero" aria-labelledby="world-title">
          <div className="atlas-hero__top"><span>Java Edition / Survival</span><span>Built together. Block by block.</span></div>
          <div className="atlas-hero__type"><h1 id="world-title">JOÐ</h1><div className="atlas-hero__aside"><span className="atlas-cross" aria-hidden="true">+</span><p>A few friends.<br />A world of our own.</p><a href="#explore" aria-label="Explore our world"><Arrow /></a></div></div>
          <div className="atlas-landscape">
            {hero && <Image unoptimized src={hero.filename} alt={`${hero.title} in the JOÐ Minecraft world`} fetchPriority="high" width="1920" height="1009" />}
            {!hero && <div className="atlas-landscape__loading">{gallery.error ? 'World preview unavailable' : gallery.loading ? 'Opening the world…' : 'Our next chapter starts here.'}</div>}
            <div className="atlas-landscape__caption"><span>Inside our world</span><span>{hero?.title ?? 'JOÐ'} <Arrow diagonal /></span></div>
            <a className="atlas-landscape__open" href="#explore" aria-label="Browse world screenshots" />
          </div>
          <div className="atlas-server" id="server">
            <div className="atlas-server__state" role="status"><i className={status.data?.online && !unavailable ? 'is-online' : unavailable ? 'is-unknown' : ''} /><span>{state}</span>{unavailable && <button className="atlas-text-button" onClick={status.retry}>Retry</button>}</div>
            <span className="atlas-server__players">{!unavailable && status.data?.online ? `${status.data.players?.online ?? 0} players online` : 'Private · Whitelisted'}</span>
            <button className="atlas-address" onClick={copyAddress} aria-label={`Copy server address ${ADDRESS}`}><span>{ADDRESS}</span><span>{copy === 'copied' ? 'Copied ✓' : copy === 'error' ? 'Select to copy' : 'Copy IP'} <span aria-hidden="true">⧉</span></span></button>
          </div>
          <p className="atlas-sr-only" role="status">{copy === 'copied' ? 'Server address copied.' : copy === 'error' ? `Copy unavailable. Select the address ${ADDRESS} manually.` : ''}</p>
        </section>

        <section className="atlas-explorer" id="explore" ref={explorer} aria-labelledby="explore-title">
          <div className="atlas-section-head"><div><span className="atlas-eyebrow">The shared world</span><h2 id="explore-title">Make yourself at home.</h2></div><p>Our places, our people,<br />and the things we build with.</p></div>
          <div className="atlas-tabs" role="tablist" aria-label="World explorer">
            {TABS.map((item, index) => <button key={item} id={`tab-${item}`} role="tab" aria-selected={tab === item} aria-controls={`panel-${item}`} tabIndex={tab === item ? 0 : -1} onClick={() => selectTab(item)} onKeyDown={event => {
              let next: number | undefined;
              if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
              if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
              if (event.key === 'Home') next = 0;
              if (event.key === 'End') next = TABS.length - 1;
              if (next !== undefined) { event.preventDefault(); selectTab(TABS[next]); document.getElementById(`tab-${TABS[next]}`)?.focus(); }
            }}><span className="atlas-tabs__number">0{index + 1}</span>{item === 'gallery' ? 'Places' : item === 'map' ? 'World map' : item === 'datapacks' ? 'Datapacks' : 'The crew'}<Arrow diagonal /></button>)}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="atlas-panel">
            {tab === 'gallery' && <WorldGallery photos={photos} loading={gallery.loading} error={gallery.error} retry={gallery.retry} />}
            {tab === 'map' && <WorldMap />}
            {tab === 'datapacks' && <WorldPacks />}
            {tab === 'crew' && <WorldCrew onlineNames={onlineNames} statusKnown={!!status.data && !unavailable} />}
          </div>
        </section>

        <section className="atlas-join" aria-labelledby="join-title">
          <div><span className="atlas-eyebrow">See you in there</span><h2 id="join-title">Your next build<br />starts here<span>.</span></h2></div>
          <div className="atlas-join__action"><p>Java Edition. Invite only.<br />Already on the whitelist? Come on in.</p><button className="atlas-button" onClick={() => setJoin(true)}>Join the server <Arrow diagonal /></button></div>
          <div className="atlas-blocks" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </section>
      </main>
      <footer className="atlas-footer"><Link href="/" className="atlas-brand">JOÐ<span className="atlas-brand__square" /></Link><span>A shared world. A private server.</span><nav aria-label="Tools"><Link href="/rp-editor">Pack editor <Arrow diagonal /></Link><Link href="/admin">Admin <Arrow diagonal /></Link><a href="#hero">Back to top ↑</a></nav></footer>
      {join && <AtlasDialog label="Join the JOÐ server" onClose={() => setJoin(false)}><span className="atlas-eyebrow">Java Edition · Whitelisted</span><h2>Come on in.</h2><p>You’ll need to be on the whitelist. Ask a crew member for an invite if you haven’t joined before.</p><ol className="atlas-steps"><li><span>01</span>Open Minecraft Java Edition.</li><li><span>02</span>Choose Multiplayer → Add Server.</li><li><span>03</span>Paste this address and join.</li></ol><div className="atlas-dialog__address"><code>{ADDRESS}</code><button className="atlas-button" onClick={copyAddress}>{copy === 'copied' ? 'Copied ✓' : 'Copy address'} <Arrow /></button></div><p role="status">{copy === 'error' ? 'Clipboard unavailable. Select and copy the address above.' : 'Use the same game version as the server.'}</p></AtlasDialog>}
    </div>
  );
}
