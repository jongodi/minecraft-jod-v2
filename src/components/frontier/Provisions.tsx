import { DATAPACKS } from '@/data/datapacks';
import SectionHead from './SectionHead';

const CATEGORY: Record<string, string> = {
  BUILD: 'Building', COMBAT: 'Combat', QOL: 'Quality of life',
  SOCIAL: 'Social', STRUCTURE: 'Structures', SURVIVAL: 'Survival',
};

export default function Provisions() {
  const versions = new Set(DATAPACKS.map(d => d.gameVersion));
  return (
    <section id="provisions" className="f-section f-section--tint">
      <div className="f-wrap">
        <SectionHead
          no="06"
          kicker="Provisions"
          title="What's loaded"
          lede={`${DATAPACKS.length} datapacks run on the server. No mods to install, the resource pack is sent when you join.`}
        />

        <div className="f-ledger f-reveal">
          {DATAPACKS.map((d, i) => (
            <div key={d.id} className="f-ledger__row">
              <span className="f-ledger__no">{String(i + 1).padStart(2, '0')}</span>
              <span className="f-ledger__name">{d.name}</span>
              <span className="f-ledger__ver">{d.currentVersion ? `v${d.currentVersion}` : ''}</span>
              <span className="f-ledger__desc">{d.description}</span>
              <span className="f-ledger__cat f-label">{CATEGORY[d.category] ?? d.category}</span>
            </div>
          ))}
        </div>

        <p className="f-ledger__foot f-label">
          <span>Minecraft {Array.from(versions).sort().join(' / ')}</span>
          <span>Java Edition</span>
        </p>
      </div>
    </section>
  );
}
