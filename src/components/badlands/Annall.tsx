'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AnnalNight, AnnalsResponse } from '@/app/api/playnight/past/route';
import { Fire, Heads } from './NightLine';
import PlayerHead from './PlayerHead';
import Rail, { revealRailItem } from './Rail';
import { dayOf, sinceAt } from './night';
import { photoProps, PHOTO_SIZES } from './photo';
import { plural } from '@/lib/format';
import { woodClass } from '@/lib/sign-wood';

/* Annáll: the play nights that have been, at the foot of the crew's room.
   Each is a burnt-out fire on one strip of ground, newest first; a press
   opens that evening under them: who lit it, who came, who said they would
   and didn't, and Myndir kvöldsins, the screenshots the crew took that
   evening and pinned to their walls (src/lib/night-photos.ts). Fetched when
   the room is first opened; a room with no past nights shows nothing. */

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
const clock = (iso: string) => { const d = new Date(iso); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
/** "3. okt.", with the year for a night of another year: short enough to stand under its fire */
const shortDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}${d.getUTCFullYear() !== new Date().getUTCFullYear() ? ` ${d.getUTCFullYear()}` : ''}`;
};

export default function Annall() {
  const [nights, setNights] = useState<AnnalNight[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  /* a night burnt down keeps its link (/kvold/<id>): it opens here, brought into view once */
  const fromLink = useRef(false);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/playnight/past', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() as Promise<AnnalsResponse> : null))
      .then(d => {
        if (!live) return;
        const list = d?.nights ?? [];
        setNights(list);
        const id = /^\/kvold\/([^/]+)/.exec(window.location.pathname)?.[1];
        if (id && list.some(n => n.id === id)) { fromLink.current = true; setPicked(id); }
      })
      .catch(() => { if (live) setNights([]); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!picked || !fromLink.current || !box.current) return;
    fromLink.current = false;
    revealRailItem(picked, box.current);
    /* only the room scrolls, as it does to a fire opened from its link (PlayNight.tsx) */
    const el = box.current.querySelector<HTMLElement>('.b-annall__evening');
    const room = box.current.closest<HTMLElement>('.b-room__body');
    if (!el || !room) return;
    const top = el.getBoundingClientRect().top - room.getBoundingClientRect().top + room.scrollTop - parseFloat(getComputedStyle(el).scrollMarginTop || '0');
    room.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [picked]);

  if (!nights || nights.length === 0) return null;
  const night = nights.find(n => n.id === picked) ?? null;

  return (
    <section ref={box} className="b-annall" aria-label="Annáll">
      <div className="w-strip__head">
        <h3 className="w-strip__title">Annáll</h3>
        <p className="b-note">{nights.length} kvöld við eldinn</p>
      </div>
      <Rail className="b-annall__rail" label="Liðin spilakvöld" prevLabel="Nýrri kvöld" nextLabel="Eldri kvöld" count={nights.length}>
        {nights.map(n => (
          <button
            key={n.id}
            type="button"
            className={`b-annall__fire${n.id === picked ? ' is-on' : ''}`}
            aria-pressed={n.id === picked}
            data-rail-item={n.id}
            onClick={() => setPicked(p => (p === n.id ? null : n.id))}
          >
            <Fire count={0} embers />
            <span className="b-annall__day">{shortDay(n.at)}</span>
            <span className="b-annall__sub">
              {n.came.length} {plural(n.came.length, 'mætti', 'mættu')}
              {n.photos.length > 0 && ` · ${n.photos.length} ${plural(n.photos.length, 'mynd', 'myndir')}`}
            </span>
          </button>
        ))}
      </Rail>
      {night && <Evening night={night} />}
    </section>
  );
}

/** One evening of the annals, opened under the fires. */
function Evening({ night }: { night: AnnalNight }) {
  return (
    <article className="b-night b-night--over b-annall__evening" aria-label={`Annáll: ${dayOf(night.at)}`}>
      <header className="b-night__top">
        <span className="b-night__kicker">Annáll</span>
        <h4 className="b-night__title">{cap(sinceAt(night.at))}</h4>
        <p className="b-note">
          {night.note && <><q>{night.note}</q> · </>}{night.by} kveikti bálið
          {night.startedBy && `, ${night.startedBy} kveikti á þjóninum`}
        </p>
      </header>
      <div className="b-night__one">
        <div className="b-night__camp"><Fire count={0} embers big /><Heads names={night.came} /></div>
        <div className="b-night__body">
          <p className="b-night__count">{night.came.length} {plural(night.came.length, 'mætti', 'mættu')}</p>
          {night.noShows.length > 0 && <p className="b-note">Sögðust mæta en komu ekki: {night.noShows.join(', ')}</p>}
        </div>
      </div>
      <div className="b-annall__pics">
        <p className="b-night__kicker">Myndir kvöldsins</p>
        {night.photos.length === 0 ? (
          <p className="b-note">Skjámyndir sem eru teknar um kvöldið og festar á vegg birtast hér.</p>
        ) : (
          <Rail className="w-strip" label="Myndir kvöldsins" prevLabel="Fyrri myndir" nextLabel="Næstu myndir" count={night.photos.length}>
            {night.photos.map(p => (
              <Link key={p.id} href={`/crew/${p.username}#${p.entryId}`} className={`w-sign${woodClass(p.wood)} w-note-card`} data-rail-item={p.id}>
                <span className="w-note-card__pic">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...photoProps(p.filename, PHOTO_SIZES.strip)} alt={p.caption || ''} loading="lazy" decoding="async" />
                </span>
                {p.caption && <span className="w-note-card__text">{p.caption}</span>}
                <span className="w-note-card__who"><PlayerHead name={p.username} size={16} alt="" /><b>{p.username}</b><span>kl. {clock(p.takenAt)}</span></span>
              </Link>
            ))}
          </Rail>
        )}
      </div>
    </article>
  );
}
