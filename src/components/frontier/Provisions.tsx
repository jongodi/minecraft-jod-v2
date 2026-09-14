import { DATAPACKS } from '@/data/datapacks';
import { Arrow, Stamp } from './Bits';

const CATEGORY: Record<string, string> = {
  BUILD: 'BUILDING', COMBAT: 'COMBAT', QOL: 'QUALITY OF LIFE',
  SOCIAL: 'SOCIAL', STRUCTURE: 'STRUCTURES', SURVIVAL: 'SURVIVAL',
};

export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="j-sec">
      <div className="j-wrap">
        <div className="j-store__head">
          <div>
            <p className="j-note j-note--big">What&rsquo;s loaded on the server</p>
            <p className="j-note">{DATAPACKS.length} datapacks. nothing to install on your side, the resource pack comes down when you ride in</p>
          </div>
          <p className="j-note j-note--faint">kept the receipt <Arrow /></p>
        </div>

        <div className="j-receipt">
          <p className="j-receipt__title">JOÐ GENERAL STORE</p>
          <p className="j-receipt__meta">play.jodcraft.world<br />Minecraft {versions.join(' / ')} · Java Edition</p>
          <hr className="j-receipt__hr" />
          {DATAPACKS.map((d, i) => (
            <div key={d.id}>
              <div className="j-receipt__row">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span className="j-receipt__name">{d.name.toUpperCase()}</span>
                <span className="j-receipt__lead" />
                <span className="j-receipt__ver">{d.currentVersion ? `v${d.currentVersion}` : '—'}</span>
              </div>
              <div className="j-receipt__desc">{d.description} · {CATEGORY[d.category] ?? d.category}</div>
            </div>
          ))}
          <hr className="j-receipt__hr" />
          <div className="j-receipt__total"><span>PACKS LOADED</span><span>{DATAPACKS.length}</span></div>
          <div className="j-receipt__total"><span>TO PAY</span><span>NOTHING</span></div>
          <hr className="j-receipt__hr" />
          <p className="j-receipt__foot">THANK YOU · RIDE SAFE</p>
          <div className="j-receipt__code" aria-hidden="true" />
          <Stamp small r={-12}>Paid in full</Stamp>
        </div>
      </div>
    </section>
  );
}
