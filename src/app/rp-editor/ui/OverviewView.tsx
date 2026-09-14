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
        <span className="rp-label">01 — Yfirlit</span>
        <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{packName}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {analysis.meta.versionLabel && <Chip tone="info">{analysis.meta.versionLabel}</Chip>}
          <Chip tone="neutral">{analysis.meta.itemSystem === 'item-definition' ? 'items/-kerfi' : analysis.meta.itemSystem === 'legacy-overrides' ? 'overrides-kerfi' : 'óþekkt snið'}</Chip>
        </div>
      </div>

      {/* Health bar */}
      <Glass className="rp-rise" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="rp-label">Ástand pakkans</div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.62rem', flexWrap: 'wrap' }}>
            <LegendDot color="var(--sev-used)" label={`Í notkun: ${s.used}`} />
            <LegendDot color="var(--sev-warning)" label={`Yfirferð: ${s.review}`} />
            <LegendDot color="var(--sev-error)" label={`Má fjarlægja: ${s.safeRemove}`} />
            {s.errors > 0 && <LegendDot color="#ff2d55" label={`Villur: ${s.errors}`} />}
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
            Allt að <b style={{ color: 'var(--ink)' }}>{fmtBytes(s.reclaimableBytes)}</b> má losa úr skrám án tilvísana ({s.safeRemove}). Þú ferð yfir þær og staðfestir; engu er eytt sjálfvirkt.
          </div>
        )}
      </Glass>

      {/* Stat cards */}
      <div className="rp-stats">
        <Stat n={s.files} cap="Skrár" tone="info" />
        <Stat n={s.textures} cap="Áferðir" tone="info" />
        <Stat n={s.models} cap="Líkön" tone="info" />
        <Stat n={s.errors} cap="Bilað" tone={s.errors > 0 ? 'err' : 'ok'} onClick={() => onGo('report')} />
        <Stat n={s.safeRemove} cap="Óhætt að fjarlægja" tone={s.safeRemove > 0 ? 'warn' : 'ok'} onClick={() => onGo('report')} />
        <Stat n={s.review} cap="Þarfnast yfirferðar" tone={s.review > 0 ? 'warn' : 'ok'} onClick={() => onGo('report')} />
      </div>

      {/* Umfang gagnapakka */}
      <Glass style={{ padding: 20 }}>
        <div className="rp-label" style={{ marginBottom: 12 }}>Umfang gagnapakka</div>
        {analysis.datapacks.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            Engir gagnapakkar eru opnir. Tilföng sem aðeins gagnapakki notar (með <code>item_model</code>, <code>custom_model_data</code> eða <code>font</code>) virðast því vera án tilvísana.
            <div style={{ marginTop: 10 }}>
              <button className="rp-btn sm" onClick={() => onGo('datapacks')}>Bæta við gagnapökkum →</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)' }}>
              Tilvísanir fundust: {analysis.datapackRefs.length} · Gagnapakkar: {analysis.datapacks.length}.
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {analysis.datapacks.map((d) => <Chip key={d} tone="used">{d}</Chip>)}
            </div>
            <div><button className="rp-btn sm" onClick={() => onGo('datapacks')}>Skoða umfang →</button></div>
          </div>
        )}
      </Glass>
    </div>
  );
}

function Stat({ n, cap, tone, onClick }: { n: number; cap: string; tone: 'info' | 'ok' | 'warn' | 'err'; onClick?: () => void }) {
  return (
    <Glass className={`rp-stat ${tone}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="rp-num">{n.toLocaleString('is-IS')}</div>
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
