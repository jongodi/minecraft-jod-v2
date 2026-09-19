'use client';

import '@/app/wall.css';
import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import Wanted from './Wanted';
import Rail from './Rail';
import { CREW } from './data';
import { useStats, type ServerState } from './hooks';
import { formatAge } from '@/lib/format';
import type { CrewSummary } from '@/app/api/crew/route';
import type { FeedEntry } from '@/app/api/crew/feed/route';
import { photoProps, PHOTO_SIZES } from './photo';

const STRIP = 12;

/** The crew's room, opened over the world. Portraits of the eight with a
    lantern behind the ones who are in, the notice strip with what was pinned
    last on their walls, then the wanted board on one rail. Everything here is
    fetched when the room is first opened, not with the page. */
function Crew({ server }: { server: ServerState }) {
  const stats = useStats();
  const [summary, setSummary] = useState<Record<string, CrewSummary>>({});
  const [strip, setStrip]     = useState<FeedEntry[] | null>(null);
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - inside);

  useEffect(() => {
    fetch('/api/crew', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((rows: CrewSummary[] | null) => { if (rows) setSummary(Object.fromEntries(rows.map(r => [r.username.toLowerCase(), r]))); })
      .catch(() => {});
    fetch(`/api/crew/feed?limit=${STRIP}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((rows: FeedEntry[] | null) => setStrip(rows ?? []))
      .catch(() => setStrip([]));
  }, []);

  return (
    <div className="b-wrap b-crew">
      <div className="b-crew__row">
        <ul className="b-folk" aria-label="Hópurinn">
          {CREW.map(name => {
            const on = !!online && lower.includes(name.toLowerCase());
            const row = summary[name.toLowerCase()];
            return (
              <li key={name}>
                <Link href={`/crew/${name}`} className={`b-folk__item${on ? ' is-in' : ''}`}>
                  <span className="b-folk__frame">
                    <PlayerHead name={name} size={96} />
                    {on && <span className="b-folk__in">inni</span>}
                  </span>
                  <span className="b-folk__name">{name}</span>
                  {row && row.photoCount > 0 && <span className="b-folk__count">{row.photoCount} {row.photoCount === 1 ? 'mynd' : 'myndir'}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="b-note b-crew__who" aria-live="polite">
          {online === null ? 'athuga hver er inni' :
           online ? (inside === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${inside} úr hópnum inni núna${guests ? `, gestir: ${guests}` : ''}`) :
           'slökkt á þjóninum, allir í pásu'}
        </p>
      </div>

      {/* the notice strip: the newest things on every wall, each a tap from where it hangs */}
      {strip && strip.length > 0 && (
        <section className="w-strip" aria-label="Á töflunni">
          <div className="w-strip__head">
            <h3 className="w-strip__title">Á töflunni</h3>
            <p className="b-note">það nýjasta af veggjum hópsins</p>
          </div>
          <Rail label="Nýjast af veggjunum" prevLabel="Fyrri" nextLabel="Næstu" count={strip.length}>
            {strip.map(e => (
              <Link key={e.id} href={`/crew/${e.username}#${e.id}`} className="b-paper w-note-card" data-rail-item={e.id}>
                {e.photos[0] && (
                  <span className="w-note-card__pic">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img {...photoProps(e.photos[0].filename, PHOTO_SIZES.strip)} alt={e.photos[0].caption || ''} loading="lazy" decoding="async" />
                  </span>
                )}
                {(e.text || e.photos[0]?.caption) && <span className="w-note-card__text">{e.text || e.photos[0]?.caption}</span>}
                <span className="w-note-card__who"><PlayerHead name={e.username} size={16} /><b>{e.username}</b><span>{formatAge(e.createdAt)}</span></span>
              </Link>
            ))}
          </Rail>
        </section>
      )}

      <Wanted stats={stats} />

      <div className="b-crew__foot">
        <Link href="/crew" className="b-btn b-btn--small">Veggir hópsins og öll tölfræðin</Link>
      </div>
    </div>
  );
}

export default memo(Crew);
