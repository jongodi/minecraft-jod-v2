'use client';

import '@/app/frontier.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatAge } from '@/lib/format';
import type { FeedPost } from '@/app/api/crew/feed/route';
import TrailNav from '@/components/frontier/TrailNav';
import Footer from '@/components/frontier/Footer';
import PlayerHead from '@/components/frontier/PlayerHead';
import { Arrow, Pin, Stamp } from '@/components/frontier/Bits';
import { PAGE_LINKS } from '@/components/frontier/data';

interface CrewSummary { username: string; bio: string; photoCount: number; postCount: number; lastPost: string | null }
const TILT = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5];
const TAGT = [-3, 2];

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewSummary[] | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [tab,  setTab]  = useState<'members' | 'feed'>('members');

  useEffect(() => {
    fetch('/api/crew').then(r => r.json()).then(setCrew).catch(() => setCrew([]));
    fetch('/api/crew/feed').then(r => r.json()).then(setFeed).catch(() => {});
  }, []);

  return (
    <div className="j-desk">
      <div className="j">
        <div className="j-grain" aria-hidden="true" />
        <TrailNav links={PAGE_LINKS} always />
        <main className="j-wrap j-page">
          <Link href="/" className="j-back"><Arrow flip /> aftur á forsíðu</Link>
          <div className="j-page__head">
            <div>
              <Stamp r={-4}>Hópurinn</Stamp>
              <h1 className="j-page__title" style={{ marginTop: '0.75rem' }}>JOÐ-félagar</h1>
              <p className="j-note">öll sem hafa aðgang. Á hverri síðu eru kynning, tölur úr leiknum, færslur og myndir</p>
            </div>
            <div className="j-tags" style={{ marginBottom: 0 }} role="tablist">
              {(['members', 'feed'] as const).map((t, i) => (
                <button key={t} role="tab" aria-selected={tab === t} className={`j-tag${tab === t ? ' is-active' : ''}`} style={{ '--r': `${TAGT[i]}deg` } as CSSProperties} onClick={() => setTab(t)}>
                  <Pin />{t === 'members' ? 'Félagar' : `Nýjustu færslur${feed.length ? ` (${feed.length})` : ''}`}
                </button>
              ))}
            </div>
          </div>

          {tab === 'members' && (
            crew === null ? <p className="j-empty">sæki félagalistann…</p> :
            <div className="j-rollcall">
              {crew.map((m, i) => (
                <div key={m.username} className="j-poster__slot">
                  <Link href={`/crew/${m.username}`} className="j-poster j-poster--crew" style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}>
                    <span className="j-nail" aria-hidden="true" />
                    <div className="j-poster__img"><PlayerHead name={m.username} size={128} /></div>
                    <div className="j-poster__name">{m.username}</div>
                    <div className="j-poster__note">{m.bio || (m.lastPost ? `skrifaði ${formatAge(m.lastPost)}` : 'ekkert heyrst enn')}</div>
                    <div className="j-poster__meta">{m.postCount} {m.postCount === 1 ? 'færsla' : 'færslur'} · {m.photoCount} {m.photoCount === 1 ? 'mynd' : 'myndir'}</div>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {tab === 'feed' && (
            feed.length === 0 ? (
              <p className="j-empty">engar færslur enn. Félagar geta skrifað færslur á eigin síðu</p>
            ) : (
              <ul className="j-tapefeed">
                {feed.map(post => (
                  <li key={post.id} className="j-tapefeed__strip">
                    <span className="j-ledger__head" style={{ width: '2.2rem', height: '2.2rem' }}><PlayerHead name={post.username} size={64} /></span>
                    <div className="j-tapefeed__body">
                      <div className="j-tapefeed__meta">
                        <Link href={`/crew/${post.username}`} className="j-post__who">{post.username}</Link>
                        <span>{formatAge(post.createdAt)}</span>
                      </div>
                      <p className="j-tapefeed__text">{post.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
