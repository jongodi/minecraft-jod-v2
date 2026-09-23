'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import '@/app/wall.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatAge, plural } from '@/lib/format';
import type { CrewSummary } from '@/app/api/crew/route';
import type { FeedEntry } from '@/app/api/crew/feed/route';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import PlayerHead from '@/components/badlands/PlayerHead';
import { ArrowIcon } from '@/components/badlands/Bits';
import { PAGE_LINKS } from '@/components/badlands/data';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';

/** The roll call: one poster per member, and beside it the notice board
    with what was pinned last across every wall. */
export default function CrewPage() {
  /* null while loading; 'error' if the list never came */
  const [crew, setCrew] = useState<CrewSummary[] | null | 'error'>(null);
  const [feed, setFeed] = useState<FeedEntry[] | null | 'error'>(null);
  const [tab,  setTab]  = useState<'members' | 'board'>('members');
  const [staleLink, setStaleLink] = useState(false);

  useEffect(() => {
    setStaleLink(new URLSearchParams(window.location.search).get('lykill') === 'utrunninn');
    /* an error answer is JSON too ({ error }), so only an array is a list */
    const list = <T,>(url: string, set: (v: T[] | 'error') => void) =>
      fetch(url, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then((rows: unknown) => set(Array.isArray(rows) ? (rows as T[]) : 'error'))
        .catch(() => set('error'));
    list<CrewSummary>('/api/crew', setCrew);
    list<FeedEntry>('/api/crew/feed?limit=40', setFeed);
  }, []);

  return (
    <div className="b">
      <AddressBar links={PAGE_LINKS} always />
      <main className="b-wrap b-page">
        <Link href="/" className="b-back"><ArrowIcon flip /> aftur á forsíðu</Link>
        {staleLink && (
          <p className="w-welcome" role="status">Þessi innskráningartengill er útrunninn eða þegar notaður. Biddu stjórnandann um nýjan.</p>
        )}
        <div className="b-page__head">
          <div>
            <h1 className="b-title">Hópurinn</h1>
            <p className="b-lede">Öll sem hafa aðgang. Hvert og eitt á sinn vegg: kynningu, tölur úr leiknum, miða og myndir.</p>
          </div>
          <div className="b-tabs" style={{ marginBottom: 0 }} role="tablist" aria-label="Hópurinn">
            {(['members', 'board'] as const).map(t => (
              <button key={t} id={`tab-${t}`} type="button" role="tab" aria-selected={tab === t} aria-controls={`panel-${t}`} className={`b-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
                {t === 'members' ? 'Félagar' : `Á töflunni${Array.isArray(feed) && feed.length ? ` (${feed.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {tab === 'members' && (
          <div id="panel-members" role="tabpanel" aria-labelledby="tab-members">
          {crew === null ? <p className="b-empty" role="status">sæki félagalistann…</p> :
           crew === 'error' ? <p className="b-empty" role="alert">Náði ekki í félagalistann. Reyndu aftur eftir smástund.</p> :
          <div className="b-rollcall">
            {crew.map(m => (
              <div key={m.username}>
                <Link href={`/crew/${m.username}`} className={`b-paper b-paper--torn b-poster b-poster--crew${m.cover ? ' has-cover' : ''}`}>
                  {m.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="b-poster__cover" {...photoProps(m.cover, PHOTO_SIZES.strip)} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                  )}
                  <span className="b-paper__nail b-paper__nail--l" aria-hidden="true" />
                  <span className="b-paper__nail b-paper__nail--r" aria-hidden="true" />
                  <div className="b-poster__img"><PlayerHead name={m.username} size={128} /></div>
                  <div className="b-poster__name">{m.username}</div>
                  <div className="b-poster__note">{m.bio || (m.lastEntry ? `festi eitthvað upp ${formatAge(m.lastEntry)}` : 'ekkert heyrst enn')}</div>
                  <div className="b-poster__meta"><span className="b-nowrap">{m.entryCount} {plural(m.entryCount, 'færsla', 'færslur')}</span> · <span className="b-nowrap">{m.photoCount} {plural(m.photoCount, 'mynd', 'myndir')}</span></div>
                </Link>
              </div>
            ))}
          </div>}
          </div>
        )}

        {tab === 'board' && (
          <div id="panel-board" role="tabpanel" aria-labelledby="tab-board">
          {feed === null ? (
            <p className="b-empty" role="status">sæki töfluna…</p>
          ) : feed === 'error' ? (
            <p className="b-empty" role="alert">Náði ekki í töfluna. Reyndu aftur eftir smástund.</p>
          ) : feed.length === 0 ? (
            <p className="b-empty">Ekkert á töflunni enn. Félagar festa miða og myndir upp á eigin vegg.</p>
          ) : (
            <ul className="w-board">
              {feed.map(e => (
                <li key={e.id}>
                  <Link href={`/crew/${e.username}#${e.id}`} className="b-paper w-note-card">
                    {e.photos[0] && (
                      <span className="w-note-card__pic">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img {...photoProps(e.photos[0].filename, PHOTO_SIZES.strip)} alt={e.photos[0].caption || ''} loading="lazy" decoding="async" />
                      </span>
                    )}
                    {(e.text || e.photos[0]?.caption) && <span className="w-note-card__text">{e.text || e.photos[0]?.caption}</span>}
                    <span className="w-note-card__who"><PlayerHead name={e.username} size={16} /><b>{e.username}</b><span>{formatAge(e.createdAt)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
