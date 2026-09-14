'use client';

import '@/app/frontier.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatAge } from '@/lib/format';
import type { FeedPost } from '@/app/api/crew/feed/route';
import TrailNav from '@/components/frontier/TrailNav';
import Footer from '@/components/frontier/Footer';
import PlayerHead from '@/components/frontier/PlayerHead';
import { PAGE_LINKS } from '@/components/frontier/data';

interface CrewSummary {
  username:   string;
  bio:        string;
  photoCount: number;
  postCount:  number;
  lastPost:   string | null;
}

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewSummary[] | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [tab,  setTab]  = useState<'members' | 'feed'>('members');

  useEffect(() => {
    fetch('/api/crew').then(r => r.json()).then(setCrew).catch(() => setCrew([]));
    fetch('/api/crew/feed').then(r => r.json()).then(setFeed).catch(() => {});
  }, []);

  return (
    <>
      <TrailNav links={PAGE_LINKS} />
      <main className="f-page">
        <div className="f-wrap">
          <Link href="/" className="f-back">← Home</Link>
          <h1 className="f-page__title">The crew</h1>
          <p className="f-page__lede">
            Everyone on the whitelist. Each page has a bio, stats read from the world, posts and screenshots.
          </p>

          <div className="f-tabs" role="tablist" style={{ marginTop: '2rem' }}>
            <button role="tab" aria-selected={tab === 'members'} className={`f-tab${tab === 'members' ? ' is-active' : ''}`} onClick={() => setTab('members')}>
              Members
            </button>
            <button role="tab" aria-selected={tab === 'feed'} className={`f-tab${tab === 'feed' ? ' is-active' : ''}`} onClick={() => setTab('feed')}>
              Latest posts{feed.length > 0 ? ` (${feed.length})` : ''}
            </button>
          </div>

          {tab === 'members' && (
            crew === null ? <p className="f-note">Loading the roster…</p> :
            <ul className="f-members" style={{ marginTop: 0 }}>
              {crew.map(m => (
                <li key={m.username}>
                  <Link href={`/crew/${m.username}`} className="f-member">
                    <PlayerHead name={m.username} size={64} />
                    <span style={{ minWidth: 0 }}>
                      <span className="f-member__name">{m.username}</span>
                      <span className={`f-member__bio${m.bio ? '' : ' is-empty'}`}>{m.bio || 'No bio yet'}</span>
                    </span>
                    <span className="f-member__meta">
                      {m.postCount} post{m.postCount === 1 ? '' : 's'}<br />
                      {m.photoCount} photo{m.photoCount === 1 ? '' : 's'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {tab === 'feed' && (
            feed.length === 0 ? (
              <p className="f-empty">Nothing posted yet. Crew members write posts from their own page.</p>
            ) : (
              <ul className="f-feed">
                {feed.map(post => (
                  <li key={post.id} className="f-post">
                    <span className="f-row__head"><PlayerHead name={post.username} size={64} /></span>
                    <div>
                      <div className="f-post__meta">
                        <Link href={`/crew/${post.username}`} className="f-post__who">{post.username}</Link>
                        <span>{formatAge(post.createdAt)}</span>
                      </div>
                      <p className="f-post__text">{post.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
