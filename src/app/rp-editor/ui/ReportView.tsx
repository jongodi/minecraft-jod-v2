'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, AssetNode, BrokenRef, Finding, Severity } from '../engine/types';
import { suggestReplacements, bestReplacement } from '../engine/suggest';
import { fmtBytes } from '../engine/verdict';
import { Glass } from './Glass';
import { Chip, Conf, EvidenceList, sevIcon } from './bits';

const SEV_ORDER: Severity[] = ['error', 'warning', 'cleanup', 'info'];
const SEV_LABEL: Record<Severity, string> = { error: 'Broken', warning: 'Warnings', cleanup: 'Cleanup', info: 'Review' };

interface Fixable { id: string; fix: BrokenRef }

export function ReportView({
  analysis, fileData, onOpen, onApplyFix, onApplyManyFixes, onDelete, onExport,
}: {
  analysis: AnalysisResult;
  fileData: Record<string, string>;
  onOpen: (path: string) => void;
  onApplyFix: (file: string, oldValue: string, newValue: string) => void;
  onApplyManyFixes: (fixes: Array<{ file: string; from: string; to: string }>) => void;
  onDelete: (paths: string[]) => void;
  onExport: (kind: 'report' | 'cleanup') => void;
}) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<'none' | 'fix' | 'clean'>('none');

  // Every repointable broken reference, deduped by (file, value).
  const fixables = useMemo<Fixable[]>(() => {
    const seen = new Set<string>();
    const out: Fixable[] = [];
    for (const f of analysis.findings) {
      if (!f.fix) continue;
      const k = `${f.fix.file}|${f.fix.value}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ id: f.id, fix: f.fix });
    }
    return out;
  }, [analysis.findings]);

  const safeRemove = useMemo(
    () => Object.values(analysis.nodes).filter((n) => n.verdict === 'safe-remove'),
    [analysis.nodes],
  );

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {fixables.length > 0 && (
            <button className="rp-btn sm" style={{ borderColor: 'rgba(90,167,255,0.5)', color: 'var(--sev-info)' }}
              onClick={() => setMode('fix')}>⚡ Auto-fix {fixables.length} broken</button>
          )}
          {safeRemove.length > 0 && (
            <button className="rp-btn sm" style={{ borderColor: 'rgba(240,165,0,0.5)', color: 'var(--sev-warning)' }}
              onClick={() => setMode('clean')}>⌦ Clean up {safeRemove.length} unused</button>
          )}
          <button className="rp-btn sm" onClick={() => onExport('report')}>Export report</button>
          <button className="rp-btn sm" onClick={() => onExport('cleanup')} disabled={safeRemove.length === 0}>Export cleanup list</button>
        </div>
      </div>

      {mode === 'fix' ? (
        <FixAllPanel
          fixables={fixables} analysis={analysis}
          onApply={(fixes) => { onApplyManyFixes(fixes); setMode('none'); }}
          onCancel={() => setMode('none')}
        />
      ) : mode === 'clean' ? (
        <CleanupPanel
          items={safeRemove} fileData={fileData} hasDatapacks={analysis.datapacks.length > 0}
          onOpen={onOpen}
          onApply={(paths) => { onDelete(paths); setMode('none'); }}
          onCancel={() => setMode('none')}
        />
      ) : (
        <>
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
                        <div className="rp-finding-meta"><Conf level={f.confidence} /></div>
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
                          {f.consequence && <div className="rp-consequence"><b>If you act on this:</b> {f.consequence}</div>}
                          {f.fix && <FixControl fix={f.fix} analysis={analysis} onApplyFix={onApplyFix} />}
                          {f.severity === 'cleanup' && f.path && analysis.nodes[f.path]?.verdict === 'safe-remove' && (
                            <div style={{ marginTop: 2 }}>
                              <button className="rp-btn sm danger" onClick={() => {
                                if (confirm(`Delete ${f.path}? ${analysis.nodes[f.path!]?.confidence === 'high' ? 'Nothing references it.' : 'Review the caveat above first.'}`)) onDelete([f.path!]);
                              }}>Delete this file</button>
                            </div>
                          )}
                        </div>
                      )}
                    </Glass>
                  );
                })}
              </div>
            ))
          )}

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
        </>
      )}
    </div>
  );
}

// ── Inline single-reference fix ───────────────────────────────────────────────
function FixControl({ fix, analysis, onApplyFix }: { fix: BrokenRef; analysis: AnalysisResult; onApplyFix: (f: string, o: string, n: string) => void }) {
  const suggestions = useMemo(() => suggestReplacements(fix.value, fix.targetKind, analysis, 12), [fix, analysis]);
  const [val, setVal] = useState(() => bestReplacement(fix.value, fix.targetKind, analysis) ?? '');
  const dl = `fx-${fix.file}-${fix.value}`.replace(/[^a-z0-9]/gi, '');
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Repoint {fix.context}</span>
      <input className="rp-search" list={dl} value={val} onChange={(e) => setVal(e.target.value)} placeholder={suggestions[0] ?? (fix.targetKind === 'model' ? 'namespace:item/foo' : 'namespace:item/foo')} style={{ minWidth: 180, flex: '0 1 260px' }} />
      <datalist id={dl}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <button className="rp-btn sm apply" disabled={!val.trim()} onClick={() => val.trim() && onApplyFix(fix.file, fix.value, val.trim())}>Apply</button>
    </div>
  );
}

// ── Bulk auto-fix panel ───────────────────────────────────────────────────────
function FixAllPanel({
  fixables, analysis, onApply, onCancel,
}: {
  fixables: Fixable[];
  analysis: AnalysisResult;
  onApply: (fixes: Array<{ file: string; from: string; to: string }>) => void;
  onCancel: () => void;
}) {
  const suggestionMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const f of fixables) m[f.id] = suggestReplacements(f.fix.value, f.fix.targetKind, analysis, 10);
    return m;
  }, [fixables, analysis]);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fixables) v[f.id] = bestReplacement(f.fix.value, f.fix.targetKind, analysis) ?? '';
    return v;
  });
  const applyCount = Object.values(vals).filter((x) => x.trim()).length;

  return (
    <Glass className="rp-rise" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Repoint {fixables.length} broken reference{fixables.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', marginTop: 3, lineHeight: 1.5, maxWidth: 620 }}>
            Each suggestion is drawn only from files that exist in the pack, so a fix can never create a new broken reference. Confident matches are pre-filled; edit any, or clear a row to skip it. Nothing changes until you apply.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="rp-btn sm apply" disabled={applyCount === 0}
            onClick={() => onApply(fixables.filter((f) => vals[f.id]?.trim()).map((f) => ({ file: f.fix.file, from: f.fix.value, to: vals[f.id].trim() })))}>
            Apply {applyCount} fix{applyCount !== 1 ? 'es' : ''}
          </button>
          <button className="rp-btn sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
        {fixables.map((f) => {
          const dl = `fa-${f.id}`;
          const val = vals[f.id] ?? '';
          return (
            <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 18px minmax(0,1fr)', gap: 10, alignItems: 'center', padding: '9px 18px', borderBottom: '1px solid var(--hair)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{f.fix.context} · {f.fix.file.split('/').slice(-1)[0]}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sev-error)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fix.value}</div>
              </div>
              <span style={{ color: 'var(--ink-faint)', textAlign: 'center' }}>→</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
                <input className="rp-search" list={dl} value={val} placeholder="leave blank to skip"
                  onChange={(e) => setVals((s) => ({ ...s, [f.id]: e.target.value }))}
                  style={{ flex: 1, minWidth: 0 }} />
                <datalist id={dl}>{(suggestionMap[f.id] ?? []).map((s) => <option key={s} value={s} />)}</datalist>
                {val && <button className="rp-btn sm" style={{ flexShrink: 0, padding: '3px 6px' }} onClick={() => setVals((s) => ({ ...s, [f.id]: '' }))}>✕</button>}
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

// ── Bulk cleanup panel ────────────────────────────────────────────────────────
function CleanupPanel({
  items, fileData, hasDatapacks, onOpen, onApply, onCancel,
}: {
  items: AssetNode[];
  fileData: Record<string, string>;
  hasDatapacks: boolean;
  onOpen: (p: string) => void;
  onApply: (paths: string[]) => void;
  onCancel: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(items.map((i) => i.path)));
  const groups = useMemo(() => {
    const high = items.filter((i) => i.confidence === 'high');
    const other = items.filter((i) => i.confidence !== 'high');
    return { high, other };
  }, [items]);
  const selBytes = useMemo(() => items.filter((i) => sel.has(i.path)).reduce((s, i) => s + (i.bytes ?? 0), 0), [items, sel]);

  const toggle = (p: string) => setSel((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const Row = (n: AssetNode) => {
    const isTex = n.kind === 'texture';
    const on = sel.has(n.path);
    return (
      <div key={n.path} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 18px', borderBottom: '1px solid var(--hair)', cursor: 'pointer' }} onClick={() => toggle(n.path)}>
        <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: `1px solid ${on ? 'var(--sev-warning)' : 'var(--hair-strong)'}`, background: on ? 'var(--sev-warning)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--bg)' }}>{on ? '✓' : ''}</div>
        {isTex && fileData[n.path] && <img src={fileData[n.path]} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain', border: '1px solid var(--hair)', flexShrink: 0 }} alt="" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.path.replace(/^assets\/[^/]+\//, '')}</div>
          <div style={{ fontSize: '0.55rem', color: 'var(--ink-faint)' }}>{n.kind} · {fmtBytes(n.bytes ?? 0)}</div>
        </div>
        <a className="src" style={{ fontSize: '0.55rem', color: 'var(--accent)', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onOpen(n.path); }}>inspect</a>
      </div>
    );
  };

  return (
    <Glass className="rp-rise" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Clean up {items.length} provably-unreferenced file{items.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', marginTop: 3, lineHeight: 1.5, maxWidth: 640 }}>
            Only files that <b>nothing references</b> are listed — no model, blockstate, item definition, atlas, font, vanilla path{hasDatapacks ? ', or any datapack you loaded' : ''}. Review the selection; nothing is deleted until you confirm.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="rp-btn sm danger" disabled={sel.size === 0}
            onClick={() => { if (confirm(`Delete ${sel.size} file${sel.size !== 1 ? 's' : ''} (${fmtBytes(selBytes)})? This cannot be undone. You can re-export the pack .zip afterwards.`)) onApply([...sel]); }}>
            Delete {sel.size} ({fmtBytes(selBytes)})
          </button>
          <button className="rp-btn sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      {!hasDatapacks && (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--hair)', background: 'rgba(240,165,0,0.06)', fontSize: '0.68rem', color: 'var(--sev-warning)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0 }}>!</span>
          <span>No datapacks are loaded. A file used only by a datapack would look unused here. If any of these assets are driven by a datapack, load it on the Datapacks tab <b>before</b> deleting.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '8px 18px', borderBottom: '1px solid var(--hair)' }}>
        <button className="rp-btn sm" onClick={() => setSel(new Set(items.map((i) => i.path)))}>Select all</button>
        <button className="rp-btn sm" onClick={() => setSel(new Set())}>Select none</button>
        {groups.other.length > 0 && <button className="rp-btn sm" onClick={() => setSel(new Set(groups.high.map((i) => i.path)))}>Only high-confidence</button>}
      </div>

      <div style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
        {groups.high.length > 0 && (
          <>
            <div className="rp-label" style={{ padding: '10px 18px 6px', color: 'var(--sev-used)' }}>Confident — nothing references these ({groups.high.length})</div>
            {groups.high.map(Row)}
          </>
        )}
        {groups.other.length > 0 && (
          <>
            <div className="rp-label" style={{ padding: '10px 18px 6px', color: 'var(--sev-warning)' }}>Review first — under block/ or item/, could be a vanilla override we don’t recognise ({groups.other.length})</div>
            {groups.other.map(Row)}
          </>
        )}
      </div>
    </Glass>
  );
}
