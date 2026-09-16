import { DATAPACKS } from '@/data/datapacks';
import { Strata } from './Bits';
import { SERVER_IP } from './data';

const CATEGORY: Record<string, string> = {
  BUILD: 'byggingar', COMBAT: 'bardagar', QOL: 'þægindi',
  SOCIAL: 'samspil', STRUCTURE: 'mannvirki', SURVIVAL: 'lífsbarátta',
};

/** Night: what is installed, posted as one long notice. */
export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="b-sec b-sec--night" aria-labelledby="provisions-title">
      <Strata flip />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="provisions-title" className="b-title">Uppsett á þjóninum</h2>
            <p className="b-lede">{DATAPACKS.length} gagnapakkar. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist.</p>
          </div>
        </div>

        <article className="b-paper b-notice">
          <span className="b-paper__nail" aria-hidden="true" />
          <p className="b-paper__kicker">Tilkynning</p>
          <h3 className="b-paper__title">Gagnapakkar</h3>
          <p className="b-notice__meta">{SERVER_IP}. Minecraft {versions.join(' og ')}, Java-útgáfa.</p>
          <hr className="b-paper__rule" />
          <ol className="b-notice__list">
            {DATAPACKS.map((d, i) => (
              <li key={d.id} className="b-notice__row">
                <span className="b-notice__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="b-notice__name">{d.name}</span>
                <span className="b-notice__ver">{d.currentVersion ? `útgáfa ${d.currentVersion}` : ''}</span>
                <span className="b-notice__desc">{d.description} <small>({CATEGORY[d.category] ?? d.category.toLowerCase()})</small></span>
              </li>
            ))}
          </ol>
          <div className="b-notice__foot"><span>Uppsettir pakkar</span><span>{DATAPACKS.length}</span></div>
        </article>
      </div>
    </section>
  );
}
