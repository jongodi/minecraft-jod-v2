'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import '@/app/wall.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatAge, plural } from '@/lib/format';
import { sinceAt } from '@/components/badlands/night';
import type { CrewSummary } from '@/app/api/crew/route';
import type { FeedEntry } from '@/app/api/crew/feed/route';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import PlayerHead from '@/components/badlands/PlayerHead';
import NightSky from '@/components/badlands/NightSky';
import { Lantern, Seal } from '@/components/badlands/Bits';
import { useServerStatus } from '@/components/badlands/hooks';
import { NightLine } from '@/components/badlands/NightLine';
import { CREW, PAGE_LINKS } from '@/components/badlands/data';
import { toast } from '@/components/badlands/Toast';
import { outlaws, type Outlaw, type StatRow } from '@/components/badlands/outlaws';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';
import { woodClass } from '@/lib/sign-wood';
import { posted, tabOf } from './bounty';
import PosterCharge from './PosterCharge';

/* a member's poster before the list has come: the name, nothing about the wall yet */
const blankPoster = (username: string): CrewSummary => ({ username, bio: '', entryCount: 0, photoCount: 0, lastEntry: null, cover: null, bestDrawMs: null, lastSeen: null });

/* an alias as it is set on a poster wide enough to hold it whole */
const whole = (nick: string) => nick.replace(/\u00AD/g, '');

/* What a member's poster says they are wanted for: the alias of a charge
   they are the outlaw of, in red, or their place on the charge they stand
   highest on; the charge; and their number on it, as the bounty. Read off
   the same numbers as the board in the crew's room (outlaws.ts), in the
   same lines the member's own poster on their wall prints (PosterCharge.tsx).
   Always three lines, held open while the numbers are on their way, so a
   poster never grows under the visitor when they come. */
function Charge({ outlaw, waiting }: { outlaw: Outlaw | undefined; waiting: boolean }) {
  const best = outlaw?.best;
  if (!best) {
    return waiting ? (
      <span className="b-poster__held" aria-hidden="true">
        <span className="b-poster__alias">„ “</span>
        <span className="b-poster__charge">sæki</span>
        <span className="b-poster__bounty"><span className="b-poster__reward">Verðlaun</span></span>
      </span>
    ) : null;
  }
  return <PosterCharge p={posted(best)} />;
}

/** The roll call: one poster per member on one notice board, with the
    newest thing pinned on any wall nailed up beside them (the rest is on
    the board, /taflan). Each poster says what its
    member is wanted for; the outlaw of the most charges hangs first at
    twice the size, *Mest eftirlýst*, and the newest thing pinned on any wall
    is nailed up in the space the board has left. `initialPlayers` is the
    last snapshot of the game's numbers, read on the server (page.tsx), so
    the board is whole at first paint. */
