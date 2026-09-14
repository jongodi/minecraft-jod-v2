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
  const [crew, setCrew]     = useState<CrewSummary[] | null>(null);
  const [feed, setFeed]     = useState<FeedPost[]>([]);
  const [tab,  setTab]      = useState<'members' | 'feed'>('members');

  useEffect(() => {
    fetch('/api/crew').then(r => r.json()).then(setCrew).catch(() => setCrew([]));
    fetch('/api/crew/feed').then(r => r.json()).then(setFeed).catch(() => {});
  }, []);

  return (
    <>
      <TrailNav links={PAGE_LINKS} solid />
      <main className="f-page">
        <div className="f-wrap">
          <Link href="/" className="f-back f-label">← Back to the trail</Link>

          <header className="f-head f-page__head">
            <p className="f-head__kicker f-label">Crew</p>
            <h1 className="f-head__title">The eight of us</h1>
            <p className="f-head__lede">
              Everyone on the whitelist. Each page has a bio, stats pulled from the world, posts and screenshots.
            </p>
          </header>

          <div className="f-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'members'} className={`f-tab f-label${tab === 'members' ? ' is-active' : ''}`} onClick={() => setTab('members')}>
              Members
            </button>
            <button role="tab" aria-selected={tab === 'feed'} className={`f-tab f-label${tab === 'feed' ? ' is-active' : ''}`} onClick={() => setTab('feed')}>
              Latest posts{feed.length > 0 ? ` (${feed.length})` : ''}
            </button>
          </div>

          {tab === 'members' && (
            crew === null ? <p className="f-note">Loading the roster…</p> :
            <div className="f-crewgrid">
              {crew.map(m => (
                <Link key={m.username} href={`/crew/${m.username}`} className="f-member">
                  <span className="f-rider__frame"><PlayerHead name={m.username} size={128} /></span>
                  <span>
                    <span className="f-member__name">{m.username}</span>
                    <span className={`f-member__bio${m.bio ? '' : ' is-empty'}`}>{m.bio || 'No bio yet'}</span>
                    <span className="f-member__meta f-label">
                      <span>{m.postCount} post{m.postCount === 1 ? '' : 's'}</span>
                      <span>{m.photoCount} photo{m.photoCount === 1 ? '' : 's'}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {tab === 'feed' && (
            feed.length === 0 ? (
              <p className="f-empty">Nothing posted yet. Crew members write posts from their own page.</p>
            ) : (
              <div className="f-feed">
                {feed.map(post => (
                  <article key={post.id} className="f-post">
                    <span className="f-row__head"><PlayerHead name={post.username} size={64} /></span>
                    <div>
                      <div className="f-post__meta">
                        <Link href={`/crew/${post.username}`} className="f-post__who">{post.username}</Link>
                        <span className="f-post__when f-label">{formatAge(post.createdAt)}</span>
                      </div>
                      <p className="f-post__text">{post.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
