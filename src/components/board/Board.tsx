'use client';

import '@/app/board.css';
import '@/app/wall.css';
import '@/app/taflan.css';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CrewEntry } from '@/lib/crew-types';
import { bountyState, mentionsIn, sameUser } from '@/lib/crew-types';
import { FILTERS, FIRST_LOOK_WORDS, byDay, dayLabel, inFilter, isFilter, isNew, newReplies, newestAt, replay, stampOf, stampsOf, type BoardEdit as Edit, type BoardFilter, type BoardItem, type BoardResponse } from '@/lib/board-types';
import { formatDate, plural } from '@/lib/format';
import { useCrewSession, useMounted, useRestored, type CrewSessionSeed } from '@/components/badlands/hooks';
import { NightLine } from '@/components/badlands/NightLine';
import PlayerHead from '@/components/badlands/PlayerHead';
import { CREW } from '@/components/badlands/data';
import Composer, { type Ask } from '@/components/wall/Composer';
import Print from '@/components/wall/Print';
import Notice from './Notice';
import PrintWall, { framesOf } from './PrintWall';
import { markSeen, takeStamps, useBoardNews } from './news';

/* The lightbox and the motion library it throws with come when the board is idle, as on a wall. */
const WallLightbox = dynamic(() => import('@/components/wall/WallLightbox'), { ssr: false });

type Post = Extract<BoardItem, { kind: 'post' }>;
type Shown = BoardFilter | 'mer';

/* a board left open is asked again when it is opened after this long */
const STALE_MS = 60_000;
/* how long the board is looked at before what it shows counts as seen */
const SEEN_AFTER_MS = 1500;
/* How much of the board is drawn at first, and how much more each time the
   foot of it comes near: every sign is a live thing with its lantern,
   replies and answers, and drawing ninety of them at once held a phone's
   hand for two seconds. */
const STEP = 20;

/** New replies under something older, counted as Icelandic counts: 21 takes the singular. */
const newRepliesWords = (n: number) => (n === 1 ? 'Nýtt svar' : `${n} ${plural(n, 'nýtt svar', 'ný svör')}`);

/** Whether a post calls the one looking by name: in its words, unless they
    wrote it, or in a reply someone else left under it, their own post included. */
const callsMe = (item: BoardItem, me: string | null | undefined) =>
  !!me && item.kind === 'post' &&
  ((!sameUser(item.who, me) && mentionsIn(item.entry.text).some(n => sameUser(n, me))) ||
   item.entry.replies.some(r => !sameUser(r.username, me) && mentionsIn(r.text).some(n => sameUser(n, me))));



interface Props {
  /** open over the world on the home page, rather than its own page */
  room?: boolean;
  /** being looked at: the room is open, or the page is the board's own */
  open?: boolean;
  /** the board as the server drew its own page with it */
  initial?: BoardResponse | null;
  /** the filter the page's address asked for */
  initialFilter?: BoardFilter;
  /** who the server found looking when it drew the board's page, so a member's slot is in its markup */
  session?: CrewSessionSeed;
  /** which drawing of the board's page this is (useRestored) */
  drawn?: string;
}

/** Taflan: everything that happens on JOÐ, newest first, on one notice
    board. What the crew pinned hangs as their signs, each on its place's
    wood, with lanterns, replies, calls taken on and questions answered right
    here; what the server and the map did is printed on slips beside them.
    What came since the one looking last looked is tagged Nýtt (a reply under
    something older, Nýtt svar), a red string is pinned across the board
    where they left off, and what calls them by name says Til þín. Under
    Myndir the pictures hang in item frames, a wall of them. Members put
    things up from the slot at the top; everyone can read it. */
