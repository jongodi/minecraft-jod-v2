import { DATAPACKS } from '@/data/datapacks';
import SectionHead from './SectionHead';
import { Divider } from './Ornaments';

const CATEGORY: Record<string, string> = {
  BUILD: 'Building', COMBAT: 'Combat', QOL: 'Quality of life',
  SOCIAL: 'Social', STRUCTURE: 'Structures', SURVIVAL: 'Survival',
};

export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="f-band">
      <div className="f-wrap f-band__inner">
        <SectionHead
          kicker="Chapter VI · Provisions"
          title="The general store"
          lede={`${DATAPACKS.length} datapacks run on the server. Nothing to install on your side; the resource pack is sent when you ride in.`}
        />

        <div className="f-store">
          <ol className="f-store__list" style={{ marginTop: 0 }}>
            {DATAPACKS.map(d => (
              <li key={d.id} className="f-store__row">
                <div className="f-store__line">
                  <span className="f-store__name">{d.name}</span>
                  <span className="f-leader" style={{ borderColor: 'var(--ink-3)' }} />
                  <span className="f-store__ver">{d.currentVersion ? `v${d.currentVersion}` : '—'}</span>
                </div>
                <div className="f-store__desc">{d.description}</div>
                <div className="f-store__cat">{CATEGORY[d.category] ?? d.category}</div>
              </li>
            ))}
          </ol>
          <Divider className="f-head__orn" />
          <p className="f-store__foot">Minecraft {versions.join(' and ')} · Java Edition</p>
        </div>
      </div>
    </section>
  );
}
