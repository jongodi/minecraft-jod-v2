'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AnalysisResult } from '../engine/types';
import { PixelPainter } from '../editor-tools';
import { LayeredPreview, type PreviewLayer } from './LayeredPreview';
import { overlayForTexture, modelForTexture } from './overlays';
import { entityTemplateFor } from '../engine/entity-models';
import { normTex } from '../engine/resloc';
import { Chip } from './bits';

const ModelViewer3D = dynamic(() => import('../model-viewer-3d'), {
  ssr: false,
  loading: () => <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: 12, border: '1px solid var(--hair)', borderRadius: 10 }}>Loading 3D…</div>,
});

type Filter = 'all' | 'overlay' | 'layered' | 'no-model';

/**
 * A synthesized model for a texture nothing in the pack references — so
 * texture-only overrides still get a 3D view. Signs, hanging signs and beds map
 * to their real vanilla geometry (26.x turned them into block models); any other
 * block texture falls back to a plain cube.
 */
function synthModelFor(sel: string): { json: any; note: string } | null {
  let m = sel.match(/^assets\/([^/]+)\/textures\/(block\/[a-z0-9_]+_hanging_sign)\.png$/i);
  if (m) return { json: { parent: 'minecraft:block/template_hanging_sign_rot_0', textures: { all: `${m[1]}:${m[2]}` } }, note: 'vanilla hanging-sign model' };
  m = sel.match(/^assets\/([^/]+)\/textures\/(block\/[a-z0-9_]+_sign)\.png$/i);
  if (m) return { json: { parent: 'minecraft:block/template_sign_rot_0', textures: { all: `${m[1]}:${m[2]}` } }, note: 'vanilla sign model' };
  m = sel.match(/^assets\/([^/]+)\/textures\/block\/([a-z0-9_]+_bed_(head|foot))_(up|east|west)\.png$/i);
  if (m) {
    const base = `${m[1]}:block/${m[2]}`;
    return {
      json: { parent: `minecraft:block/template_bed_${m[3]}`, textures: { up: `${base}_up`, east: `${base}_east`, west: `${base}_west` } },
      note: 'vanilla bed model',
    };
  }
  m = sel.match(/^assets\/([^/]+)\/textures\/(block\/[a-z0-9_]+)\.png$/i);
  if (m) return { json: { parent: 'minecraft:block/cube_all', textures: { all: `${m[1]}:${m[2]}` } }, note: 'no model in pack — shown on a cube' };
  return null;
}

/** Collapsible drawer section with a hairline header. */
function Fold({ title, chip, defaultOpen = true, children }: {
  title: string; chip?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: open ? 8 : 0 }}>
        <span aria-hidden style={{ fontSize: 8, color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
        <span className="rp-label" style={{ marginBottom: 0 }}>{title}</span>
        {chip}
        <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      </button>
      {open && children}
    </div>
  );
}

