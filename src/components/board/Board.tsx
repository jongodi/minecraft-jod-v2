'use client';

import '@/app/board.css';
import '@/app/wall.css';
import '@/app/taflan.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CrewEntry } from '@/lib/crew-types';
import { bountyState, mentionsIn, sameUser } from '@/lib/crew-types';
import { FILTERS, byDay, dayLabel, inFilter, isNew, newestAt, type BoardFilter, type BoardItem, type BoardResponse } from '@/lib/board-types';
import { formatDate, plural } from '@/lib/format';
import { useCrewSession, useMounted } from '@/components/badlands/hooks';
import { NightLine } from '@/components/badlands/NightLine';
import PlayerHead from '@/components/badlands/PlayerHead';
import { CREW } from '@/components/badlands/data';
import Composer from '@/components/wall/Composer';
import Print from '@/components/wall/Print';
import Notice from './Notice';
import { markSeen, takeStamps, useBoardNews } from './news';

/* The lightbox and the motion library it throws with come when the board is idle, as on a wall. */
const WallLightbox = dynamic(() => import('@/components/wall/WallLightbox'), { ssr: false });

type Post = Extract<BoardItem, { kind: 'post' }>;
type Shown = BoardFilter | 'mer';

/* a board left open is asked again when it is opened after this long */
const STALE_MS = 60_000;
/* how long the board is looked at before what it shows counts as seen */
const SEEN_AFTER_MS = 1500;

/** Whether a post calls the one looking by name, in its words or in a reply under it. */
const callsMe = (item: BoardItem, me: string | null | undefined) =>
  !!me && item.kind === 'post' && item.who.toLowerCase() !== me.toLowerCase() &&
  (mentionsIn(item.entry.text).some(n => sameUser(n, me)) || item.entry.replies.some(r => !sameUser(r.username, me) && mentionsIn(r.text).some(n => sameUser(n, me))));

interface Props {
  /** open over the world on the home page, rather than its own page */
  room?: boolean;
  /** being looked at: the room is open, or the page is the board's own */
  open?: boolean;
  /** the board as the server drew its own page with it */
  initial?: BoardResponse | null;
  /** the filter the page's address asked for */
  initialFilter?: BoardFilter;
}

/** Taflan: everything that happens on JOÐ, newest first, on one notice
    board. What the crew pinned hangs as their signs, each on its place's
    wood, with lanterns, replies, calls taken on and questions answered right
    here; what the server and the map did is printed on slips beside them.
    What came since the one looking last looked is tagged Nýtt, and what
    calls them by name, Til þín. Members put things up from the slot at the
    top; everyone can read it. */