export default function RollCall({ initialPlayers, initialCrew = null }: { initialPlayers: StatRow[] | null; initialCrew?: CrewSummary[] | null }) {
  /* the lines as the page was drawn with them (page.tsx), then the browser's
     own; null while loading, 'error' if the list never came */
  const [crew, setCrew] = useState<CrewSummary[] | null | 'error'>(initialCrew);
  const [feed, setFeed] = useState<FeedEntry[] | null | 'error'>(null);
  const [staleLink, setStaleLink] = useState(false);
  /* a sign-in link opened: the key and the member it is for, until it is pressed or turns out spent */
  const [link, setLink] = useState<{ key: string; name: string } | null>(null);
  const [signing, setSigning] = useState(false);
  /* who is in the game now: the bar asks for the same answer, so this is no second question */
  const server = useServerStatus();
  const isIn = (name: string) => server.online === true && server.list.some(n => n.toLowerCase() === name.toLowerCase());

  /* the press that spends the link's use: signed in, the member goes to their wall; a spent link says so */
  const signIn = async () => {
    if (!link || signing) return;
    setSigning(true);
    try {
      const r = await fetch('/api/crew/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lykill: link.key }), signal: AbortSignal.timeout(15_000) });
      const d = await r.json().catch(() => null) as { next?: string; error?: string } | null;
      if (r.ok && d?.next) { window.location.assign(d.next); return; }
      if (r.status === 410) { setLink(null); setStaleLink(true); window.history.replaceState(null, '', '/crew?lykill=utrunninn'); }
      else toast('Tókst ekki', d?.error ?? 'reyndu aftur eftir smástund');
    } catch { toast('Tókst ekki', 'náði ekki sambandi'); }
    setSigning(false);
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const key = q.get('lykill') ?? '';
    setStaleLink(key === 'utrunninn');
    const name = q.get('felagi') ?? '';
    if (key && key !== 'utrunninn' && CREW.some(n => n === name)) setLink({ key, name });
    /* an error answer is JSON too ({ error }), so only an array is a list */
    const list = <T,>(url: string, set: (v: T[] | 'error') => void) =>
      fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
        .then(r => (r.ok ? r.json() : null))
        .then((rows: unknown) => set(Array.isArray(rows) ? (rows as T[]) : 'error'))
        .catch(() => set('error'));
    /* asked afresh, for a wall pinned on since the page was kept; a lost answer keeps the page's lines */
    list<CrewSummary>('/api/crew', v => setCrew(c => (v === 'error' && c && c !== 'error' ? c : v)));
    list<FeedEntry>('/api/crew/feed?limit=1', setFeed);
  }, []);

  /* the game's numbers: the server's snapshot, or asked for here when the
     page was drawn without one (no store, or it did not answer) */
  const [players, setPlayers] = useState<StatRow[] | null>(initialPlayers);
  useEffect(() => {
    if (initialPlayers) return;
    /* capped, and a lost answer ends the wait: every poster kept its "sæki" for good */
    fetch('/api/stats', { signal: AbortSignal.timeout(25_000) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { players?: StatRow[] } | null) => { setPlayers(d?.players?.length ? d.players : []); })
      .catch(() => setPlayers(p => p ?? []));
  }, [initialPlayers]);
  const { byName, mostWanted } = useMemo(() => outlaws(players ?? []), [players]);
  /* The most wanted hangs large only on a board drawn with the numbers: one
     drawn without them (the store did not answer) fills in each poster's
     charge when they come, but never rearranges itself under the visitor. */
  const most = initialPlayers ? mostWanted?.toLowerCase() ?? null : null;
  const mostRow = most ? (players ?? []).find(p => p.username.toLowerCase() === most) : undefined;

  return (
    <div className="b">
      {/* the walls are the crew's room continued, so its lantern burns here too */}
      <AddressBar links={PAGE_LINKS} activeId="hopur" always />
      <NightSky />
      <main id="efni" className="b-wrap b-page">
        {staleLink && (
          <p className="w-welcome" role="status">Þessi innskráningartengill er útrunninn eða þegar notaður. Fáðu nýjan í pósti undir „Þetta er ég“ á veggnum þínum, eða hjá stjórnandanum.</p>
        )}
        {/* the slip a sign-in link opens: the member's own press spends the use, so a mail scanner's look spends nothing */}
        {link && (
          <p className="w-welcome w-welcome--link" role="status">
            <span>Innskráningartengill fyrir <b>{link.name}</b>. Þetta tæki man eftir þér í eitt ár.</span>
            <button type="button" className="b-btn b-btn--solid b-btn--small w-welcome__go" onClick={signIn} disabled={signing}>{signing ? 'Skrái inn…' : 'Skrá mig inn'}</button>
          </p>
        )}
        <div className="b-page__head">
          <div>
            {/* named as the door that leads here, so the door pressed and the page landed on agree */}
            <h1 className="b-title">Eftirlýst</h1>
            <p className="b-lede">Hópurinn, öll sem hafa aðgang. Hvert og eitt á sinn vegg: kynningu, tölur úr leiknum, miða og myndir.</p>
            {/* the next fire: the room on the home page holds it, one tap away */}
            <div className="b-page__night"><NightLine href="/kvold#hopur" /></div>
          </div>
          {/* everything the crew pinned, with the fires and the map's news, is on the board */}
          <Link href="/taflan" className="b-btn b-btn--small">Taflan: það nýjasta frá hópnum</Link>
        </div>

        {crew === 'error' ? <p className="b-empty" role="alert">Náði ekki í félagalistann. Reyndu aftur eftir smástund.</p> :
          /* the eight are known before the list comes, so their posters stand at
             once and only the lines about each wall fill in */
          <div className="b-rollcall" aria-busy={crew === null}>
            {/* the most wanted first, so they take the board's first two columns on a wide screen and its top on a phone */}
            {[...(crew ?? CREW.map(blankPoster))]
              .sort((a, b) => Number(b.username.toLowerCase() === most) - Number(a.username.toLowerCase() === most))
              .map(m => {
              const outlaw = byName.get(m.username.toLowerCase());
              const isMost = m.username.toLowerCase() === most && !!outlaw;
              return (
              <div key={m.username} className={`b-hang${isIn(m.username) ? ' is-in' : ''}${isMost ? ' b-rollcall__most' : ''}`}>
                {/* someone in the game now: a lit lantern hung over their poster, its light on the paper; said after
                    their name, since a name for the whole link replaced the charge and the bounty it carries */}
                {isIn(m.username) && <span className="b-poster__lamp" aria-hidden="true"><Lantern lit /></span>}
                <Link href={`/crew/${m.username}`} className={`b-paper b-paper--torn b-poster b-poster--crew${isMost ? ' b-poster--most' : ''}${m.cover ? ' has-cover' : ''}`}>
                  {m.cover && (
                    /* the most wanted poster's print is the largest thing on the first screen (its LCP): asked for at once, the rest when scrolled to */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="b-poster__cover" {...photoProps(m.cover, isMost ? PHOTO_SIZES.board : PHOTO_SIZES.strip)} alt="" aria-hidden="true" loading={isMost ? "eager" : "lazy"} fetchPriority={isMost ? "high" : undefined} decoding="async" />
                  )}
                  <span className="b-paper__nail b-paper__nail--l" aria-hidden="true" />
                  <span className="b-paper__nail b-paper__nail--r" aria-hidden="true" />
                  <span className="b-poster__mast" aria-hidden="true">Eftirlýst</span>
                  {isMost && outlaw ? (<>
                    {/* the board's own outlaw: the whole figure, as on their wall, and the aliases their charges earn them */}
                    <span className="b-poster__kicker">Mest eftirlýst á JOÐ</span>
                    <div className="b-poster__img b-poster__img--full"><PlayerHead name={m.username} size={96} full alt="" /></div>
                    <div className="b-poster__name">{m.username}{isIn(m.username) && <span className="b-visually-hidden">, inni í leiknum núna</span>}</div>
                    <span className="b-poster__aliases">{outlaw.led.slice(0, 3).map(id => <span key={id}>„{whole(tabOf(id).nick)}“</span>)}</span>
                    <span className="b-poster__charge">eftirlýst fyrir {outlaw.led.length} {plural(outlaw.led.length, 'sök', 'sakir')}</span>
                    {/* the rewards, set as a printed poster sets them: each charge, a run of dots, the bounty in red */}
                    <ul className="b-poster__ledger" aria-label="Verðlaun">
                      {outlaw.led.slice(0, 5).map(id => {
                        const t = tabOf(id);
                        return <li key={id}><span className="b-poster__ledgerwhat">{t.label}</span><span className="b-poster__val">{t.unit(mostRow?.[id] ?? 0)}</span></li>;
                      })}
                      {outlaw.led.length > 5 && <li className="b-poster__ledgermore">og {outlaw.led.length - 5} í viðbót á veggnum</li>}
                    </ul>
                  </>) : (<>
                    <div className="b-poster__img"><PlayerHead name={m.username} size={128} alt="" /></div>
                    <div className="b-poster__name">{m.username}{isIn(m.username) && <span className="b-visually-hidden">, inni í leiknum núna</span>}</div>
                    <Charge outlaw={outlaw} waiting={players === null} />
                  </>)}
                  {crew === null ? (<>
                    <div className="b-poster__note">sæki vegginn…</div>
                    {/* held open at the height its line will take, so nothing moves when it comes */}
                    <div className="b-poster__meta" aria-hidden="true" style={{ visibility: 'hidden' }}><span className="b-nowrap">0 færslur</span> · <span className="b-nowrap">0 myndir</span></div>
                  </>) : (<>
                    {/* someone with a charge against them has a poster already; "nothing heard yet" is for one with neither */}
                    {(m.bio || m.lastEntry || (!outlaw?.best && players !== null)) && <div className="b-poster__note">{m.bio || (m.lastEntry ? `festi eitthvað upp ${formatAge(m.lastEntry)}` : 'ekkert heyrst enn')}</div>}
                    {/* when they were last in the game, under the charges, for one who is not in now: the lantern says the rest */}
                    {m.lastSeen && !isIn(m.username) && <div className="b-poster__seen">síðast inni {sinceAt(m.lastSeen)}</div>}
                    {/* a bare wall says so once, in the line above; its two zeros keep their height so the board's rows stay level */}
                    <div className="b-poster__meta" aria-hidden={m.entryCount + m.photoCount === 0 || undefined} style={m.entryCount + m.photoCount === 0 ? { visibility: 'hidden' } : undefined}><span className="b-nowrap">{m.entryCount} {plural(m.entryCount, 'færsla', 'færslur')}</span> · <span className="b-nowrap">{m.photoCount} {plural(m.photoCount, 'mynd', 'myndir')}</span></div>
                  </>)}
                  {isMost && <Seal className="b-poster__seal" />}
                </Link>
              </div>
              );
            })}
            {/* The newest thing pinned on any wall, nailed up in the space the
                board has left beside the posters: a press from the board itself. */}
            {Array.isArray(feed) && feed[0] && (
              <div className="b-rollcall__news">
                <Link href={`/crew/${feed[0].username}#${feed[0].id}`} className={`w-sign${woodClass(feed[0].wood)} w-note-card`}>
                  {feed[0].photos[0] && (
                    <span className="w-note-card__pic">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img {...photoProps(feed[0].photos[0].filename, PHOTO_SIZES.board)} alt={feed[0].photos[0].caption || ''} loading="lazy" decoding="async" />
                    </span>
                  )}
                  {(feed[0].text || feed[0].photos[0]?.caption) && <span className="w-note-card__text">{feed[0].text || feed[0].photos[0]?.caption}</span>}
                  <span className="w-note-card__who"><PlayerHead name={feed[0].username} size={16} alt="" /><b>{feed[0].username}</b><span>{formatAge(feed[0].createdAt)}</span></span>
                </Link>
                <Link href="/taflan" className="b-btn b-btn--small b-rollcall__more">Öll taflan</Link>
              </div>
            )}
          </div>}
      </main>
      <Footer />
    </div>
  );
}
