import { DATAPACKS } from '@/data/datapacks';
import { Arrow, Stamp } from './Bits';

const CATEGORY: Record<string, string> = {
  BUILD: 'BYGGINGAR', COMBAT: 'BARDAGAR', QOL: 'ÞÆGINDI',
  SOCIAL: 'SAMSPIL', STRUCTURE: 'MANNVIRKI', SURVIVAL: 'LÍFSBARÁTTA',
};

export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="j-sec">
      <div className="j-wrap">
        <div className="j-store__head">
          <div>
            <p className="j-note j-note--big">Það sem er uppsett á þjóninum</p>
            <p className="j-note">{DATAPACKS.length} gagnapakkar. Þú þarft ekkert að setja upp; útlitspakkinn sækist þegar þú tengist</p>
          </div>
          <p className="j-note j-note--faint">við geymdum kvittunina <Arrow /></p>
        </div>

        <div className="j-receipt">
          <span className="j-receipt__string" aria-hidden="true" />
          <span className="j-receipt__hole" aria-hidden="true" />
          <p className="j-receipt__title">JOÐ KAUPFÉLAG</p>
          <p className="j-receipt__meta">play.jodcraft.world<br />Minecraft {versions.join(' / ')} · Java-útgáfa</p>
          <hr className="j-receipt__hr" />
          {DATAPACKS.map((d, i) => (
            <div key={d.id}>
              <div className="j-receipt__row">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span className="j-receipt__name">{d.name.toUpperCase()}</span>
                <span className="j-receipt__lead" />
                <span className="j-receipt__ver">{d.currentVersion ? `v${d.currentVersion}` : '·'}</span>
              </div>
              <div className="j-receipt__desc">{d.description} · {CATEGORY[d.category] ?? d.category}</div>
            </div>
          ))}
          <hr className="j-receipt__hr" />
          <div className="j-receipt__total"><span>UPPSETTIR PAKKAR</span><span>{DATAPACKS.length}</span></div>
          <div className="j-receipt__total"><span>TIL GREIÐSLU</span><span>EKKERT</span></div>
          <hr className="j-receipt__hr" />
          <p className="j-receipt__foot">TAKK FYRIR · GÓÐA FERÐ</p>
          <div className="j-receipt__code" aria-hidden="true" />
          <Stamp small r={-12}>Greitt að fullu</Stamp>
        </div>
      </div>
    </section>
  );
}
