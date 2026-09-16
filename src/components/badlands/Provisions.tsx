import { DATAPACKS } from '@/data/datapacks';
import { Strata } from './Bits';
import PixelGlyph from './PixelGlyph';
import { PACK_GLYPHS } from './packGlyphs';
import { SERVER_IP } from './data';

const CATEGORY: Record<string, string> = {
  BUILD: 'byggingar', COMBAT: 'bardagar', QOL: 'þægindi',
  SOCIAL: 'samspil', STRUCTURE: 'mannvirki', SURVIVAL: 'lífsbarátta',
};

/** Night: the general store. Every installed pack sits on a shelf as a
    labelled crate, its version on a hanging tag. Nothing is for sale. */
export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="b-sec b-sec--night" aria-labelledby="provisions-title">
      <Strata />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="provisions-title" className="b-title">Kaupfélagið</h2>
            <p className="b-lede">{DATAPACKS.length} gagnapakkar uppsettir á þjóninum. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist.</p>
          </div>
          <p className="b-note">{SERVER_IP}. Minecraft {versions.join(' og ')}, Java-útgáfa.</p>
        </div>

        <div className="b-store">
          <div className="b-store__sign" aria-hidden="true">
            <span className="b-store__signtext">Kaupfélag JOÐ</span>
            <span className="b-store__signsub">opið allan sólarhringinn</span>
          </div>
          <ol className="b-shelf" aria-label="Uppsettir gagnapakkar">
            {DATAPACKS.map(d => (
              <li key={d.id} className="b-crate">
                <span className="b-crate__box" aria-hidden="true">
                  <span className="b-crate__label">{PACK_GLYPHS[d.name] && <PixelGlyph rows={PACK_GLYPHS[d.name]} />}</span>
                </span>
                {d.currentVersion && <span className="b-crate__tag">útg. {d.currentVersion}</span>}
                <span className="b-crate__name">{d.name}</span>
                <span className="b-crate__desc">{d.description}</span>
                <span className="b-crate__cat">{CATEGORY[d.category] ?? d.category.toLowerCase()}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
