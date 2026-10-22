'use client';

// What the town itself posts on the board: a fire lit, a night decided or
// held, a member's advancements, and the map's news. Printed slips nailed
// to the planks, a line or two each, beside the crew's hand-lettered signs.
// Each leads to where it happened.
import Link from 'next/link';
import { ADV_SHOWN, type BoardItem } from '@/lib/board-types';
import type { Painted } from '@/lib/map-news';
import { plural } from '@/lib/format';
import { Campfire, CalendarIcon, FoldedMapIcon, PictureIcon } from '@/components/badlands/Bits';
import PlayerHead from '@/components/badlands/PlayerHead';
import { WhenAt, sinceAt } from '@/components/badlands/night';
import { photoProps } from '@/components/badlands/photo';

type Notice = Exclude<BoardItem, { kind: 'post' }>;

const PAINTED: Record<Painted, string> = { land: 'landslagið', zones: 'svæðin', lines: 'leiðirnar' };
const listed = (words: string[]) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} og ${words[words.length - 1]}`);
const THUMB = '96px';

/* A map pin and a block of the world, drawn on the art's grid like the other glyphs (Bits.tsx). */
function PinIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M5 1h6v2h2v5h-2v2h-2v2H9v3H7v-3H6v-2H5V8H3V3h2zm2 3v3h2V4z" /></svg>;
}
function BlockIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M7 1h2v1h2v1h2v1h1v8h-1v1h-2v1H9v1H7v-1H5v-1H3v-1H2V4h1V3h2V2h2zm1 2v1H6v1H4v1h2v1h2v1h2V7h2V6h-2V5H8zM3 7v5h1v1h3V9H5V8H3zm10 0h-2v1H9v4h3v-1h1z" /></svg>;
}
/* an advancement's frame: square for a task, rounded for a goal, spiked for a challenge, as the game draws them */
function FrameIcon({ frame }: { frame: 'task' | 'goal' | 'challenge' }) {
  const d = frame === 'challenge' ? 'M2 2h3v1h6V2h3v3h-1v6h1v3h-3v-1H5v1H2v-3h1V5H2zm3 3v6h6V5z'
    : frame === 'goal' ? 'M4 1h8v1h1v1h1v1h1v8h-1v1h-1v1h-1v1H4v-1H3v-1H2v-1H1V4h1V3h1V2h1zm1 4v6h6V5z'
    : 'M1 1h14v14H1zm4 4v6h6V5z';
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d={d} /></svg>;
}

/* A room's hash (#hopur) is a plain link, so the home page's own door handler
   swaps the room; the router would only push it and no room would know. */
function Go({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith('#') ? <a href={href} className={className}>{children}</a> : <Link href={href} className={className}>{children}</Link>;
}

function Head({ name }: { name: string }) {
  return <Link href={`/crew/${name}`} className="t-notice__who"><PlayerHead name={name} size={16} alt="" />{name}</Link>;
}

/** One slip. `room`: the board is open over the world, where a fire's room is a hash away. */
export default function Notice({ item, room, mounted }: { item: Notice; room: boolean; mounted: boolean }) {
  /* when, as the browser's clock tells it; the plain day until it has one */
  const when = mounted ? sinceAt(item.at) : item.at.slice(0, 10);
  const fire = (id: string) => (room ? '#hopur' : `/kvold/${id}#hopur`);
  let icon: React.ReactNode;
  let body: React.ReactNode;
  let href: string;
  let pic: string | null = null;

  switch (item.kind) {
    case 'fire':
      icon = <Campfire />;
      href = fire(item.nightId);
      body = <>
        <span className="t-notice__line"><Head name={item.who} /> kveikti bál{item.note && <>: <q>{item.note}</q></>}</span>
        <span className="t-notice__sub" suppressHydrationWarning>{item.chosen ? WhenAt(item.chosen) : `${item.times.length} ${plural(item.times.length, 'tími', 'tímar')} í boði: ${item.times.map(t => WhenAt(t)).join(' · ')}`}</span>
      </>;
      break;
    case 'decided':
      icon = <CalendarIcon />;
      href = fire(item.nightId);
      body = <>
        <span className="t-notice__line">Kvöldið er ákveðið{item.note && <>: <q>{item.note}</q></>}</span>
        <span className="t-notice__sub" suppressHydrationWarning>{WhenAt(item.time)} · {item.who ? <><Head name={item.who} /> festi tímann</> : 'flest komast þá'}</span>
      </>;
      break;
    case 'held':
      icon = <Campfire embers />;
      href = `/kvold/${item.nightId}#hopur`;
      body = <>
        <span className="t-notice__line">Spilakvöld að baki{item.note && <>: <q>{item.note}</q></>}</span>
        <span className="t-notice__sub">
          {item.came.length ? <>{item.came.length} {plural(item.came.length, 'mætti', 'mættu')} <span className="t-notice__heads">{item.came.map(n => <PlayerHead key={n} name={n} size={16} alt={n} />)}</span></> : 'enginn sást'}
          {item.noShows.length > 0 && <> · <span className="t-notice__red">sögðust mæta en komu ekki: {listed(item.noShows)}</span></>}
        </span>
      </>;
      break;
    case 'advancement': {
      const top = item.list[0]?.frame ?? 'task';
      icon = <FrameIcon frame={top} />;
      href = `/crew/${item.who}#afrek`;
      const shown = item.list.slice(0, ADV_SHOWN);
      body = <>
        <span className="t-notice__line"><Head name={item.who} /> vann {item.list.length === 1 ? 'afrek' : `${item.list.length} afrek`}</span>
        <span className="t-notice__sub t-notice__advs">
          {shown.map(a => <span key={a.title} className={`b-chat__adv b-chat__adv--${a.frame}`}>[{a.title}]</span>)}
          {item.list.length > shown.length && <span>og {item.list.length - shown.length} í viðbót</span>}
        </span>
      </>;
      break;
    }
    case 'place':
      icon = <PinIcon />;
      href = `/stadur/${item.placeId}#heimur`;
      pic = item.photo;
      body = <>
        <span className="t-notice__line">Nýr staður á kortinu: <b>{item.label}</b></span>
        {item.sublabel && <span className="t-notice__sub">{item.sublabel}</span>}
      </>;
      break;
    case 'photo':
      icon = <PictureIcon />;
      href = item.placeId !== null ? `/stadur/${item.placeId}#heimur` : '/#heimur';
      pic = item.photo;
      body = <>
        <span className="t-notice__line">{item.label ? <>Ný mynd af <b>{item.label}</b></> : <>Ný mynd á myndaveggnum: <b>{item.title}</b></>}</span>
        {item.label && item.title && item.title !== item.label && <span className="t-notice__sub">{item.title}</span>}
      </>;
      break;
    case 'painted':
      icon = <FoldedMapIcon />;
      href = '/#heimur';
      body = <>
        <span className="t-notice__line">Teiknaða kortið var málað upp á nýtt</span>
        {item.what.length > 0 && <span className="t-notice__sub">{listed(item.what.map(w => PAINTED[w]))}</span>}
      </>;
      break;
    case 'synced':
      icon = <BlockIcon />;
      href = '/#heimur';
      body = <>
        <span className="t-notice__line">Nýtt afrit af þrívíddarkortinu</span>
        <span className="t-notice__sub">heimurinn eins og hann er núna, frá þjóninum</span>
      </>;
      break;
  }

  return (
    <article className={`t-notice t-notice--${item.kind}`}>
      <span className="b-paper__nail t-notice__nail" aria-hidden="true" />
      <span className="t-notice__icon">{icon}</span>
      <div className="t-notice__body">
        {body}
        <span className="t-notice__meta">
          <time dateTime={item.at} suppressHydrationWarning>{when}</time>
          <Go href={href} className="t-notice__go">{item.kind === 'place' || item.kind === 'photo' ? 'sjá á kortinu' : item.kind === 'advancement' ? 'á veggnum' : item.kind === 'painted' || item.kind === 'synced' ? 'í heiminn' : 'sjá kvöldið'}</Go>
        </span>
      </div>
      {pic && (
        <Link href={href} className="t-notice__pic" tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...photoProps(pic, THUMB)} alt="" loading="lazy" decoding="async" />
        </Link>
      )}
    </article>
  );
}
