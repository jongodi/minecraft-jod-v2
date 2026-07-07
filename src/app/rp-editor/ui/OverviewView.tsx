'use client';

import type { AnalysisResult } from '../engine/types';
import { fmtBytes } from '../engine/verdict';
import { Glass } from './Glass';
import { Chip } from './bits';

export function OverviewView({
  analysis, packName, onGo,
}: {
  analysis: AnalysisResult;
  packName: string;
  onGo: (tab: string) => void;
}) {
  const s = analysis.summary;
  const total = Math.max(1, s.used + s.review + s.safeRemove + s.errors);
  const seg = (n: number, color: string) => ({ width: `${(n / total) * 100}%`, background: color });

  return (
    <div className="rp-scroll">
      <div className="rp-sh">
        <span className="rp-label">01 — Overview</span>
        <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{packName}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {analysis.meta.versionLabel && <Chip tone="info">{analysis.meta.versionLabel}</Chip>}
          <Chip tone="neutral">{analysis.meta.itemSystem === 'item-definition' ? 'items/ system' : analysis.meta.itemSystem === 'legacy-overrides' ? 'overrides system' : 'format unknown'}</Chip>
        </div>
      </div>

      {/* Health bar */}
      <Glass className="rp-rise" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="rp-label">Pack health</div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.62rem', flexWrap: 'wrap' }}>
            <LegendDot color="var(--sev-used)" label={`${s.used} used`} />
            <LegendDot color="var(--sev-warning)" label={`${s.review} review`} />
            <LegendDot color="var(--sev-error)" label={`${s.safeRemove} removable`} />
            {s.errors > 0 && <LegendDot color="#ff2d55" label={`${s.errors} errors`} />}
          </div>
        </div>
        <div className="rp-health">
          <i style={seg(s.used, 'var(--sev-used)')} />
          <i style={seg(s.review, 'var(--sev-warning)')} />
          <i style={seg(s.safeRemove, 'var(--sev-error)')} />
          <i style={seg(s.errors, '#ff2d55')} />
        </div>
        {s.reclaimableBytes > 0 && (
          <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--ink-dim)' }}>
            Up to <b style={{ color: 'var(--ink)' }}>{fmtBytes(s.reclaimableBytes)}</b> reclaimable from {s.safeRemove} provably-unreferenced file{s.safeRemove !== 1 ? 's' : ''} — reviewed and confirmed by you, never removed automatically.
          </div>
        )}
      </Glass>

      {/* Stat cards */}
      <div className="rp-stats">
        <Stat n={s.files} cap="Files" tone="info" />
        <Stat n={s.textures} cap="Textures" tone="info" />
        <Stat n={s.models} cap="Models" tone="info" />
        <Stat n={s.errors} cap="Broken" tone={s.errors > 0 ? 'err' : 'ok'} onClick={() => onGo('report')} />
        <Stat n={s.safeRemove} cap="Safe to remove" tone={s.safeRemove > 0 ? 'warn' : 'ok'} onClick={() => onGo('report')} />
        <Stat n={s.review} cap="Needs review" tone={s.review > 0 ? 'warn' : 'ok'} onClick={() => onGo('report')} />
      </div>

      {/* Datapack coverage */}
      <Glass style={{ padding: 20 }}>
        <div className="rp-label" style={{ marginBottom: 12 }}>Datapack coverage</div>
        {analysis.datapacks.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            No datapacks loaded. Assets invoked only by a datapack (via <code>item_model</code>, <code>custom_model_data</code>, or a text <code>font</code>) will look unreferenced.
            <div style={{ marginTop: 10 }}>
              <button className="rp-btn sm" onClick={() => onGo('datapacks')}>Add datapacks →</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)' }}>
              {analysis.datapackRefs.length} reference{analysis.datapackRefs.length !== 1 ? 's' : ''} extracted from {analysis.datapacks.length} datapack{analysis.datapacks.length !== 1 ? 's' : ''}.
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {analysis.datapacks.map((d) => <Chip key={d} tone="used">{d}</Chip>)}
            </div>
            <div><button className="rp-btn sm" onClick={() => onGo('datapacks')}>View coverage →</button></div>
          </div>
        )}
      </Glass>
    </div>
  );
}

function Stat({ n, cap, tone, onClick }: { n: number; cap: string; tone: 'info' | 'ok' | 'warn' | 'err'; onClick?: () => void }) {
  return (
    <Glass className={`rp-stat ${tone}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="rp-num">{n.toLocaleString()}</div>
      <div className="cap">{cap}</div>
    </Glass>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-dim)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{label}
    </span>
  );
}
