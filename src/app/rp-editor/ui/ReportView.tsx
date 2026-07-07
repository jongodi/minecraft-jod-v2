'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, Finding, Severity } from '../engine/types';
import { Glass } from './Glass';
import { Chip, Conf, EvidenceList, sevIcon } from './bits';

const SEV_ORDER: Severity[] = ['error', 'warning', 'cleanup', 'info'];
const SEV_LABEL: Record<Severity, string> = { error: 'Broken', warning: 'Warnings', cleanup: 'Cleanup', info: 'Review' };

export function ReportView({
  analysis, onOpen, onApplyFix, onExport,
}: {
  analysis: AnalysisResult;
  onOpen: (path: string) => void;
  onApplyFix?: (modelPath: string, key: string, value: string) => void;
  onExport: (kind: 'report' | 'cleanup') => void;
}) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: analysis.findings.length };
    for (const s of SEV_ORDER) c[s] = analysis.findings.filter((f) => f.severity === s).length;
    return c;
  }, [analysis.findings]);

  const filtered = useMemo(() => {
    let list = analysis.findings;
    if (filter !== 'all') list = list.filter((f) => f.severity === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((f) => f.title.toLowerCase().includes(s) || f.detail.toLowerCase().includes(s) || (f.path ?? '').toLowerCase().includes(s));
    }
    return list;
  }, [analysis.findings, filter, q]);

  const grouped = useMemo(() => {
    const g: Record<Severity, Finding[]> = { error: [], warning: [], cleanup: [], info: [] };
    for (const f of filtered) g[f.severity].push(f);
    return g;
  }, [filtered]);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clean = analysis.findings.length === 0;

  return (
    <div className="rp-scroll">
      <div className="rp-sh">
        <span className="rp-label">02 — Report</span>
        <h2>{clean ? 'No problems found' : `${analysis.findings.length} finding${analysis.findings.length !== 1 ? 's' : ''}`}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="rp-btn sm" onClick={() => onExport('report')}>Export report</button>
          <button className="rp-btn sm" onClick={() => onExport('cleanup')} disabled={counts.cleanup === 0}>Export cleanup list</button>
        </div>
      </div>

      {/* Filter row */}
      <div className="rp-filters">
        {(['all', ...SEV_ORDER] as const).map((s) => (
          <button key={s} className={`rp-btn sm${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : SEV_LABEL[s as Severity]} ({counts[s] ?? 0})
          </button>
        ))}
        <input className="rp-search" placeholder="Search findings, paths…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {clean ? (
        <Glass className="rp-rise" style={{ padding: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 30, color: 'var(--sev-used)' }}>✓</div>
          <div>
            <div style={{ fontSize: '0.95rem', color: 'var(--ink)', marginBottom: 4 }}>Every reference resolves, and nothing is provably unused.</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
              The dependency graph is intact. Remember the editor cannot see plugin- or macro-generated references — see the blind spots below before assuming 100% coverage.
            </div>
          </div>
        </Glass>
      ) : (
        SEV_ORDER.filter((s) => grouped[s].length > 0).map((s) => (
          <div key={s} style={{ marginBottom: 24 }}>
            <div className="rp-label" style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Chip tone={s === 'error' ? 'error' : s === 'warning' ? 'warning' : s === 'cleanup' ? 'used' : 'info'}>{SEV_LABEL[s]}</Chip>
              <span>{grouped[s].length}</span>
            </div>
            {grouped[s].map((f) => {
              const isOpen = open.has(f.id);
              return (
                <Glass key={f.id} className={`rp-finding ${f.severity}`}>
                  <div className="rail" />
                  <div className="rp-finding-head" onClick={() => toggle(f.id)}>
                    <span className={`rp-caret${isOpen ? ' open' : ''}`}>▸</span>
                    <div className="rp-finding-icon">{sevIcon(f.severity)}</div>
                    <div className="rp-finding-main">
                      <div className="rp-finding-title">{f.title}</div>
                      <div className="rp-finding-detail">{f.detail}</div>
                    </div>
                    <div className="rp-finding-meta">
                      <Conf level={f.confidence} />
                    </div>
                  </div>
                  {isOpen && (
                    <div className="rp-evidence">
                      {f.path && (
                        <div className="rp-ev-row">
                          <span className="tag">file</span>
                          <a className="src" onClick={() => onOpen(f.path!)}>{f.path}</a>
                        </div>
                      )}
                      <EvidenceList evidence={f.evidence} onOpen={onOpen} />
                      {f.consequence && (
                        <div className="rp-consequence"><b>If you act on this:</b> {f.consequence}</div>
                      )}
                      {f.fix && onApplyFix && (
                        <FixControl fix={f.fix} textures={analysis.byKind.texture} onApplyFix={onApplyFix} />
                      )}
                    </div>
                  )}
                </Glass>
              );
            })}
          </div>
        ))
      )}

      {/* Blind spots — honest limits */}
      {analysis.blindSpots.length > 0 && (
        <Glass style={{ padding: 18, marginTop: 12 }}>
          <div className="rp-label" style={{ marginBottom: 10, color: 'var(--sev-info)' }}>What this analysis cannot see</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analysis.blindSpots.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.55 }}>
                <span style={{ color: 'var(--sev-info)', flexShrink: 0 }}>▸</span>{b}
              </div>
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}

function FixControl({ fix, textures, onApplyFix }: { fix: { modelPath: string; key: string; value: string }; textures: string[]; onApplyFix: (m: string, k: string, v: string) => void }) {
  const [val, setVal] = useState('');
  const suggestions = useMemo(() => {
    const bare = fix.value.split('/').pop()?.replace(/^.*:/, '') ?? '';
    return textures
      .map((t) => t.replace(/^assets\/[^/]+\/textures\//, '').replace(/\.png$/i, ''))
      .filter((t) => bare && t.toLowerCase().includes(bare.toLowerCase()))
      .slice(0, 12);
  }, [fix.value, textures]);
  const dl = `fx-${fix.modelPath}-${fix.key}`.replace(/[^a-z0-9]/gi, '');
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Repoint</span>
      <input className="rp-search" list={dl} value={val} onChange={(e) => setVal(e.target.value)} placeholder={suggestions[0] ?? 'block/stone'} style={{ minWidth: 160, flex: '0 1 220px' }} />
      <datalist id={dl}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <button className="rp-btn sm apply" disabled={!val.trim()} onClick={() => val.trim() && onApplyFix(fix.modelPath, fix.key, val.trim())}>Apply</button>
    </div>
  );
}
