'use client';

// Myndir: every picture on the board as the game hangs one, in an item
// frame on the wall, a day to a row of them. The crew's prints and the map's
// new pictures alike; each is a press from the lightbox, and its line under
// it leads to where it hangs.
import Link from 'next/link';
import type { BoardItem } from '@/lib/board-types';
import { byDay, dayLabel } from '@/lib/board-types';
import PlayerHead from '@/components/badlands/PlayerHead';
import { photoProps } from '@/components/badlands/photo';

/** One picture on the board: a print on a member's post, or the map's. */
export interface Frame {
  /** the print's own id, or the map item's, as the lightbox finds it */
  id: string;
  src: string;
  caption: string;
  /** who pinned it; null for the map's */
  who: string | null;
  at: string;
  takenAt: string | null;
  /** where it hangs: the post on its wall, or the place on the map */
  href: string;
}

/** Every picture the items show, in their order. */
export function framesOf(items: BoardItem[]): Frame[] {
  return items.flatMap((i): Frame[] => {
    if (i.kind === 'post') return i.entry.photos.map(p => ({ id: p.id, src: p.filename, caption: p.caption, who: i.who, at: i.at, takenAt: p.takenAt, href: `/crew/${i.who}#${i.entry.id}` }));
    if (i.kind === 'photo') return [{ id: i.id, src: i.photo, caption: i.label ? `${i.label}${i.title && i.title !== i.label ? `: ${i.title}` : ''}` : i.title, who: null, at: i.at, takenAt: null, href: i.placeId !== null ? `/stadur/${i.placeId}#heimur` : '/#heimur' }];
    if (i.kind === 'place' && i.photo) return [{ id: i.id, src: i.photo, caption: i.label, who: null, at: i.at, takenAt: null, href: `/stadur/${i.placeId}#heimur` }];
    return [];
  });
}

/* the frames' column: four across the board's width on a wide screen, two on a phone */
const SIZES = '(min-width: 1100px) 220px, (min-width: 640px) 30vw, 46vw';

interface Props {
  frames: Frame[];
  isFresh: (f: Frame) => boolean;
  H: 'h2' | 'h3';
  now: number | undefined;
  onOpen: (id: string, origin: DOMRect) => void;
}

export default function PrintWall({ frames, isFresh, H, now, onOpen }: Props) {
  return (
    <>
      {byDay(frames).map(({ day, items }) => (
        <section key={day} className="t-day">
          <H className="t-day__head" suppressHydrationWarning>{dayLabel(day, now)}</H>
          <ul className="t-frames">
            {items.map(f => (
              <li key={f.id} className="t-frame">
                {isFresh(f) && <span className="t-tags" aria-hidden="true"><span className="t-tag">Nýtt</span></span>}
                {/* said as the list says it: the tag over the frame is for the eye */}
                <button type="button" className="t-frame__pic" onClick={e => onOpen(f.id, e.currentTarget.getBoundingClientRect())} aria-label={`${isFresh(f) ? 'Nýtt: ' : ''}${f.caption ? `Stækka: ${f.caption}` : 'Stækka myndina'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...photoProps(f.src, SIZES)} alt={f.caption} loading="lazy" decoding="async" />
                </button>
                <Link href={f.href} className="t-frame__line">
                  {f.who ? <PlayerHead name={f.who} size={16} alt="" /> : <span className="t-frame__map" aria-hidden="true" />}
                  <span className="t-frame__cap">{f.caption || f.who || 'Á kortinu'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
