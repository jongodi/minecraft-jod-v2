'use client';

import { useState } from 'react';
import type { Frame, WallAdvancement } from '@/lib/advancements';
import { formatDate } from '@/lib/format';

/* The game's own advancements on a member's poster, newest first, each in
   the frame the game draws it in and dated by the moment it was done
   (src/lib/advancements.ts). A few are shown; the rest on a press. */

const SHOWN = 6;

/* The three frames on an 8-unit grid, two screen pixels a unit at 1rem: the
   task a tile with notched corners, the goal rounded, the challenge spiked at
   its corners and sides. The hole in the middle is where the game puts the item. */
const FRAMES: Record<Frame, string> = {
  task:      'M1 0h6v1h1v6h-1v1H1v-1H0V1h1z',
  goal:      'M2 0h4v1h1v1h1v4h-1v1h-1v1H2v-1H1v-1H0V2h1V1h1z',
  challenge: 'M1 1h6v6H1zM0 0h1v1H0zM7 0h1v1H7zM0 7h1v1H0zM7 7h1v1H7zM3 0h2v1H3zM3 7h2v1H3zM0 3h1v2H0zM7 3h1v2H7z',
};
const HOLE = 'M3 3h2v2H3z';

export function AdvancementFrame({ frame }: { frame: Frame }) {
  return (
    <svg className={`w-adv__frame w-adv__frame--${frame}`} viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
      <path d={`${FRAMES[frame]}${HOLE}`} fillRule="evenodd" fill="currentColor" />
    </svg>
  );
}

const FRAME_NAMES: Record<Frame, string> = { task: 'verkefni', goal: 'markmið', challenge: 'áskorun' };

export default function Advancements({ list, of }: { list: WallAdvancement[]; of: number }) {
  const [all, setAll] = useState(false);
  if (list.length === 0) return null;
  const shown = all ? list : list.slice(0, SHOWN);
  return (
    <section className="w-adv" aria-label="Afrek">
      <p className="w-adv__head"><span className="b-paper__kicker">Afrek</span><span className="w-adv__count">{list.length} af {of}</span></p>
      <ol className="w-adv__list">
        {shown.map(a => (
          <li key={a.id} className="w-adv__item">
            <AdvancementFrame frame={a.frame} />
            {/* what it asks is the game's own line; on a phone, where nothing hovers, the title says enough */}
            <span className="w-adv__title b-tip" data-tip={a.description} tabIndex={a.description ? 0 : undefined}>
              {a.title}
              <span className="b-visually-hidden">, {FRAME_NAMES[a.frame]}{a.description ? `: ${a.description}` : ''}</span>
            </span>
            <span className="w-adv__when">{formatDate(a.at)}{a.first && <b> · fyrst allra</b>}</span>
          </li>
        ))}
      </ol>
      {list.length > SHOWN && (
        <button type="button" className="b-link w-adv__more" aria-expanded={all} onClick={() => setAll(v => !v)}>
          {all ? 'Bara þau nýjustu' : `Öll ${list.length} afrekin`}
        </button>
      )}
    </section>
  );
}
