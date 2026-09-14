'use client';

import { confidenceLabel } from '@/lib/icelandic';

// Small shared presentational bits used across the analysis views.

import type { Confidence, Evidence, Severity, Verdict } from '../engine/types';

export function Chip({ tone, children }: { tone: 'error' | 'warning' | 'used' | 'info' | 'neutral'; children: React.ReactNode }) {
  return <span className={`rp-chip ${tone}`}><span className="dot" />{children}</span>;
}

const CONF_LEVEL: Record<Confidence, number> = { certain: 4, high: 3, medium: 2, low: 1 };

export function Conf({ level, color }: { level: Confidence; color?: string }) {
  const n = CONF_LEVEL[level];
  return (
    <span className="rp-conf" style={{ color: color ?? 'var(--ink-dim)' }} title={`Vissa: ${confidenceLabel(level)}`}>
      {[0, 1, 2, 3].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

export function verdictTone(v: Verdict): 'error' | 'warning' | 'used' | 'info' | 'neutral' {
  return v === 'error' ? 'error' : v === 'safe-remove' ? 'error' : v === 'review' ? 'warning' : 'used';
}

export function verdictLabel(v: Verdict): string {
  return v === 'error' ? 'Bilað' : v === 'safe-remove' ? 'Óhætt að fjarlægja' : v === 'review' ? 'Yfirferð' : 'Í notkun';
}

export function sevTone(s: Severity): 'error' | 'warning' | 'used' | 'info' | 'neutral' {
  return s === 'error' ? 'error' : s === 'warning' ? 'warning' : s === 'cleanup' ? 'used' : 'info';
}

export function sevIcon(s: Severity): string {
  return s === 'error' ? '✕' : s === 'warning' ? '!' : s === 'cleanup' ? '⌦' : 'i';
}

const EV_TAG: Partial<Record<Evidence['kind'], string>> = {
  'referenced-by': 'notað af',
  references: 'notar',
  'vanilla-override': 'upprunalegt',
  'atlas-source': 'áferðarsafn',
  convention: 'sjálfvirk hleðsla',
  datapack: 'gagnapakki',
  'no-reference': 'engin tilvísun',
  ambiguity: 'óvissa',
  'missing-target': 'vantar',
  note: 'athugasemd',
};

export function EvidenceList({ evidence, onOpen }: { evidence: Evidence[]; onOpen?: (path: string) => void }) {
  if (!evidence.length) return null;
  // Group: positive provenance, anti-provenance/ambiguity, everything else.
  const pos = evidence.filter((e) => e.kind === 'referenced-by' || e.kind === 'vanilla-override' || e.kind === 'atlas-source' || e.kind === 'convention' || e.kind === 'datapack');
  const neg = evidence.filter((e) => e.kind === 'no-reference' || e.kind === 'ambiguity' || e.kind === 'missing-target');
  const other = evidence.filter((e) => !pos.includes(e) && !neg.includes(e));
  const render = (list: Evidence[]) => list.map((e, i) => (
    <div className="rp-ev-row" key={i}>
      <span className="tag">{EV_TAG[e.kind] ?? e.kind}</span>
      <span>
        {e.detail}
        {e.source && onOpen && (
          <> · <a className="src" onClick={(ev) => { ev.stopPropagation(); onOpen(e.source!); }}>{e.source.split('/').slice(-2).join('/')}</a></>
        )}
      </span>
    </div>
  ));
  return (
    <>
      {pos.length > 0 && (
        <div className="rp-ev-block"><div className="rp-ev-h">Rök fyrir notkun</div>{render(pos)}</div>
      )}
      {neg.length > 0 && (
        <div className="rp-ev-block"><div className="rp-ev-h">Af hverju gæti mátt fjarlægja þetta?</div>{render(neg)}</div>
      )}
      {other.length > 0 && (
        <div className="rp-ev-block"><div className="rp-ev-h">Athugasemdir</div>{render(other)}</div>
      )}
    </>
  );
}
