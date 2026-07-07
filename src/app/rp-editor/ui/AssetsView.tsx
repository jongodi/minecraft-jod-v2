'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, AssetNode, Verdict } from '../engine/types';
import { fmtBytes } from '../engine/verdict';
import { Glass } from './Glass';
import { Chip, Conf, EvidenceList, verdictLabel, verdictTone } from './bits';

type VFilter = 'all' | Verdict;

export function AssetsView({
  analysis, fileData, onOpen, onDelete,
}: {
  analysis: AnalysisResult;
  fileData: Record<string, string>;
  onOpen: (path: string) => void;
  onDelete: (paths: string[]) => void;
}) {
  const textures = analysis.byKind.texture;
  const [filter, setFilter] = useState<VFilter>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: textures.length, used: 0, review: 0, 'safe-remove': 0, error: 0 };
    for (const t of textures) c[analysis.nodes[t]?.verdict ?? 'used']++;
    return c;
  }, [textures, analysis.nodes]);

  const filtered = useMemo(() => {
    let list = textures;
    if (filter !== 'all') list = list.filter((t) => analysis.nodes[t]?.verdict === filter);
    if (q.trim()) { const s = q.toLowerCase(); list = list.filter((t) => t.toLowerCase().includes(s)); }
    return list;
  }, [textures, filter, q, analysis.nodes]);

  const node = sel ? analysis.nodes[sel] : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px clamp(16px,4vw,40px) 0' }}>
          <div className="rp-sh">
            <span className="rp-label">03 — Assets</span>
            <h2>Textures</h2>
          </div>
          <div className="rp-filters">
            {(['all', 'used', 'review', 'safe-remove', 'error'] as VFilter[]).map((f) => (
              <button key={f} className={`rp-btn sm${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'safe-remove' ? 'Removable' : f[0].toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
              </button>
            ))}
            <input className="rp-search" placeholder="Search textures…" value={q} onChange={(e) => setQ(e.target.value)} />
            {counts['safe-remove'] > 0 && (
              <button className="rp-btn sm danger" style={{ marginLeft: 'auto' }}
                onClick={() => {
                  const paths = textures.filter((t) => analysis.nodes[t]?.verdict === 'safe-remove');
                  if (confirm(`Delete ${paths.length} provably-unreferenced texture${paths.length !== 1 ? 's' : ''}? Review each in the inspector first — this cannot be undone.`)) {
                    onDelete(paths); setSel(null);
                  }
                }}>
                Delete {counts['safe-remove']} removable
              </button>
            )}
          </div>
        </div>
        <div className="rp-scroll" style={{ paddingTop: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: '0.75rem', padding: 20 }}>No textures match this filter.</div>
          ) : (
            <div className="rp-grid">
              {filtered.map((path) => {
                const n = analysis.nodes[path];
                const v = n?.verdict ?? 'used';
                return (
                  <div key={path} className={`rp-cell v-${v}${sel === path ? ' sel' : ''}`} onClick={() => setSel(path)} title={path}>
                    <div className="thumb"><img src={fileData[path]} alt={path.split('/').pop()} loading="lazy" /></div>
                    <div className="cap">
                      <div className="nm">{path.split('/').pop()}</div>
                      <div className="v"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />{verdictLabel(v)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {node && <Inspector node={node} fileData={fileData} analysis={analysis} onOpen={onOpen} onDelete={onDelete} onClose={() => setSel(null)} />}
    </div>
  );
}

function Inspector({
  node, fileData, analysis, onOpen, onDelete, onClose,
}: {
  node: AssetNode;
  fileData: Record<string, string>;
  analysis: AnalysisResult;
  onOpen: (p: string) => void;
  onDelete: (p: string[]) => void;
  onClose: () => void;
}) {
  const dup = analysis.duplicates.find((g) => g.members.includes(node.path));
  return (
    <div className="rp-drawer rp-rise">
      <div className="rp-drawer-head">
        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'repeating-conic-gradient(#0a0d13 0% 25%, #070a0f 0% 50%) 50% / 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--hair)' }}>
          <img src={fileData[node.path]} style={{ maxWidth: 40, maxHeight: 40, imageRendering: 'pixelated', objectFit: 'contain' }} alt="" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.path.split('/').pop()}</div>
          <div className="rp-path" style={{ fontSize: '0.6rem', marginTop: 2 }}>{node.path}</div>
        </div>
        <button className="rp-btn sm" onClick={onClose}>✕</button>
      </div>
      <div className="rp-drawer-body">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <Chip tone={verdictTone(node.verdict)}>{verdictLabel(node.verdict)}</Chip>
          <Conf level={node.confidence} />
          {node.image?.width ? <span style={{ fontSize: '0.62rem', color: 'var(--ink-faint)' }}>{node.image.width}×{node.image.height}</span> : null}
          {node.bytes ? <span style={{ fontSize: '0.62rem', color: 'var(--ink-faint)' }}>{fmtBytes(node.bytes)}</span> : null}
        </div>

        {/* Who uses this */}
        <div className="rp-label" style={{ marginBottom: 8 }}>Who uses this</div>
        {node.usedBy.length === 0 && node.datapackRefs.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', marginBottom: 14, lineHeight: 1.5 }}>
            Nothing in the resource pack references this texture directly.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {node.usedBy.map((u) => (
              <a key={u} className="src" style={{ fontSize: '0.7rem', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onOpen(u)}>
                ← {u.replace(/^assets\/[^/]+\//, '')}
              </a>
            ))}
            {node.datapackRefs.map((d, i) => (
              <div key={i} style={{ fontSize: '0.7rem', color: 'var(--sev-used)' }}>← datapack {d.pack}: {d.via}={d.value}</div>
            ))}
          </div>
        )}

        {/* Evidence trail */}
        <div className="rp-label" style={{ marginBottom: 8 }}>Evidence</div>
        <div style={{ marginBottom: 14 }}>
          <EvidenceList evidence={node.evidence} onOpen={onOpen} />
        </div>

        {dup && (
          <Glass style={{ padding: 12, marginBottom: 14 }}>
            <div className="rp-label" style={{ marginBottom: 6 }}>{dup.kind === 'exact' ? 'Exact duplicate group' : `Near-duplicate (distance ${dup.distance})`}</div>
            {dup.members.filter((m) => m !== node.path).map((m) => (
              <div key={m} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <img src={fileData[m]} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain', border: '1px solid var(--hair)' }} alt="" />
                <a className="src" style={{ fontSize: '0.65rem', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onOpen(m)}>{m.split('/').pop()}</a>
              </div>
            ))}
          </Glass>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="rp-btn sm" onClick={() => onOpen(node.path)}>Open in editor</button>
          {node.verdict === 'safe-remove' && (
            <button className="rp-btn sm danger" onClick={() => {
              if (confirm(`Delete ${node.path.split('/').pop()}? ${node.confidence === 'high' ? 'Nothing references it.' : 'Review the vanilla-override caveat above first.'}`)) {
                onDelete([node.path]); onClose();
              }
            }}>Delete this file</button>
          )}
        </div>
      </div>
    </div>
  );
}
