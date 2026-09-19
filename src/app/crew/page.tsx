'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import '@/app/wall.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatAge } from '@/lib/format';
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
  const [crew, setCrew] = useState<CrewSummary[] | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [tab,  setTab]  = useState<'members' | 'board'>('members');
  const [staleLink, setStaleLink] = useState(false);

  useEffect(() => {
    setStaleLink(new URLSearchParams(window.location.search).get('lykill') === 'utrunninn');
    fetch('/api/crew', { cache: 'no-store' }).then(r => r.json()).then(setCrew).catch(() => setCrew([]));
    fetch('/api/crew/feed?limit=40', { cache: 'no-store' }).then(r => r.json()).then(setFeed).catch(() => {});
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
          <div className="b-tabs" style={{ marginBottom: 0 }} role="tablist">
            {(['members', 'board'] as const).map(t => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={`b-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
                {t === 'members' ? 'Félagar' : `Á töflunni${feed.length ? ` (${feed.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {tab === 'members' && (
          crew === null ? <p className="b-empty">sæki félagalistann…</p> :
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
                  <div className="b-poster__meta">{m.entryCount} {m.entryCount === 1 ? 'færsla' : 'færslur'} · {m.photoCount} {m.photoCount === 1 ? 'mynd' : 'myndir'}</div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {tab === 'board' && (
          feed.length === 0 ? (
            <p className="b-empty">ekkert á töflunni enn. Félagar festa miða og myndir upp á eigin vegg</p>
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
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
