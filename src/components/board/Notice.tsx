'use client';

// What the town itself posts on the board: a fire lit, a night decided or
// held, a member's advancements, the map's news, and the server's own: the
// game moved to a new version, packs put on the shelf or updated there.
// Printed slips nailed to the planks, a line or two each, beside the crew's
// hand-lettered signs. Each leads to where it happened.
import Link from 'next/link';
import { ADV_SHOWN, type BoardItem, type ShelfPack } from '@/lib/board-types';
import type { Painted } from '@/lib/map-news';
import { andList, plural } from '@/lib/format';
import { Campfire, CalendarIcon, FoldedMapIcon, PictureIcon } from '@/components/badlands/Bits';
import PlayerHead from '@/components/badlands/PlayerHead';
import PixelGlyph from '@/components/badlands/PixelGlyph';
import { WhenAt, sinceAt } from '@/components/badlands/night';
import { photoProps } from '@/components/badlands/photo';

type Notice = Exclude<BoardItem, { kind: 'post' }>;

const PAINTED: Record<Painted, string> = { land: 'landslagið', zones: 'svæðin', lines: 'leiðirnar' };
/* the map's picture on its slip, held up like a postcard: 12rem beside the words, the slip's width under them on a phone */
const POSTCARD = '(min-width: 480px) 192px, calc(100vw - 6rem)';

/* A map pin and a block of the world, drawn on the art's grid like the other glyphs (Bits.tsx). */
function PinIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M5 1h6v2h2v5h-2v2h-2v2H9v3H7v-3H6v-2H5V8H3V3h2zm2 3v3h2V4z" /></svg>;
}
function BlockIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M7 1h2v1h2v1h2v1h1v8h-1v1h-2v1H9v1H7v-1H5v-1H3v-1H2V4h1V3h2V2h2zm1 2v1H6v1H4v1h2v1h2v1h2V7h2V6h-2V5H8zM3 7v5h1v1h3V9H5V8H3zm10 0h-2v1H9v4h3v-1h1z" /></svg>;
}
/* a crate from the shelf, framed and braced across, for a slip that names several packs */
function CrateIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M1 1h14v14H1zM3 3h10v10H3zM11 3h2v1H11zM10 4h2v1H10zM9 5h2v1H9zM8 6h2v1H8zM7 7h2v1H7zM6 8h2v1H6zM5 9h2v1H5zM4 10h2v1H4zM3 11h2v1H3zM3 12h1v1H3z" /></svg>;
}

/* where a pack on a slip stands: new, or from one version to the next */
const moved = (p: ShelfPack) => (p.added ? (p.version ? `útgáfa ${p.version}` : 'nýr') : p.was ? `${p.was} → ${p.version}` : `nú ${p.version}`);

/* the shelf's slip says how many came and how many moved, in the words' own numbers */
function shelfLine(packs: ShelfPack[]): React.ReactNode {
  const added = packs.filter(p => p.added).length;
  const updated = packs.length - added;
  if (packs.length === 1) return added ? <>Nýr pakki á hillunni: <b>{packs[0].name}</b></> : <><b>{packs[0].name}</b> uppfærður á hillunni</>;
  if (!updated) return `${added} ${plural(added, 'nýr pakki', 'nýir pakkar')} á hillunni`;
  if (!added) return `${updated} ${plural(updated, 'pakki uppfærður', 'pakkar uppfærðir')} á hillunni`;
  return `Á hillunni: ${added} ${plural(added, 'nýr pakki', 'nýir pakkar')} og ${updated} ${plural(updated, 'uppfærður', 'uppfærðir')}`;
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

/** One slip. `room`: the board is open over the world, where a fire's room
    is a hash away. `onOpen` holds the map's picture up in the lightbox. */
export default function Notice({ item, room, mounted, onOpen }: { item: Notice; room: boolean; mounted: boolean; onOpen?: (id: string, origin: DOMRect) => void }) {
  /* when, as the browser's clock tells it; the plain day until it has one */
  const when = mounted ? sinceAt(item.at) : item.at.slice(0, 10);
  const fire = (id: string) => (room ? '#hopur' : `/kvold/${id}#hopur`);
  const shelf = room ? '#hillan' : '/#hillan';
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
          {item.noShows.length > 0 && <> · <span className="t-notice__red">sögðust mæta en komu ekki: {andList(item.noShows)}</span></>}
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
        {item.what.length > 0 && <span className="t-notice__sub">{andList(item.what.map(w => PAINTED[w]))}</span>}
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
    case 'version':
      icon = <BlockIcon />;
      href = shelf;
      body = <>
        <span className="t-notice__line">Þjónninn er kominn í <b>{item.to}</b></span>
        <span className="t-notice__sub">Var {item.from}. Opnaðu leikinn í {item.to} til að tengjast.</span>
      </>;
      break;
    case 'shelf': {
      const one = item.packs.length === 1 ? item.packs[0] : null;
      icon = one ? <PixelGlyph rows={one.glyph} className="t-notice__glyph" /> : <CrateIcon />;
      href = shelf;
      body = <>
        <span className="t-notice__line">{shelfLine(item.packs)}</span>
        {one ? (
          <span className="t-notice__sub">{moved(one)}</span>
        ) : (
          <ul className="t-notice__sub t-notice__packs">
            {item.packs.map(p => (
              <li key={p.id}><PixelGlyph rows={p.glyph} className="t-notice__glyph" /><b>{p.name}</b> <span>{moved(p)}</span></li>
            ))}
          </ul>
        )}
      </>;
      break;
    }
  }

  return (
    <article className={`t-notice t-notice--${item.kind}`}>
      <span className="b-paper__nail t-notice__nail" aria-hidden="true" />
      <span className="t-notice__icon">{icon}</span>
      <div className="t-notice__body">
        {body}
        <span className="t-notice__meta">
          <time dateTime={item.at} suppressHydrationWarning>{when}</time>
          <Go href={href} className="t-notice__go">{item.kind === 'place' || item.kind === 'photo' ? 'sjá á kortinu' : item.kind === 'advancement' ? 'á veggnum' : item.kind === 'painted' || item.kind === 'synced' ? 'í heiminn' : item.kind === 'version' || item.kind === 'shelf' ? 'á hilluna' : 'sjá kvöldið'}</Go>
        </span>
      </div>
      {pic && (
        <button type="button" className="t-notice__pic" onClick={e => onOpen?.(item.id, e.currentTarget.getBoundingClientRect())} aria-label="Stækka myndina">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...photoProps(pic, POSTCARD)} alt="" loading="lazy" decoding="async" />
        </button>
      )}
    </article>
  );
}
