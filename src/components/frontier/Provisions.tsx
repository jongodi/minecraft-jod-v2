import { DATAPACKS } from '@/data/datapacks';
import SectionHead from './SectionHead';

const CATEGORY: Record<string, string> = {
  BUILD: 'building', COMBAT: 'combat', QOL: 'quality of life',
  SOCIAL: 'social', STRUCTURE: 'structures', SURVIVAL: 'survival',
};

export default function Provisions() {
  const versions = Array.from(new Set(DATAPACKS.map(d => d.gameVersion))).sort();
  return (
    <section id="provisions" className="f-section">
      <div className="f-wrap f-cols">
        <SectionHead
          kicker="Provisions"
          title="What's loaded"
          lede={`${DATAPACKS.length} datapacks run on the server. Nothing to install on your side; the resource pack is sent when you join.`}
        >
          <p className="f-note">Minecraft {versions.join(' and ')}, Java Edition.</p>
        </SectionHead>

        <ol className="f-ledger">
          {DATAPACKS.map((d, i) => (
            <li key={d.id} className="f-ledger__row">
              <span className="f-ledger__no">{String(i + 1).padStart(2, '0')}</span>
              <span className="f-ledger__name">{d.name}</span>
              <span className="f-ledger__desc">{d.description}</span>
              <span className="f-ledger__meta">
                {d.currentVersion ? `v${d.currentVersion} · ` : ''}{CATEGORY[d.category] ?? d.category.toLowerCase()}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
