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
import NightSky from '@/components/badlands/NightSky';
import { NightLine } from '@/components/badlands/NightLine';
import { CREW, PAGE_LINKS } from '@/components/badlands/data';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';
import { woodClass } from '@/lib/sign-wood';

/* a member's poster before the list has come: the name, nothing about the wall yet */
const blankPoster = (username: string): CrewSummary => ({ username, bio: '', entryCount: 0, photoCount: 0, lastEntry: null, cover: null, bestDrawMs: null });

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
      {/* the walls are the crew's room continued, so its lantern burns here too */}
      <AddressBar links={PAGE_LINKS} activeId="hopur" always />
      <NightSky />
      <main id="efni" className="b-wrap b-page">
        {staleLink && (
          <p className="w-welcome" role="status">Þessi innskráningartengill er útrunninn eða þegar notaður. Biddu stjórnandann um nýjan.</p>
        )}
        <div className="b-page__head">
          <div>
            {/* named as the door that leads here, so the door pressed and the page landed on agree */}
            <h1 className="b-title">Eftirlýst</h1>
            <p className="b-lede">Hópurinn, öll sem hafa aðgang. Hvert og eitt á sinn vegg: kynningu, tölur úr leiknum, miða og myndir.</p>
            {/* the next fire: the room on the home page holds it, one tap away */}
            <div className="b-page__night"><NightLine href="/kvold#hopur" /></div>
          </div>
          {/* tabs as a keyboard expects them: one stop for Tab, the arrows go between them */}
          <div className="b-tabs" style={{ marginBottom: 0 }} role="tablist" aria-label="Hópurinn"
            onKeyDown={e => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              const next = e.key === 'Home' ? 'members' : e.key === 'End' ? 'board' : tab === 'members' ? 'board' : 'members';
              setTab(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}>
            {(['members', 'board'] as const).map(t => (
              <button key={t} id={`tab-${t}`} type="button" role="tab" aria-selected={tab === t} aria-controls={`panel-${t}`} tabIndex={tab === t ? 0 : -1} className={`b-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
                {t === 'members' ? 'Félagar' : `Á töflunni${Array.isArray(feed) && feed.length ? ` (${feed.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {tab === 'members' && (
          <div id="panel-members" role="tabpanel" aria-labelledby="tab-members">
          {crew === 'error' ? <p className="b-empty" role="alert">Náði ekki í félagalistann. Reyndu aftur eftir smástund.</p> :
          /* the eight are known before the list comes, so their posters stand at
             once and only the lines about each wall fill in */
          <div className="b-rollcall" aria-busy={crew === null}>
            {(crew ?? CREW.map(blankPoster)).map(m => (
              <div key={m.username} className="b-hang">
                <Link href={`/crew/${m.username}`} className={`b-paper b-paper--torn b-poster b-poster--crew${m.cover ? ' has-cover' : ''}`}>
                  {m.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="b-poster__cover" {...photoProps(m.cover, PHOTO_SIZES.strip)} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                  )}
                  <span className="b-paper__nail b-paper__nail--l" aria-hidden="true" />
                  <span className="b-paper__nail b-paper__nail--r" aria-hidden="true" />
                  <span className="b-poster__mast" aria-hidden="true">Eftirlýst</span>
                  <div className="b-poster__img"><PlayerHead name={m.username} size={128} alt="" /></div>
                  <div className="b-poster__name">{m.username}</div>
                  {crew === null ? (<>
                    <div className="b-poster__note">sæki vegginn…</div>
                    {/* held open at the height its line will take, so nothing moves when it comes */}
                    <div className="b-poster__meta" aria-hidden="true" style={{ visibility: 'hidden' }}><span className="b-nowrap">0 færslur</span> · <span className="b-nowrap">0 myndir</span></div>
                  </>) : (<>
                    <div className="b-poster__note">{m.bio || (m.lastEntry ? `festi eitthvað upp ${formatAge(m.lastEntry)}` : 'ekkert heyrst enn')}</div>
                    {/* a bare wall says so once, in the line above; its two zeros keep their height so the board's rows stay level */}
                    <div className="b-poster__meta" aria-hidden={m.entryCount + m.photoCount === 0 || undefined} style={m.entryCount + m.photoCount === 0 ? { visibility: 'hidden' } : undefined}><span className="b-nowrap">{m.entryCount} {plural(m.entryCount, 'færsla', 'færslur')}</span> · <span className="b-nowrap">{m.photoCount} {plural(m.photoCount, 'mynd', 'myndir')}</span></div>
                  </>)}
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
                  <Link href={`/crew/${e.username}#${e.id}`} className={`w-sign${woodClass(e.wood)} w-note-card`}>
                    {e.photos[0] && (
                      <span className="w-note-card__pic">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img {...photoProps(e.photos[0].filename, PHOTO_SIZES.strip)} alt={e.photos[0].caption || ''} loading="lazy" decoding="async" />
                      </span>
                    )}
                    {(e.text || e.photos[0]?.caption) && <span className="w-note-card__text">{e.text || e.photos[0]?.caption}</span>}
                    <span className="w-note-card__who"><PlayerHead name={e.username} size={16} alt="" /><b>{e.username}</b><span>{formatAge(e.createdAt)}</span></span>
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