export default function Board({ room = false, open = true, initial = null, initialFilter = 'allt' }: Props) {
  const { me } = useCrewSession();
  const mounted = useMounted();
  const [data, setData] = useState<BoardResponse | null>(initial);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Shown>(initialFilter);
  /* the sign just put up from here, which swings in on its chains */
  const [fresh, setFresh] = useState<string | null>(null);
  const loadedAt = useRef(0);
  const { seen } = useBoardNews();

  /* asked when the board is first looked at, and again when it is opened after standing a while */
  useEffect(() => {
    if (!open) return;
    if (loadedAt.current && Date.now() - loadedAt.current < STALE_MS && attempt === 0) return;
    let live = true;
    setFailed(false);
    fetch('/api/board', { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: BoardResponse) => {
        if (!live || !Array.isArray(d.items)) return;
        loadedAt.current = Date.now();
        setData(d);
        takeStamps(d.items.map(i => ({ at: i.at, who: i.who })));
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [open, attempt]);

  /* The filter is in the page's address (?syna=myndir), so a refresh, a
     shared link and Back keep it; over the world it is the room's own. */
  const choose = useCallback((f: Shown) => {
    setFilter(f);
    if (room) return;
    const url = new URL(window.location.href);
    if (f === 'allt' || f === 'mer') url.searchParams.delete('syna'); else url.searchParams.set('syna', f);
    history.replaceState(history.state, '', url);
  }, [room]);

  /* What was seen as this look began, for the tags; the mark itself moves up
     a moment after the board is looked at, so the door's count goes out. A
     board closed and opened again starts a new look. */
  const [since, setSince] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!open) { setSince(undefined); return; }
    if (since === undefined && seen !== undefined && data) setSince(seen);
  }, [open, seen, data, since]);
  useEffect(() => {
    if (!open || !data || since === undefined || me === undefined) return;
    const t = setTimeout(() => markSeen(newestAt(data.items), me), SEEN_AFTER_MS);
    return () => clearTimeout(t);
  }, [open, data, since, me]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const places = useMemo(() => data?.places ?? [], [data]);
  const toMe = useMemo(() => items.filter(i => callsMe(i, me)), [items, me]);
  const shown = useMemo(() => (filter === 'mer' ? toMe : items.filter(i => inFilter(i, filter))), [items, filter, toMe]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, items.filter(i => inFilter(i, f.id)).length])) as Record<BoardFilter, number>, [items]);
  const fresher = (item: BoardItem) => since !== undefined && isNew(item, since, me);
  const newCount = since === undefined ? 0 : items.filter(fresher).length;

  /* still asking something of the crew: calls not yet done, questions not yet closed */
  const calls = useMemo(() => items.filter((i): i is Post => i.kind === 'post' && !!i.entry.bounty && bountyState(i.entry.bounty) !== 'done'), [items]);
  const asks = useMemo(() => items.filter((i): i is Post => i.kind === 'post' && !!i.entry.poll && !i.entry.poll.closed), [items]);

  const onChange = useCallback((id: string, update: (e: CrewEntry) => CrewEntry) =>
    setData(d => d && ({ ...d, items: d.items.map(i => (i.kind === 'post' && i.entry.id === id ? { ...i, entry: update(i.entry) } : i)) })), []);
  const onRemove = useCallback((id: string) =>
    setData(d => d && ({ ...d, items: d.items.filter(i => !(i.kind === 'post' && i.entry.id === id)) })), []);
  const onPinned = useCallback((entry: CrewEntry) => {
    if (!me) return;
    setFresh(entry.id);
    setData(d => d && ({ ...d, items: [{ kind: 'post', id: `p-${entry.id}`, at: entry.createdAt, who: me, wood: d.places.find(p => p.id === entry.placeId)?.wood ?? 'oak', entry }, ...d.items] }));
    /* what was just put up is not news to the one who put it up, and shows under every filter it belongs to */
    setFilter(f => (f === 'allt' || f === 'midar' || (f === 'myndir' && entry.photos.length > 0) ? f : 'allt'));
  }, [me]);

  /* the prints on the board as it is filtered, in its order, for the lightbox */
  const prints = useMemo(() => shown.flatMap(i => (i.kind === 'post' ? i.entry.photos.map(p => ({ ...p, who: i.who })) : [])), [shown]);
  const printsNow = useRef(prints);
  printsNow.current = prints;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const onOpen = useCallback((photoId: string, rect: DOMRect) => { const i = printsNow.current.findIndex(p => p.id === photoId); if (i >= 0) { setOrigin(rect); setLightbox(i); } }, []);
  const lightboxPhotos = useMemo(() => prints.map(p => ({ src: p.filename, title: p.caption || undefined, sub: `${p.who} · ${p.takenAt ? `tekin ${formatDate(p.takenAt)}` : formatDate(p.uploadedAt)}` })), [prints]);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevPhoto = useCallback(() => setLightbox(i => (i !== null && prints.length ? (i - 1 + prints.length) % prints.length : null)), [prints.length]);
  const nextPhoto = useCallback(() => setLightbox(i => (i !== null && prints.length ? (i + 1) % prints.length : null)), [prints.length]);

  /* A pinned call or question is a press away: its sign is brought into view
     where it hangs. A plain #link would change the address, and over the
     world the address is which room is open. */
  const show = useCallback((entryId: string) => {
    setFilter('allt');
    requestAnimationFrame(() => {
      const el = document.getElementById(entryId);
      if (!el) return;
      el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      /* the keyboard follows the eye to the sign */
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    });
  }, []);

  const H = room ? 'h3' : 'h2';
  const now = mounted ? Date.now() : undefined;
  const days = byDay(shown);

  return (
    <div className={`t-board${room ? ' t-board--room' : ''}`}>
      <div className="t-board__main">
        <div className="t-board__head">
          <p className="t-board__news" aria-live="polite">
            {data === null ? (failed ? '' : 'sæki töfluna…') :
             newCount > 0 ? <><b>{newCount} {plural(newCount, 'nýtt', 'ný')}</b> síðan þú leist síðast við</> :
             since !== undefined ? 'Ekkert nýtt síðan þú leist síðast við' : ''}
          </p>
          <div className="t-filters" role="group" aria-label="Sýna">
            {FILTERS.map(f => (
              <button key={f.id} type="button" className={`t-filter${filter === f.id ? ' is-on' : ''}`} aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
                {f.label}{data && f.id !== 'allt' && <span className="t-filter__n">{counts[f.id]}</span>}
              </button>
            ))}
            {toMe.length > 0 && (
              <button type="button" className={`t-filter t-filter--me${filter === 'mer' ? ' is-on' : ''}`} aria-pressed={filter === 'mer'} onClick={() => choose('mer')}>
                Til þín<span className="t-filter__n">{toMe.length}</span>
              </button>
            )}
          </div>
        </div>

        {me ? (
          <Composer username={me} places={places} onPinned={onPinned} active={open} />
        ) : me === null ? (
          <div className="t-join">
            <p className="t-join__text">Allir sjá töfluna; félagarnir festa upp miða, myndir, óskir og spurningar. Ertu í hópnum? Ýttu á hausinn þinn og skráðu þig inn.</p>
            <ul className="t-join__heads" aria-label="Skrá inn sem">
              {CREW.map(n => (
                <li key={n}><Link href={`/crew/${n}?skra=inn`} className="t-join__head b-tip" data-tip={n} aria-label={`Skrá inn sem ${n}`}><PlayerHead name={n} size={32} alt="" /></Link></li>
              ))}
            </ul>
          </div>
        ) : null}

        {failed && data === null ? (
          <p className="b-empty t-board__empty" role="alert">Náði ekki í töfluna. <button type="button" className="b-link" onClick={() => setAttempt(a => a + 1)}>Reyna aftur</button></p>
        ) : data === null ? (
          <div className="t-board__wait" aria-busy="true" />
        ) : shown.length === 0 ? (
          <p className="b-empty t-board__empty">
            {filter === 'allt' ? (me ? 'Taflan er auð enn. Festu upp fyrsta miðann hér fyrir ofan.' : 'Taflan er auð enn.') :
             filter === 'myndir' ? 'Engar myndir á töflunni enn.' :
             filter === 'midar' ? 'Engir miðar á töflunni enn.' :
             filter === 'vidburdir' ? 'Engin bál, kvöld eða afrek síðustu vikurnar.' :
             filter === 'kortid' ? 'Ekkert nýtt á kortinu síðustu vikurnar.' : 'Enginn hefur nefnt þig enn.'}
          </p>
        ) : (
          days.map(({ day, items: dayItems }) => (
            <section key={day} className="t-day" aria-label={dayLabel(day, now)}>
              <H className="t-day__head" suppressHydrationWarning>{dayLabel(day, now)}</H>
              <ul className="t-list">
                {dayItems.map(item => {
                  const isFresh = fresher(item);
                  const calling = callsMe(item, me);
                  return (
                    <li key={item.id} className={`t-item t-item--${item.kind}${isFresh ? ' is-new' : ''}`}>
                      {(isFresh || calling) && (
                        <span className="t-tags" aria-hidden="true">
                          {calling && <span className="t-tag t-tag--me">Til þín</span>}
                          {isFresh && <span className="t-tag">Nýtt</span>}
                        </span>
                      )}
                      {isFresh && <span className="b-visually-hidden">Nýtt: </span>}
                      {item.kind === 'post' ? (
                        <Print username={item.who} entry={item.entry} places={places} me={me} isOwner={sameUser(me, item.who)}
                          coverPhotoId={null} shownCoverId={null} fresh={item.entry.id === fresh} byline
                          onChange={onChange} onRemove={onRemove} onOpen={onOpen} />
                      ) : (
                        <Notice item={item} room={room} mounted={mounted} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
        {data !== null && shown.length > 0 && <p className="b-note t-board__end">Eldra hangir á veggjum hvers og eins. <Link href="/crew" className="b-link">Veggir hópsins</Link></p>}
      </div>

      {/* Á döfinni: what is asking something of the crew right now, pinned beside the board */}
      <aside className="t-board__side" aria-label="Á döfinni">
        <H className="t-side__title">Á döfinni</H>
        <div className="t-side__night"><NightLine href={room ? '#hopur' : '/kvold#hopur'} /></div>
        <div className="t-side__block">
          <p className="t-side__kicker">Óskast{calls.length > 0 && ` · ${calls.length}`}</p>
          {calls.length === 0 ? <p className="t-side__none">{data ? 'Engar óskir á töflunni.' : '…'}</p> : (
            <ul className="t-side__list">
              {calls.slice(0, 5).map(c => (
                <li key={c.id}>
                  <button type="button" className="t-side__item" onClick={() => show(c.entry.id)}>
                    <PlayerHead name={c.who} size={16} alt="" />
                    <span className="t-side__what">{c.entry.text.split('\n')[0]}</span>
                    <span className="t-side__pay">{c.entry.bounty!.reward}{c.entry.bounty!.takenBy && <> · {c.entry.bounty!.takenBy} er á slóðinni</>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="t-side__block">
          <p className="t-side__kicker">Spurningar{asks.length > 0 && ` · ${asks.length}`}</p>
          {asks.length === 0 ? <p className="t-side__none">{data ? 'Engin spurning opin.' : '…'}</p> : (
            <ul className="t-side__list">
              {asks.slice(0, 5).map(a => {
                const answered = !!me && a.entry.poll!.choices.some(c => c.votes.some(v => sameUser(v, me)));
                return (
                  <li key={a.id}>
                    <button type="button" className="t-side__item" onClick={() => show(a.entry.id)}>
                      <PlayerHead name={a.who} size={16} alt="" />
                      <span className="t-side__what">{a.entry.text.split('\n')[0]}</span>
                      <span className="t-side__pay">{me ? (answered ? 'þú hefur svarað' : 'þú átt eftir að svara') : `${a.entry.poll!.choices.reduce((n, c) => n + c.votes.length, 0)} svör`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {prints.length > 0 && (
        <WallLightbox photos={lightboxPhotos} index={lightbox} origin={origin} onClose={closeLightbox} onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