function Board({ room = false, open = true, initial = null, initialFilter = 'allt', session, drawn }: Props) {
  const { me } = useCrewSession(session);
  const mounted = useMounted();
  /* Back to the board's page brings the board as it was first drawn: asked
     for again at once, and the filter read from the address as it stands */
  const restored = useRestored(drawn);
  const [data, setData] = useState<BoardResponse | null>(initial);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Shown>(() => {
    const syna = restored && !room ? new URLSearchParams(window.location.search).get('syna') : null;
    return restored && !room ? (isFilter(syna) ? syna : 'allt') : initialFilter;
  });
  const [reveal, setReveal] = useState(STEP);
  /* the sign just put up from here, which swings in on its chains */
  const [fresh, setFresh] = useState<string | null>(null);
  /* a call or a question asked for from Á döfinni: the slot turns to it */
  const [ask, setAsk] = useState<Ask | null>(null);
  /* a board drawn on the server is fresh: it is not asked for again the moment it arrives */
  const loadedAt = useRef(initial && !restored ? Date.now() : 0);
  /* the last "Reyna aftur" answered, so a retry asks at once and the next opening still waits its minute */
  const asked = useRef(0);
  /* while a fetch is out, what is done on the board is kept to be done again on its answer, which was read before it */
  const edits = useRef<Edit[] | null>(null);
  const { seen } = useBoardNews();
  useEffect(() => { if (initial) takeStamps(stampsOf(initial.items)); }, [initial]);

  /* asked when the board is first looked at, and again when it is opened after standing a while */
  useEffect(() => {
    if (!open) return;
    const retry = attempt !== asked.current;
    asked.current = attempt;
    if (!retry && loadedAt.current && Date.now() - loadedAt.current < STALE_MS) return;
    let live = true;
    setFailed(false);
    edits.current = [];
    fetch('/api/board', { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: BoardResponse) => {
        if (!live || !Array.isArray(d.items)) return;
        loadedAt.current = Date.now();
        const items = replay(d.items, edits.current ?? []);
        setData({ ...d, items });
        takeStamps(stampsOf(items));
      })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) edits.current = null; });
    return () => { live = false; };
  }, [open, attempt]);

  /* The filter is in the page's address (?syna=myndir), so a refresh, a
     shared link and Back keep it; over the world it is the room's own. A
     new filter starts drawn from its top again. */
  const choose = useCallback((f: Shown) => {
    /* the slot already in hand keeps what is drawn, and a reply half typed far down the board with it */
    if (f === filter) return;
    setFilter(f);
    setReveal(STEP);
    if (room) return;
    const url = new URL(window.location.href);
    if (f === 'allt' || f === 'mer') url.searchParams.delete('syna'); else url.searchParams.set('syna', f);
    history.replaceState(history.state, '', url);
  }, [room, filter]);

  /* What was seen as this look began, for the tags and the string; the mark
     itself moves up a moment after the board is looked at, so the door's
     count goes out. A board closed and opened again starts a new look. */
  const [since, setSince] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!open) { setSince(undefined); return; }
    if (since === undefined && seen !== undefined && data) setSince(seen);
  }, [open, seen, data, since]);
  /* Only under Allt, which shows everything, and only while the tab is in
     front: under Myndir the mark went past every note it hid, and a board
     opened in a background tab was marked read without being looked at. */
  useEffect(() => {
    if (!open || !data || since === undefined || me === undefined || filter !== 'allt') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(t);
      if (document.visibilityState === 'visible') t = setTimeout(() => markSeen(newestAt(stampsOf(data.items)), me), SEEN_AFTER_MS);
    };
    arm();
    document.addEventListener('visibilitychange', arm);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', arm); };
  }, [open, data, since, me, filter]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const places = useMemo(() => data?.places ?? [], [data]);
  /* who calls the one looking by name, worked out once a board rather than on every draw */
  const toMe = useMemo(() => items.filter(i => callsMe(i, me)), [items, me]);
  const callingMe = useMemo(() => new Set(toMe.map(i => i.id)), [toMe]);
  const shown = useMemo(() => (filter === 'mer' ? toMe : items.filter(i => inFilter(i, filter))), [items, filter, toMe]);
  /* how many under each filter; under Myndir, how many pictures, which is what it shows */
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, f.id === 'myndir' ? framesOf(items.filter(i => inFilter(i, 'myndir'))).length : items.filter(i => inFilter(i, f.id)).length])) as Record<BoardFilter, number>, [items]);
  /* what is new to this look: items (by when they reached the board), and replies under the posts that are not */
  const looked = since !== undefined;
  const fresher = useCallback((item: BoardItem) => looked && isNew(stampOf(item), since ?? null, me), [looked, since, me]);
  const answered = useCallback((item: BoardItem) => (looked && !fresher(item) ? newReplies(item, since ?? null, me) : 0), [looked, fresher, since, me]);
  const newCount = useMemo(() => (looked ? items.reduce((n, i) => n + (fresher(i) ? 1 : 0) + answered(i), 0) : 0), [items, looked, fresher, answered]);

  /* still asking something of the crew: calls not yet done, questions not yet closed */
  const calls = useMemo(() => items.filter((i): i is Post => i.kind === 'post' && !!i.entry.bounty && bountyState(i.entry.bounty) !== 'done'), [items]);
  const asks = useMemo(() => items.filter((i): i is Post => i.kind === 'post' && !!i.entry.poll && !i.entry.poll.closed), [items]);

  /* every change is drawn at once, and kept to be made again on a fetch still out */
  const edit = useCallback((e: Edit) => {
    edits.current?.push(e);
    setData(d => d && ({ ...d, items: replay(d.items, [e]) }));
  }, []);
  const onChange = useCallback((id: string, update: (e: CrewEntry) => CrewEntry) => edit({ id, update }), [edit]);
  const onRemove = useCallback((id: string) => edit({ id, remove: true }), [edit]);
  const onPinned = useCallback((entry: CrewEntry) => {
    if (!me) return;
    setFresh(entry.id);
    setAsk(null);
    const wood = places.find(p => p.id === entry.placeId)?.wood ?? 'oak';
    const pin: Post = { kind: 'post', id: `p-${entry.id}`, at: entry.createdAt, who: me, wood, entry };
    edit({ pin });
    /* what was just put up shows under the filter it was put up from, or the
       whole board if it does not belong there (a picture alone is no note) */
    if (filter === 'mer' || !inFilter(pin, filter)) choose('allt');
  }, [me, places, edit, filter, choose]);

  /* every picture the board as it is filtered shows, in its order, for the lightbox: the crew's prints and the map's */
  const frames = useMemo(() => framesOf(shown), [shown]);
  const framesNow = useRef(frames);
  framesNow.current = frames;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const onOpen = useCallback((photoId: string, rect: DOMRect) => { const i = framesNow.current.findIndex(p => p.id === photoId); if (i >= 0) { setOrigin(rect); setLightbox(i); } }, []);
  const lightboxPhotos = useMemo(() => frames.map(p => ({ src: p.src, title: p.caption || undefined, sub: [p.who ?? 'á kortinu', p.takenAt ? `tekin ${formatDate(p.takenAt)}` : formatDate(p.at)].join(' · ') })), [frames]);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevPhoto = useCallback(() => setLightbox(i => (i !== null && frames.length ? (i - 1 + frames.length) % frames.length : null)), [frames.length]);
  const nextPhoto = useCallback(() => setLightbox(i => (i !== null && frames.length ? (i + 1) % frames.length : null)), [frames.length]);

  /* A pinned call or question is a press away: its sign is drawn if it is
     further down than the board has drawn yet, and brought into view where
     it hangs. A plain #link would change the address, and over the world the
     address is which room is open. */
  const show = useCallback((entryId: string) => {
    choose('allt');
    const at = items.findIndex(i => i.kind === 'post' && i.entry.id === entryId);
    if (at >= STEP) setReveal(r => Math.max(r, at + STEP));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.getElementById(entryId);
      if (!el) return;
      el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      /* the keyboard follows the eye to the sign */
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }));
  }, [choose, items]);

  /* the foot of what is drawn: when it comes within a screen or so, the next stretch is drawn */
  const foot = useRef<HTMLDivElement>(null);
  const pictures = filter === 'myndir';
  const total = pictures ? frames.length : shown.length;
  useEffect(() => {
    const el = foot.current;
    if (!el || !open || reveal >= total || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setReveal(r => r + STEP); }, { rootMargin: '0px 0px 1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [reveal, total, open]);

  /* The red string: pinned across the board under the last thing tagged Nýtt,
     so all that came since the visitor last looked hangs above it. Placed by
     when things happened, it could hang over an advancement that reached the
     site with the next morning's copy, tagged new below it. A first look has
     no last time, so no string. */
  const visible = shown.slice(0, reveal);
  const stringAt = useMemo(() => {
    if (!since || pictures) return null;
    let last = -1;
    shown.forEach((i, n) => { if (fresher(i)) last = n; });
    return last >= 0 && last + 1 < shown.length ? shown[last + 1].id : null;
  }, [since, shown, pictures, fresher]);

  const H = room ? 'h3' : 'h2';
  const now = mounted ? Date.now() : undefined;

  return (
    <div className={`t-board${room ? ' t-board--room' : ''}`}>
      <div className="t-board__main">
        <div className="t-board__head">
          <p className="t-board__news" aria-live="polite">
            {/* a first look has no last time: what is new then is what came in the last few days (FIRST_LOOK_MS) */}
            {data === null ? (failed ? '' : 'sæki töfluna…') :
             newCount > 0 ? <><b>{newCount} {plural(newCount, 'nýtt', 'ný')}</b> {since ? 'síðan þú leist síðast við' : FIRST_LOOK_WORDS}</> :
             looked ? `Ekkert nýtt ${since ? 'síðan þú leist síðast við' : FIRST_LOOK_WORDS}` : ''}
          </p>
          <div className="t-filters" role="group" aria-label="Sýna">
            {FILTERS.map(f => (
              <button key={f.id} type="button" className={`t-filter${filter === f.id ? ' is-on' : ''}`} aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
                {f.label}{data && f.id !== 'allt' && <span className="t-filter__n">{counts[f.id]}</span>}
              </button>
            ))}
            {/* kept while it is the filter in hand, so a board that stops calling you never leaves it stranded */}
            {(toMe.length > 0 || filter === 'mer') && (
              <button type="button" className={`t-filter t-filter--me${filter === 'mer' ? ' is-on' : ''}`} aria-pressed={filter === 'mer'} onClick={() => choose('mer')}>
                Til þín<span className="t-filter__n">{toMe.length}</span>
              </button>
            )}
          </div>
        </div>

        {me ? (
          <Composer username={me} places={places} onPinned={onPinned} active={open} compact ask={ask} />
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
        ) : total === 0 ? (
          <p className="b-empty t-board__empty">
            {filter === 'allt' ? (me ? 'Taflan er auð enn. Festu upp fyrsta miðann hér fyrir ofan.' : 'Taflan er auð enn.') :
             filter === 'myndir' ? 'Engar myndir á töflunni enn.' :
             filter === 'midar' ? 'Engir miðar á töflunni enn.' :
             filter === 'vidburdir' ? 'Engin bál, kvöld eða afrek síðustu vikurnar.' :
             filter === 'kortid' ? 'Ekkert nýtt á kortinu síðustu vikurnar.' : 'Enginn hefur nefnt þig enn.'}
          </p>
        ) : pictures ? (
          <PrintWall frames={frames.slice(0, reveal)} isFresh={f => looked && isNew({ at: f.at, who: f.who }, since ?? null, me)} H={H} now={now} onOpen={onOpen} />
        ) : (
          byDay(visible).map(({ day, items: dayItems }) => (
            <section key={day} className="t-day">
              <H className="t-day__head" suppressHydrationWarning>{dayLabel(day, now)}</H>
              <ul className="t-list">
                {dayItems.map(item => {
                  const isFresh = fresher(item);
                  const replies = answered(item);
                  const calling = callingMe.has(item.id);
                  return (
                    <Fragment key={item.id}>
                      {item.id === stringAt && (
                        <li className="t-string" role="separator" aria-label="Það sem var komið síðast þegar þú leist við">
                          <span className="t-string__tag" aria-hidden="true">Síðast þegar þú leist við</span>
                        </li>
                      )}
                      <li className={`t-item t-item--${item.kind}${isFresh ? ' is-new' : ''}`}>
                        {(isFresh || calling || replies > 0) && (
                          <span className="t-tags" aria-hidden="true">
                            {calling && <span className="t-tag t-tag--me">Til þín</span>}
                            {isFresh && <span className="t-tag">Nýtt</span>}
                            {!isFresh && replies > 0 && <span className="t-tag">{newRepliesWords(replies)}</span>}
                          </span>
                        )}
                        {(isFresh || replies > 0 || calling) && <span className="b-visually-hidden">{[calling && 'Til þín', isFresh ? 'Nýtt' : replies > 0 && newRepliesWords(replies)].filter(Boolean).join(', ')}: </span>}
                        {item.kind === 'post' ? (
                          <Print username={item.who} entry={item.entry} places={places} me={me} isOwner={sameUser(me, item.who)}
                            coverPhotoId={null} shownCoverId={null} fresh={item.entry.id === fresh} byline
                            onChange={onChange} onRemove={onRemove} onOpen={onOpen} />
                        ) : (
                          <Notice item={item} room={room} mounted={mounted} onOpen={onOpen} />
                        )}
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
            </section>
          ))
        )}
        {data !== null && reveal < total && (
          <div ref={foot} className="t-board__more">
            <button type="button" className="b-btn b-btn--small" onClick={() => setReveal(r => r + STEP)}>Sýna eldra · {total - reveal} í viðbót</button>
          </div>
        )}
        {data !== null && total > 0 && reveal >= total && <p className="b-note t-board__end">Eldra hangir á veggjum hvers og eins. <Link href="/crew" className="b-link">Veggir hópsins</Link></p>}
      </div>

      {/* Á döfinni: what is asking something of the crew right now, pinned beside the board */}
      <aside className="t-board__side" aria-label="Á döfinni">
        <H className="t-side__title">Á döfinni</H>
        <div className="t-side__night"><NightLine href={room ? '#hopur' : '/kvold#hopur'} /></div>
        <div className={`t-side__block${calls.length === 0 ? ' is-empty' : ''}`}>
          <p className="t-side__kicker">Óskast{calls.length > 0 && ` · ${calls.length}`}</p>
          {calls.length === 0 ? (
            <p className="t-side__none">
              {data ? 'Engar óskir á töflunni.' : '…'}
              {data && me && <> <button type="button" className="t-side__start" onClick={() => setAsk(a => ({ kind: 'call', n: (a?.n ?? 0) + 1 }))}>Settu upp ósk</button></>}
            </p>
          ) : (
            <ul className="t-side__list">
              {calls.slice(0, 5).map(c => (
                <li key={c.id}>
                  <button type="button" className="t-side__item" onClick={() => show(c.entry.id)}>
                    <PlayerHead name={c.who} size={16} alt="" />
                    <span className="t-side__what">{c.entry.text.split('\n')[0]}</span>
                    <span className="t-side__pay">{c.entry.bounty!.reward}{c.entry.bounty!.takenBy && <> · {me && sameUser(c.entry.bounty!.takenBy, me) ? 'þú ert' : `${c.entry.bounty!.takenBy} er`} á slóðinni</>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`t-side__block${asks.length === 0 ? ' is-empty' : ''}`}>
          <p className="t-side__kicker">Spurningar{asks.length > 0 && ` · ${asks.length}`}</p>
          {asks.length === 0 ? (
            <p className="t-side__none">
              {data ? 'Engin spurning opin.' : '…'}
              {data && me && <> <button type="button" className="t-side__start" onClick={() => setAsk(a => ({ kind: 'ask', n: (a?.n ?? 0) + 1 }))}>Spyrðu hópinn</button></>}
            </p>
          ) : (
            <ul className="t-side__list">
              {asks.slice(0, 5).map(a => {
                const voted = !!me && a.entry.poll!.choices.some(c => c.votes.some(v => sameUser(v, me)));
                return (
                  <li key={a.id}>
                    <button type="button" className="t-side__item" onClick={() => show(a.entry.id)}>
                      <PlayerHead name={a.who} size={16} alt="" />
                      <span className="t-side__what">{a.entry.text.split('\n')[0]}</span>
                      <span className="t-side__pay">{me ? (voted ? 'þú hefur svarað' : 'þú átt eftir að svara') : (n => `${n} ${plural(n, 'svar', 'svör')}`)(a.entry.poll!.choices.reduce((n, c) => n + c.votes.length, 0))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {frames.length > 0 && (
        <WallLightbox photos={lightboxPhotos} index={lightbox} origin={origin} onClose={closeLightbox} onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

/* Memoised: over the world it stays mounted under a closed room, and the
   world draws again for a hover on the rail or a word from the live map. */
export default memo(Board);
