'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FeedPost } from '@/app/api/crew/feed/route';
import type { StatusResponse } from '@/app/api/server-status/route';
import WorldCrew from '@/components/atlas/WorldCrew';
import { useResource } from '@/components/atlas/useResource';
import { formatAge } from '@/lib/format';

function CrewFeed() {
  const { data, loading, error, retry } =
    useResource<FeedPost[]>('/api/crew/feed');
  return (
    <div className="atlas-feed">
      {data?.map((post) => (
        <article key={post.id}>
          <header>
            <Link href={`/crew/${encodeURIComponent(post.username)}`}>
              {post.username}
            </Link>
            <time dateTime={post.createdAt}>
              {formatAge(post.createdAt)} ago
            </time>
          </header>
          <p>{post.text}</p>
        </article>
      ))}
      {!data?.length && (
        <div className="atlas-empty">
          {loading
            ? 'Loading posts…'
            : error
              ? 'Couldn’t load the crew’s posts.'
              : 'No posts yet. Share an update from your profile.'}
          {error && (
            <button className="atlas-text-button" onClick={retry}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CrewPage() {
  const [view, setView] = useState<'members' | 'feed'>('members');
  const status = useResource<StatusResponse>('/api/server-status', 60_000);
  const known =
    !!status.data && !status.error && status.data.source !== 'error';
  return (
    <div className="atlas atlas-directory">
      <header className="atlas-nav">
        <Link href="/" className="atlas-brand" aria-label="JOÐ home">
          JOÐ
          <span className="atlas-brand__square" />
        </Link>
        <span className="atlas-nav__edition">The people behind the places</span>
        <nav aria-label="Main navigation">
          <Link href="/">
            Back to the world <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <main className="atlas-explorer">
        <div className="atlas-section-head">
          <div>
            <span className="atlas-eyebrow">
              Private survival · Shared stories
            </span>
            <h1>The crew.</h1>
          </div>
          <p>
            Catch up. Leave a note.
            <br />
            Plan the next build.
          </p>
        </div>
        <div className="atlas-directory__switch" aria-label="Crew views">
          {(['members', 'feed'] as const).map((item) => (
            <button
              key={item}
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {item === 'members' ? 'Members & stats' : 'Latest posts'}
            </button>
          ))}
        </div>
        {view === 'members' ? (
          <WorldCrew
            showProfileLink={false}
            onlineNames={
              known
                ? (status.data?.players?.list ?? []).map(
                    (player) => player.name,
                  )
                : []
            }
            statusKnown={known}
          />
        ) : (
          <CrewFeed />
        )}
      </main>
      <footer className="atlas-footer">
        <Link href="/">← Back to the world</Link>
        <nav aria-label="Tools">
          <Link href="/rp-editor">Pack editor ↗</Link>
          <Link href="/admin">Admin ↗</Link>
        </nav>
      </footer>
    </div>
  );
}
