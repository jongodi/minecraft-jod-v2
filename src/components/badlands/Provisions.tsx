'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DATAPACKS } from '@/data/datapacks';
import type { PublicPack } from '@/lib/datapacks-store';
import { Strata } from './Bits';
import FoldPlank from './FoldPlank';
import PixelGlyph from './PixelGlyph';
import { glyphFor } from './packGlyphs';
import { SERVER_IP } from './data';
import { useKeepInView } from './hooks';

/* Shown until /api/datapacks answers, and if it never does. */
const SEED: PublicPack[] = DATAPACKS.map((p, i) => ({ id: p.id, name: p.name, description: p.description, category: p.category, currentVersion: p.currentVersion, gameVersion: p.gameVersion, hidden: false, glyph: null, order: i + 1, isCustom: false }));

const CATEGORY: Record<string, string> = {
  BUILD: 'byggingar', COMBAT: 'bardagar', QOL: 'þægindi',
  SOCIAL: 'samspil', STRUCTURE: 'mannvirki', SURVIVAL: 'lífsbarátta',
};
const categoryName = (c: string) => CATEGORY[c] ?? c.toLowerCase();

/** Night: the general store. Closed, the packs are crates stacked on the back
    shelves: point at one and the shopkeeper puts its label on the counter. The
    plank opens the shelves proper, where every crate carries its own text.
    Nothing is for sale. */
function Provisions() {
  const [packs, setPacks] = useState<PublicPack[]>(SEED);
  const [shelves, setShelves] = useState(false);
  const [pinned, setPinned] = useState<number | null>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/datapacks', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((list: PublicPack[] | null) => { if (Array.isArray(list)) setPacks(list); })
      .catch(() => {});
  }, []);

  useKeepInView(shelves, section);

  const versions = Array.from(new Set(packs.map(d => d.gameVersion))).sort();
  const shown = packs.find(d => d.id === (pointed ?? pinned)) ?? null;
  /* What is on the shelves, by kind, so the counter says something while nothing is picked. */
  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of packs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [packs]);

  return (
    <section id="provisions" ref={section} className="b-sec b-sec--night" aria-labelledby="provisions-title">
      <Strata />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="provisions-title" className="b-title">Kaupfélagið</h2>
            <p className="b-lede">{packs.length} gagnapakkar uppsettir á þjóninum. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist.</p>
          </div>
          <p className="b-note">{SERVER_IP}. Minecraft {versions.join(' og ')}, Java-útgáfa.</p>
        </div>

        <div className="b-store">
          <div className="b-store__sign" aria-hidden="true">
            <span className="b-store__signtext">Kaupfélag JOÐ</span>
            <span className="b-store__signsub">opið allan sólarhringinn</span>
          </div>

          <div id="provisions-stock">
            {shelves ? (
              <ol className="b-shelf" aria-label="Uppsettir gagnapakkar">
                {packs.map((d, i) => (
                  <li key={d.id} className="b-crate" style={{ '--i': i } as CSSProperties}>
                    <span className="b-crate__box" aria-hidden="true">
                      <span className="b-crate__label"><PixelGlyph rows={glyphFor(d)} /></span>
                    </span>
                    {d.currentVersion && <span className="b-crate__tag">útg. {d.currentVersion}</span>}
                    <span className="b-crate__name" title={d.name}>{d.name}</span>
                    <span className="b-crate__desc" title={d.description}>{d.description}</span>
                    <span className="b-crate__cat">{categoryName(d.category)}</span>
                  </li>
                ))}
              </ol>
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
                        onPointerEnter={() => setPointed(d.id)}
                        onPointerLeave={() => setPointed(p => (p === d.id ? null : p))}
                        onFocus={() => setPointed(d.id)}
                        onBlur={() => setPointed(p => (p === d.id ? null : p))}
                        onClick={() => setPinned(p => (p === d.id ? null : d.id))}
                      >
                        <span className="b-stock__label"><PixelGlyph rows={glyphFor(d)} /></span>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* keyed on the pack, so the label slides onto the counter each time a different crate is picked */}
                <div className="b-counter b-paper" key={shown?.id ?? "none"}>
                  <span className="b-counter__glyph">{shown && <PixelGlyph rows={glyphFor(shown)} />}</span>
                  {shown ? (
                    <span className="b-counter__text">
                      <span className="b-counter__name">{shown.name}</span>
                      <span className="b-counter__meta">{categoryName(shown.category)}{shown.currentVersion && ` · útg. ${shown.currentVersion}`}</span>
                      <span className="b-counter__desc">{shown.description}</span>
                    </span>
                  ) : (
                    <span className="b-counter__text">
                      <span className="b-counter__name">{packs.length} kassar á lager</span>
                      <span className="b-counter__meta">{tally.map(([c, n]) => `${categoryName(c)} ${n}`).join(' · ')}</span>
                      <span className="b-counter__desc">Veldu kassa til að lesa miðann, eða opnaðu hillurnar fyrir neðan.</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <FoldPlank
            open={shelves}
            onToggle={() => setShelves(v => !v)}
            controls="provisions-stock"
            openLabel="Opna hillurnar"
            closeLabel="Loka hillunum"
            count={packs.length}
          />
        </div>
      </div>
    </section>
  );
}

/* Memoised: the home page re-renders whenever the server ping, the stats or
   the active section changes, and this section depends on none of them. */
export default memo(Provisions);