export function TexturesView({
  analysis, fileData, revision, onSaveTexture, onAddOverlay, onRemoveOverlay, onOpenInEditor,
}: {
  analysis: AnalysisResult;
  fileData: Record<string, string>;
  revision: number;
  onSaveTexture: (path: string, dataUrl: string) => void;
  onAddOverlay: (modelPath: string, baseTexPath: string | null) => Promise<string | null>;
  onRemoveOverlay: (modelPath: string, layerKey: string, texPath: string | null) => void;
  onOpenInEditor: (path: string) => void;
}) {
  const textures = analysis.byKind.texture;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  // Wide mode: grow the studio panel (and the 3D view with it) for detail work.
  const [expanded, setExpanded] = useState(false);

  // Precompute overlay status for badges + filtering.
  const overlayOf = useMemo(() => {
    const m = new Map<string, ReturnType<typeof overlayForTexture>>();
    for (const t of textures) m.set(t, overlayForTexture(t, analysis));
    return m;
  }, [textures, analysis]);

  const counts = useMemo(() => ({
    all: textures.length,
    overlay: textures.filter((t) => overlayOf.get(t)?.hasOverlay).length,
    layered: textures.filter((t) => overlayOf.get(t)).length,
    'no-model': textures.filter((t) => (analysis.nodes[t]?.usedBy.length ?? 0) === 0).length,
  }), [textures, overlayOf, analysis.nodes]);

  const filtered = useMemo(() => {
    let list = textures;
    if (filter === 'overlay') list = list.filter((t) => overlayOf.get(t)?.hasOverlay);
    else if (filter === 'layered') list = list.filter((t) => overlayOf.get(t));
    else if (filter === 'no-model') list = list.filter((t) => (analysis.nodes[t]?.usedBy.length ?? 0) === 0);
    if (q.trim()) { const s = q.toLowerCase(); list = list.filter((t) => t.toLowerCase().includes(s)); }
    return list;
  }, [textures, filter, q, overlayOf, analysis.nodes]);

  const select = (t: string) => { setSel(t); setActiveLayer(t); };

  const overlay = sel ? overlayForTexture(sel, analysis) : null;
  const model = sel ? modelForTexture(sel, analysis) : null;
  const isLayeredItem = !!overlay;                 // generated item — edit via 2D layers
  const entityTpl = sel && !isLayeredItem ? entityTemplateFor(normTex(sel)) : null;
  // Last resort: synthesize a model so texture-only overrides still get 3D.
  const synth = sel && !isLayeredItem && !model && !entityTpl ? synthModelFor(sel) : null;
  // Editable 3D for block textures (any model — the viewer resolves the parent
  // chain), entity textures (templates), or synthesized vanilla geometry.
  const show3D = !isLayeredItem && (!!model || !!entityTpl || !!synth);
  const baseTexPath = overlay?.layers.find((l) => l.index === 0)?.path ?? sel;

  // Layers for the preview: the model's layer stack, or just the texture itself.
  const previewLayers: PreviewLayer[] = overlay
    ? overlay.layers.map((l) => ({ key: l.key, label: l.key === 'layer0' ? 'base' : `overlay ${l.index}`, dataUrl: l.path ? fileData[l.path] : null }))
    : sel ? [{ key: 'tex', label: 'texture', dataUrl: fileData[sel] }] : [];

  const previewChip = entityTpl ? <Chip tone="warning">approx</Chip>
    : synth ? <Chip tone="neutral">{synth.note.includes('cube') ? 'cube' : 'vanilla model'}</Chip>
    : isLayeredItem ? <Chip tone="info">item layers</Chip>
    : model ? <Chip tone="info">3D</Chip> : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Grid */}
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px clamp(16px,3vw,32px) 0' }}>
          <div className="rp-sh">
            <span className="rp-label">Studio</span>
            <h2>Textures</h2>
          </div>
          <div className="rp-filters">
            {(['all', 'layered', 'overlay', 'no-model'] as Filter[]).map((f) => (
              <button key={f} className={`rp-btn sm${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'layered' ? 'Can overlay' : f === 'overlay' ? 'Has overlay' : 'No model'} ({counts[f]})
              </button>
            ))}
            <input className="rp-search" placeholder="Search textures…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="rp-scroll" style={{ paddingTop: 8 }}>
          <div className="rp-grid">
            {filtered.map((t) => {
              const ov = overlayOf.get(t);
              return (
                <div key={t} className={`rp-cell${sel === t ? ' sel' : ''}`} onClick={() => select(t)} title={t}>
                  <div className="thumb"><img src={fileData[t]} alt={t.split('/').pop()} loading="lazy" /></div>
                  {ov?.hasOverlay && <div style={{ position: 'absolute', top: 5, right: 5, fontSize: 11, color: 'var(--sev-info)', background: 'rgba(var(--bg-rgb),0.7)', borderRadius: 4, padding: '0 3px' }} title="Has overlay layer">⧉</div>}
                  <div className="cap">
                    <div className="nm">{t.split('/').pop()}</div>
                    <div className="v" style={{ color: ov ? 'var(--sev-info)' : 'var(--ink-faint)' }}>{ov ? (ov.hasOverlay ? `${ov.layers.length} layers` : 'layer0') : 'texture'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Studio panel */}
      {sel && (
        <div className="rp-drawer rp-rise" style={{ width: expanded ? 'min(980px, 92vw)' : 'min(440px, 46vw)', transition: 'width 0.2s ease' }}>
          <div className="rp-drawer-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.split('/').pop()}</div>
              <div className="rp-path" style={{ fontSize: '0.58rem', marginTop: 2 }}>{sel.replace(/^assets\/[^/]+\//, '')}</div>
            </div>
            <button className="rp-btn sm" title={expanded ? 'Shrink panel' : 'Expand panel — bigger 3D view and painter'} onClick={() => setExpanded((e) => !e)}>{expanded ? '⇥ Shrink' : '⤢ Expand'}</button>
            <button className="rp-btn sm" onClick={() => setSel(null)}>✕</button>
          </div>
          <div className="rp-drawer-body">
            {/* ── Preview ── */}
            <Fold title="Preview" chip={previewChip}>
              {show3D ? (
                <ModelViewer3D
                  modelContent={model ? (fileData[model] ?? '{}') : synth ? JSON.stringify(synth.json) : '{}'}
                  entityTexture={entityTpl ? sel : null}
                  fileData={fileData} texturePaths={textures} revision={revision}
                  editable onPaint={onSaveTexture} onSelectTexture={(p) => select(p)}
                  height={expanded ? 540 : 300}
                />
              ) : (
                <LayeredPreview layers={previewLayers} size={expanded ? 400 : 220} />
              )}
              {(model || entityTpl || synth) && (
                <div style={{ marginTop: 8, fontSize: '0.62rem', color: 'var(--ink-faint)', textAlign: 'center' }}>
                  {model ? (
                    <>model: <a className="src" style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onOpenInEditor(model)}>{model.split('/').pop()}</a></>
                  ) : entityTpl ? (
                    <>approximate {entityTpl.name} preview — the game renders these with a built-in model, not a pack file</>
                  ) : (
                    synth!.note
                  )}
                </div>
              )}
            </Fold>

            {/* ── Layers & overlay ── */}
            <Fold title="Layers & overlay"
              chip={overlay ? (overlay.hasOverlay ? <Chip tone="info">has overlay</Chip> : <Chip tone="neutral">base only</Chip>) : undefined}
              defaultOpen={!!overlay}>
              {overlay ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {overlay.layers.map((l) => (
                    <div key={l.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 7px', borderRadius: 8, background: activeLayer === l.path ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(var(--text-rgb),0.03)', border: `1px solid ${activeLayer === l.path ? 'rgba(var(--accent-rgb),0.4)' : 'var(--hair)'}` }}>
                      <div style={{ width: 26, height: 26, flexShrink: 0, background: 'repeating-conic-gradient(#0a0d13 0% 25%, #070a0f 0% 50%) 50% / 8px 8px', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {l.path && fileData[l.path] ? <img src={fileData[l.path]} style={{ maxWidth: 22, maxHeight: 22, imageRendering: 'pixelated' }} alt="" /> : <span style={{ fontSize: 10, color: 'var(--sev-error)' }}>?</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--ink)' }}>{l.index === 0 ? 'layer0 · base' : `layer${l.index} · overlay`}</div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.ref}</div>
                      </div>
                      {l.path && <button className="rp-btn sm" onClick={() => setActiveLayer(l.path)}>Edit</button>}
                      {l.index >= 1 && (
                        <button className="rp-btn sm danger" title="Remove this overlay layer" onClick={() => {
                          if (confirm(`Remove ${l.key} (overlay) from ${overlay.model.split('/').pop()}? The overlay texture will be deleted.`)) onRemoveOverlay(overlay.model, l.key, l.path);
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="rp-btn sm" style={{ borderColor: 'rgba(90,167,255,0.5)', color: 'var(--sev-info)', marginTop: 4 }}
                    onClick={async () => { const p = await onAddOverlay(overlay.model, baseTexPath); if (p) { setActiveLayer(p); } }}>
                    + Add overlay layer
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', lineHeight: 1.5 }}>
                  Only textures used as a layer of a generated item model can take stacked overlays.
                  {show3D ? ' This one renders in 3D — paint it directly in the preview above.' : ''}
                </div>
              )}
            </Fold>

            {/* ── Pixel painter ── */}
            <Fold title={`Pixel painter${activeLayer && activeLayer !== sel ? ` — ${overlay?.layers.find((l) => l.path === activeLayer)?.key ?? 'layer'}` : ''}`}>
              {activeLayer && fileData[activeLayer] ? (
                <PixelPainter key={activeLayer + revision} compact dataUrl={fileData[activeLayer]} onSave={(d: string) => onSaveTexture(activeLayer, d)} />
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--ink-faint)' }}>Select a layer to edit.</div>
              )}
            </Fold>
          </div>
        </div>
      )}
    </div>
  );
}
