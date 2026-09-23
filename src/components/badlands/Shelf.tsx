'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { DATAPACKS } from '@/data/datapacks';
import type { PublicPack } from '@/lib/datapacks-store';
import PixelGlyph from './PixelGlyph';
import { glyphFor } from './packGlyphs';
import { plural } from '@/lib/format';
import { useReducedMotionPref } from './hooks';

/* Shown until /api/datapacks answers, and if it never does. */
const SEED: PublicPack[] = DATAPACKS.map((p, i) => ({ id: p.id, name: p.name, description: p.description, category: p.category, currentVersion: p.currentVersion, gameVersion: p.gameVersion, hidden: false, glyph: null, order: i + 1, isCustom: false }));

const CATEGORY: Record<string, string> = {
  BUILD: 'byggingar', COMBAT: 'bardagar', QOL: 'þægindi',
  SOCIAL: 'samspil', STRUCTURE: 'mannvirki', SURVIVAL: 'lífsbarátta',
};
const categoryName = (c: string) => CATEGORY[c] ?? c.toLowerCase();

/** The shelf, a room opened over the world. Every installed pack is a crate
    with its glyph; point at one and its label goes on the counter, on paper
    like every other notice. Nothing to install: the resource pack downloads
    on connect. The stock list is fetched when the room is first opened. */
function Shelf({ version }: { version: string | null }) {
  const [packs, setPacks] = useState<PublicPack[]>(SEED);
  const [pinned, setPinned] = useState<number | null>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  /* The label stays on the counter for a moment after the pointer leaves a
     crate, so walking along the shelf reads as one slip replacing another
     rather than the stock list flashing up between every two. */
  const leaving = useRef<ReturnType<typeof setTimeout>>();
  const point = (id: number) => { clearTimeout(leaving.current); setPointed(id); };
  const unpoint = (id: number) => {
    clearTimeout(leaving.current);
    leaving.current = setTimeout(() => setPointed(p => (p === id ? null : p)), 320);
  };
  useEffect(() => () => clearTimeout(leaving.current), []);

  /* On a phone the counter sits under three rows of crates, below the room's
     fold, so a tapped crate seemed to do nothing. Picking one brings the
     counter up into the room's view; the page itself never moves. */
  const counter = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionPref();
  const revealCounter = () => requestAnimationFrame(() => {
    const el = counter.current;
    const room = el?.closest<HTMLElement>('.b-room__body');
    if (!el || !room) return;
    const below = el.getBoundingClientRect().bottom - room.getBoundingClientRect().bottom + 12;
    if (below > 0) room.scrollBy({ top: below, behavior: reduce ? 'auto' : 'smooth' });
  });

  useEffect(() => {
    fetch('/api/datapacks', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((list: PublicPack[] | null) => { if (Array.isArray(list)) setPacks(list); })
      .catch(() => {});
  }, []);

  const shown = packs.find(d => d.id === (pointed ?? pinned)) ?? null;
  /* What is on the shelf, by kind, so the counter says something while nothing is picked. */
  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of packs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [packs]);
  const game = version ?? Array.from(new Set(packs.map(d => d.gameVersion))).sort().join(' og ');

  return (
    <div className="b-wrap b-shelf">
        {packs.length > 0 && <div className="b-head b-head--tight">
          <p className="b-lede b-shelf__lede">{packs.length} {plural(packs.length, 'gagnapakki uppsettur', 'gagnapakkar uppsettir')}. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist.</p>
          <p className="b-note">{game && <>Minecraft {game} · </>}<span className="b-nowrap">Java-útgáfa</span></p>
        </div>}

        {packs.length === 0 ? (
          <p className="b-empty" role="status">Hillan er tóm í bili; engir pakkar eru til sýnis.</p>
        ) : (
        <div className="b-stock">
          <ul className="b-stock__grid" aria-label="Uppsettir gagnapakkar">
            {packs.map(d => (
              <li key={d.id}>
                <button
                  type="button"
                  className={`b-stock__crate${shown?.id === d.id ? ' is-shown' : ''}`}
                  aria-pressed={pinned === d.id}
                  aria-label={`${d.name}, ${categoryName(d.category)}${d.currentVersion ? `, útgáfa ${d.currentVersion}` : ''}: ${d.description}`}
                  onPointerEnter={() => point(d.id)}
                  onPointerLeave={() => unpoint(d.id)}
                  onFocus={() => point(d.id)}
                  onBlur={() => unpoint(d.id)}
                  onClick={() => { if (pinned !== d.id) revealCounter(); setPinned(p => (p === d.id ? null : d.id)); }}
                >
                  <span className="b-stock__label"><PixelGlyph rows={glyphFor(d)} /></span>
                </button>
              </li>
            ))}
          </ul>

          {/* The counter stays put; only the slip on it changes. Keyed on the pack,
              so each new label slides across the paper as the last one lifts. */}
          <div ref={counter} className={`b-counter b-paper${shown ? ' is-reading' : ''}`}>
            <div className="b-counter__slip" key={shown?.id ?? 'none'}>
              <span className="b-counter__glyph">{shown && <PixelGlyph rows={glyphFor(shown)} />}</span>
              {shown ? (
                <span className="b-counter__text">
                  <span className="b-counter__name">{shown.name}</span>
                  <span className="b-counter__meta">{categoryName(shown.category)}{shown.currentVersion && ` · útg. ${shown.currentVersion}`}</span>
                  <span className="b-counter__desc">{shown.description}</span>
                </span>
              ) : (
                <span className="b-counter__text">
                  <span className="b-counter__name">{packs.length} {plural(packs.length, 'kassi', 'kassar')} á hillunni</span>
                  <span className="b-counter__meta">{tally.map(([c, n]) => `${categoryName(c)} ${n}`).join(' · ')}</span>
                  <span className="b-counter__desc">Bentu á kassa til að lesa miðann.</span>
                </span>
              )}
            </div>
          </div>
        </div>
        )}
    </div>
  );
}

export default memo(Shelf);
