'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { DATAPACKS } from '@/data/datapacks';
import type { PublicPack } from '@/lib/datapacks-store';
import { Strata } from './Bits';
import PixelGlyph from './PixelGlyph';
import { glyphFor } from './packGlyphs';

/* Shown until /api/datapacks answers, and if it never does. */
const SEED: PublicPack[] = DATAPACKS.map((p, i) => ({ id: p.id, name: p.name, description: p.description, category: p.category, currentVersion: p.currentVersion, gameVersion: p.gameVersion, hidden: false, glyph: null, order: i + 1, isCustom: false }));

const CATEGORY: Record<string, string> = {
  BUILD: 'byggingar', COMBAT: 'bardagar', QOL: 'þægindi',
  SOCIAL: 'samspil', STRUCTURE: 'mannvirki', SURVIVAL: 'lífsbarátta',
};
const categoryName = (c: string) => CATEGORY[c] ?? c.toLowerCase();

/** Deep night: the shelf. Every installed pack is a crate with its glyph; point
    at one and its label goes on the counter, on paper like every other notice.
    Nothing to install: the resource pack downloads on connect. */
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
    <section id="hillan" className="b-sec b-sec--night b-sec--slim" aria-labelledby="hillan-title">
      <Strata flip />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="hillan-title" className="b-title b-title--small">Á hillunni</h2>
            <p className="b-lede">{packs.length} gagnapakkar uppsettir á þjóninum. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist.</p>
          </div>
          <p className="b-note">Minecraft {game} · Java-útgáfa · bentu á kassa til að lesa miðann</p>
        </div>

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
                  onClick={() => setPinned(p => (p === d.id ? null : d.id))}
                >
                  <span className="b-stock__label"><PixelGlyph rows={glyphFor(d)} /></span>
                </button>
              </li>
            ))}
          </ul>

          {/* The counter stays put; only the slip on it changes. Keyed on the pack,
              so each new label slides across the paper as the last one lifts. */}
          <div className={`b-counter b-paper${shown ? ' is-reading' : ''}`}>
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
                  <span className="b-counter__name">{packs.length} kassar á hillunni</span>
                  <span className="b-counter__meta">{tally.map(([c, n]) => `${categoryName(c)} ${n}`).join(' · ')}</span>
                  <span className="b-counter__desc">Bentu á kassa til að lesa miðann.</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(Shelf);
