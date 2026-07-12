'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import dynamic from 'next/dynamic';
import DiscsView from './tabs/DiscsView';
import PackDiffView from './tabs/PackDiffView';
import { css as legacyCss } from './rp-constants';
import { RP_CSS, GlassFilterDefs } from './ui/tokens';
import { Glass } from './ui/Glass';
import { OverviewView } from './ui/OverviewView';
import { ReportView } from './ui/ReportView';
import { AssetsView } from './ui/AssetsView';
import { TexturesView } from './ui/TexturesView';
import { GraphView } from './ui/GraphView';
import { DatapacksView } from './ui/DatapacksView';
import { useAnalyzer } from './use-analyzer';
import { analyze } from './engine/analyze';
import { extractZip } from './engine/extract';
import { classify, texturePathToLoc, modelPathToLoc, textureLocToPath, modelLocToPath } from './engine/resloc';
import { replaceRefsInJson, rewriteRefsInJson, isTextureSlot, isModelSlot, type RefKind } from './engine/apply';
import type { RawFile, AnalysisResult, DatapackInput } from './engine/types';
import { buildTree, TreeNode, PixelPainter, AudioPlayer, JsonEditor, PackMetaEditor } from './editor-tools';
import { generateReportMarkdown, generateCleanupJson, download } from './ui/export';

const ModelViewer3D = dynamic(() => import('./model-viewer-3d'), {
  ssr: false,
  loading: () => <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: 12, border: '1px solid var(--hair)', borderRadius: 8 }}>Loading 3D viewer…</div>,
});

const IMG = /\.(png|jpg|jpeg)$/i;

/** Native pixel size of a data-URL image (defaults to 16×16 if it can't load). */
function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve({ w: 16, h: 16 });
    const im = new Image();
    im.onload = () => resolve({ w: im.naturalWidth || 16, h: im.naturalHeight || 16 });
    im.onerror = () => resolve({ w: 16, h: 16 });
    im.src = dataUrl;
  });
}
/** A fully-transparent PNG data URL of the given size. */
function transparentPng(w: number, h: number): string {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c.toDataURL('image/png');
}

export default function App() {
  const { state, run } = useAnalyzer();

  const fileDataRef = useRef<Record<string, string>>({});
  const rawFilesRef = useRef<Record<string, RawFile>>({});
  const dpRef = useRef<DatapackInput[]>([]);

  const [packName, setPackName] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [tab, setTab] = useState('overview');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState('preview');
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('No pack loaded');
  const [dragging, setDragging] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [painting3dTex, setPainting3dTex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reanalyzeTimer = useRef<any>(null);

  // Ingest a completed worker analysis.
  useEffect(() => {
    if (state.status === 'done' && state.result) {
      const r = state.result;
      fileDataRef.current = r.fileData;
      rawFilesRef.current = Object.fromEntries(r.rawFiles.map((f) => [f.path, f]));
      dpRef.current = r.datapacks;
      setPackName(r.packName);
      setAnalysis(r.analysis);
      setFilePaths(Object.keys(r.fileData));
      setSelected(null); setSelectedContent(null); setTab('overview');
      setStatus(`Analysed ${Object.keys(r.fileData).length} files · ${r.analysis.summary.errors} errors · ${r.analysis.summary.safeRemove} removable`);
    } else if (state.status === 'error') {
      setStatus(`Error: ${state.error}`);
    }
  }, [state.status, state.result, state.error]);

  // Synchronous re-analysis from cached rawFiles (decode already done).
  const reanalyze = useCallback(() => {
    const files = Object.values(rawFilesRef.current);
    const result = analyze({ files, datapacks: dpRef.current });
    setAnalysis(result);
  }, []);

  const scheduleReanalyze = useCallback(() => {
    if (reanalyzeTimer.current) clearTimeout(reanalyzeTimer.current);
    reanalyzeTimer.current = setTimeout(() => reanalyze(), 450);
  }, [reanalyze]);

  const loadFiles = useCallback((packFile: File, datapacks: File[]) => {
    run(packFile, datapacks);
    setStatus(`Loading ${packFile.name}…`);
  }, [run]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFiles(f, []);
  };
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.zip')) loadFiles(f, []);
  }, [loadFiles]);

  // Pull the pack the live server is actually using (its server.properties
  // resource-pack URL), proxied through our API, and load it like an upload.
  const loadFromServer = useCallback(async () => {
    setServerError(null);
    setServerBusy(true);
    setStatus('Fetching the resource pack from the server…');
    try {
      const res = await fetch('/api/rp-editor/server-pack');
      if (!res.ok) {
        let msg = `Couldn’t fetch the server pack (${res.status}).`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* non-JSON */ }
        setServerError(msg); setStatus(msg); return;
      }
      const blob = await res.blob();
      const name = res.headers.get('X-Pack-Filename') || 'server-resource-pack.zip';
      loadFiles(new File([blob], name, { type: 'application/zip' }), []);
    } catch (e: any) {
      const msg = `Couldn’t fetch the server pack: ${e?.message ?? 'network error'}`;
      setServerError(msg); setStatus(msg);
    } finally {
      setServerBusy(false);
    }
  }, [loadFiles]);

  const openInEditor = useCallback((path: string) => {
    setSelected(path); setPainting3dTex(null);
    setSelectedContent(fileDataRef.current[path]);
    const ext = path.split('.').pop()!.toLowerCase();
    if (['png', 'jpg', 'jpeg'].includes(ext)) setEditorTab('preview');
    else if (['ogg', 'mp3', 'wav'].includes(ext)) setEditorTab('audio');
    else if (path.includes('pack.mcmeta')) setEditorTab('meta');
    else setEditorTab('editor');
    setTab('editor');
  }, []);

  // ── Edit operations ─────────────────────────────────────────────────────────
  const setFile = (path: string, content: string, isText: boolean) => {
    fileDataRef.current[path] = content;
    const existing = rawFilesRef.current[path];
    if (existing && isText) rawFilesRef.current[path] = { ...existing, text: content, bytes: content.length };
  };

  const updateContent = useCallback((val: string) => {
    if (!selected) return;
    setFile(selected, val, true);
    setSelectedContent(val);
    scheduleReanalyze();
  }, [selected, scheduleReanalyze]);

  const saveTexture = useCallback((dataUrl: string) => {
    if (!selected) return;
    fileDataRef.current[selected] = dataUrl;
    setSelectedContent(dataUrl);
    setRevision((r) => r + 1);
    setStatus(`Saved edits to ${selected.split('/').pop()}`);
  }, [selected]);

  // Repoint one broken reference: replace occurrences of `oldValue` in the file
  // with `newValue` — structural, and constrained to positions matching the
  // reference kind, so fixing a broken texture can never rewrite a working
  // model parent that happens to share the same string.
  const applyFix = useCallback((file: string, oldValue: string, newValue: string, kind?: RefKind) => {
    const content = fileDataRef.current[file];
    if (!content) return;
    const { text, applied } = replaceRefsInJson(content, [{ from: oldValue, to: newValue, kind }]);
    if (!applied) { setStatus(`No occurrence of "${oldValue}" found in ${file.split('/').pop()}`); return; }
    setFile(file, text, true);
    if (selected === file) setSelectedContent(text);
    reanalyze();
    setStatus(`Repointed "${oldValue}" → "${newValue}" in ${file.split('/').pop()}`);
  }, [selected, reanalyze]);

  // Apply many repoints at once, grouped per file so each file is parsed once.
  const applyManyFixes = useCallback((fixes: Array<{ file: string; from: string; to: string; kind?: RefKind }>) => {
    const byFile = new Map<string, Array<{ from: string; to: string; kind?: RefKind }>>();
    for (const f of fixes) {
      if (!f.to.trim()) continue;
      (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)!).push({ from: f.from, to: f.to.trim(), kind: f.kind });
    }
    let total = 0; let files = 0;
    for (const [file, repl] of byFile) {
      const content = fileDataRef.current[file];
      if (!content) continue;
      const { text, applied } = replaceRefsInJson(content, repl);
      if (applied > 0) { setFile(file, text, true); if (selected === file) setSelectedContent(text); total += applied; files++; }
    }
    reanalyze();
    setStatus(total ? `Repointed ${total} reference${total !== 1 ? 's' : ''} across ${files} file${files !== 1 ? 's' : ''}` : 'No references were changed');
  }, [selected, reanalyze]);

  const deleteFiles = useCallback((paths: string[]) => {
    for (const p of paths) { delete fileDataRef.current[p]; delete rawFilesRef.current[p]; }
    setFilePaths(Object.keys(fileDataRef.current));
    if (selected && paths.includes(selected)) { setSelected(null); setSelectedContent(null); }
    reanalyze();
    setStatus(`Deleted ${paths.length} file${paths.length !== 1 ? 's' : ''}`);
  }, [selected, reanalyze]);

  const updateFiles = useCallback((updates: Record<string, string>) => {
    for (const [path, content] of Object.entries(updates)) {
      const isText = !content.startsWith('data:');
      if (!rawFilesRef.current[path]) rawFilesRef.current[path] = { path, kind: classify(path), isImage: IMG.test(path), bytes: content.length, text: isText ? content : undefined };
      setFile(path, content, isText);
    }
    setFilePaths(Object.keys(fileDataRef.current));
    reanalyze();
    setStatus(`Updated ${Object.keys(updates).length} file(s)`);
  }, [reanalyze]);

  // Rename a file and repoint every reference to it. References are matched by
  // where they RESOLVE (namespace-aware, case-insensitive), rewritten with the
  // new location case-preserved, and constrained to the right kind of slot —
  // texture refs for texture renames, model/parent refs for model renames.
  const renameFile = useCallback((oldPath: string, newPath: string) => {
    if (!oldPath || !newPath || oldPath === newPath) return;
    const data = fileDataRef.current, raw = rawFilesRef.current;
    if (!data[oldPath]) return;
    data[newPath] = data[oldPath]; delete data[oldPath];
    if (raw[oldPath]) { raw[newPath] = { ...raw[oldPath], path: newPath }; delete raw[oldPath]; }
    // A texture's animation .mcmeta belongs with it — move it too.
    if (IMG.test(oldPath) && data[oldPath + '.mcmeta'] != null) {
      data[newPath + '.mcmeta'] = data[oldPath + '.mcmeta']; delete data[oldPath + '.mcmeta'];
      if (raw[oldPath + '.mcmeta']) { raw[newPath + '.mcmeta'] = { ...raw[oldPath + '.mcmeta'], path: newPath + '.mcmeta' }; delete raw[oldPath + '.mcmeta']; }
    }

    const oldTex = texturePathToLoc(oldPath), newTex = texturePathToLoc(newPath);
    const oldMod = modelPathToLoc(oldPath), newMod = modelPathToLoc(newPath);
    // Preserve the reference style: keep bare (no namespace) when the original
    // was bare and the new location is in the minecraft namespace.
    const render = (orig: string, loc: { namespace: string; path: string }) =>
      loc.namespace === 'minecraft' && !orig.includes(':') ? loc.path : `${loc.namespace}:${loc.path}`;

    if ((oldTex && newTex) || (oldMod && newMod)) {
      for (const p of Object.keys(data)) {
        if (!p.endsWith('.json') && !p.endsWith('.mcmeta')) continue;
        const content = data[p];
        if (typeof content !== 'string' || content.startsWith('data:')) continue;
        const { text, applied } = rewriteRefsInJson(content, (value, { key, parentKey }) => {
          if (oldTex && newTex && isTextureSlot(key, parentKey) &&
              textureLocToPath(value).toLowerCase() === oldPath.toLowerCase()) {
            return render(value, newTex);
          }
          if (oldMod && newMod && isModelSlot(key, parentKey) &&
              modelLocToPath(value).toLowerCase() === oldPath.toLowerCase()) {
            return render(value, newMod);
          }
          return null;
        });
        if (applied > 0) { data[p] = text; if (raw[p]) raw[p] = { ...raw[p], text }; }
      }
    }
    setFilePaths(Object.keys(data));
    if (selected === oldPath) { setSelected(newPath); setSelectedContent(data[newPath]); }
    reanalyze();
    setStatus(`Renamed ${oldPath.split('/').pop()} → ${newPath.split('/').pop()}`);
  }, [selected, reanalyze]);

  const addDatapacks = useCallback(async (files: File[]) => {
    setStatus('Reading datapacks…');
    for (const f of files) {
      try {
        const ex = await extractZip(await f.arrayBuffer());
        dpRef.current = [...dpRef.current.filter((d) => d.label !== f.name), { label: f.name, files: ex.rawFiles }];
      } catch (e: any) { setStatus('Datapack read failed: ' + e.message); }
    }
    reanalyze();
    setStatus(`Loaded ${files.length} datapack(s) — coverage updated`);
  }, [reanalyze]);

  // Save painted pixels to an arbitrary texture path (used by the Textures studio).
  const saveTextureAt = useCallback((path: string, dataUrl: string) => {
    fileDataRef.current[path] = dataUrl;
    if (selected === path) setSelectedContent(dataUrl);
    setRevision((r) => r + 1);
    setStatus(`Saved ${path.split('/').pop()}`);
  }, [selected]);

  // Add an overlay layer (layer1+) to a generated item model: create a
  // transparent texture matching the base, and wire it into the model JSON.
  const addOverlayLayer = useCallback(async (modelPath: string, baseTexPath: string | null): Promise<string | null> => {
    const content = fileDataRef.current[modelPath];
    if (!content) return null;
    let json: any;
    try { json = JSON.parse(content); } catch { setStatus('Cannot add overlay: model JSON is invalid'); return null; }
    const tex = (json.textures && typeof json.textures === 'object') ? json.textures : {};
    const ns = modelPath.match(/^assets\/([^/]+)\//)?.[1] ?? 'minecraft';
    const layerKeys = Object.keys(tex).filter((k) => /^layer\d+$/.test(k));
    const nextIdx = layerKeys.length ? Math.max(...layerKeys.map((k) => parseInt(k.slice(5), 10))) + 1 : 1;
    const baseName = (typeof tex.layer0 === 'string' ? tex.layer0 : '').replace(/^.*:/, '').split('/').pop()
      || modelPath.split('/').pop()!.replace(/\.json$/, '');
    const rel = `item/${baseName}_overlay${nextIdx > 1 ? nextIdx : ''}`;
    const overlayPath = `assets/${ns}/textures/${rel}.png`;
    const overlayLoc = `${ns}:${rel}`;
    const dims = await getImageSize(baseTexPath ? fileDataRef.current[baseTexPath] : '');
    fileDataRef.current[overlayPath] = transparentPng(dims.w, dims.h);
    rawFilesRef.current[overlayPath] = { path: overlayPath, kind: 'texture', isImage: true, bytes: 256, image: { width: dims.w, height: dims.h, hash: 'ov:' + overlayPath, ahash: '' } };
    json.textures = { ...tex, [`layer${nextIdx}`]: overlayLoc };
    const updated = JSON.stringify(json, null, 2);
    fileDataRef.current[modelPath] = updated;
    if (rawFilesRef.current[modelPath]) rawFilesRef.current[modelPath] = { ...rawFilesRef.current[modelPath], text: updated };
    if (selected === modelPath) setSelectedContent(updated);
    setFilePaths(Object.keys(fileDataRef.current));
    reanalyze();
    setStatus(`Added overlay layer${nextIdx} to ${modelPath.split('/').pop()} — paint it now`);
    return overlayPath;
  }, [selected, reanalyze]);

  // Remove an overlay layer from a model; delete its texture only if nothing
  // else still references it (safe — a shared overlay is kept).
  const removeOverlayLayer = useCallback((modelPath: string, layerKey: string, texPath: string | null) => {
    const content = fileDataRef.current[modelPath];
    if (!content) return;
    let json: any;
    try { json = JSON.parse(content); } catch { return; }
    if (json.textures) delete json.textures[layerKey];
    const updated = JSON.stringify(json, null, 2);
    fileDataRef.current[modelPath] = updated;
    if (rawFilesRef.current[modelPath]) rawFilesRef.current[modelPath] = { ...rawFilesRef.current[modelPath], text: updated };
    if (texPath && fileDataRef.current[texPath]) {
      const loc = texturePathToLoc(texPath);
      const stillUsed = loc != null && Object.entries(fileDataRef.current).some(([p, c]) =>
        p !== modelPath && p.endsWith('.json') && typeof c === 'string' &&
        (c.includes(`${loc.namespace}:${loc.path}`) || c.includes(`"${loc.path}"`)));
      if (!stillUsed) { delete fileDataRef.current[texPath]; delete rawFilesRef.current[texPath]; }
    }
    if (selected === modelPath) setSelectedContent(updated);
    setFilePaths(Object.keys(fileDataRef.current));
    reanalyze();
    setStatus(`Removed ${layerKey} from ${modelPath.split('/').pop()}`);
  }, [selected, reanalyze]);

  const exportZip = useCallback(async () => {
    try {
      const zip = new JSZip();
      for (const [path, content] of Object.entries(fileDataRef.current)) {
        if (typeof content === 'string' && content.startsWith('data:')) zip.file(path, content.split(',')[1], { base64: true });
        else zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = packName || 'resource_pack.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Exported pack .zip');
    } catch (e: any) { setStatus('Export error: ' + e.message); }
  }, [packName]);

  const exportReport = useCallback((kind: 'report' | 'cleanup') => {
    if (!analysis) return;
    const base = (packName || 'pack').replace(/\.zip$/i, '');
    if (kind === 'report') download(`${base}-report.md`, generateReportMarkdown(analysis, packName), 'text/markdown');
    else download(`${base}-cleanup.json`, generateCleanupJson(analysis, packName), 'application/json');
    setStatus(`Exported ${kind}`);
  }, [analysis, packName]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const fileCount = filePaths.length;
  const tree = useMemo(() => buildTree(filePaths), [filePaths]);
  const issueCount = (analysis?.summary.errors ?? 0) + (analysis?.summary.warnings ?? 0);
  const ext = selected ? selected.split('.').pop()!.toLowerCase() : '';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
  const isAudio = ['ogg', 'mp3', 'wav'].includes(ext);
  const isMeta = !!selected?.includes('pack.mcmeta');
  const isJson = ext === 'json' && !isMeta;

  // Navigation: the four everyday destinations up front, everything else under
  // "More" — every option stays one click away without a 9-tab wall.
  const PRIMARY_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'report', label: 'Report', badge: issueCount + (analysis?.summary.safeRemove ?? 0) },
    { id: 'textures', label: 'Textures' },
    { id: 'editor', label: 'Files' },
  ];
  const MORE_TABS = [
    { id: 'assets', label: 'Assets', hint: 'every file + verdicts' },
    { id: 'datapacks', label: 'Datapacks', hint: 'load for coverage' },
    { id: 'graph', label: 'Graph', hint: 'dependency map' },
    { id: 'diff', label: 'Diff', hint: 'compare two packs' },
    { id: 'discs', label: 'Discs', hint: 'custom music' },
  ];

  const busy = state.status === 'running';

  return (
    <div className="rp-root rp-refract-on">
      <style dangerouslySetInnerHTML={{ __html: legacyCss }} />
      <style dangerouslySetInnerHTML={{ __html: RP_CSS }} />
      <GlassFilterDefs />

      {busy && (
        <div className="rp-overlay">
          <Glass style={{ padding: '30px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="rp-spin" />
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--accent)' }}>{state.phase || 'Processing'}</div>
            <div className="rp-progress"><i style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>
          </Glass>
        </div>
      )}

      {/* Top bar */}
      <div className="rp-top">
        <Link href="/" style={{ textDecoration: 'none' }}><button className="rp-btn sm">← Home</button></Link>
        <div className="rp-brand">JOÐ<b>craft</b><span>Pack Assay</span></div>
        <div style={{ flex: 1 }} />
        {fileCount > 0 && <button className="rp-btn sm" onClick={exportZip}>Export .zip</button>}
        <button className="rp-btn sm" onClick={loadFromServer} disabled={serverBusy} title="Load the pack the live server is using" style={{ opacity: serverBusy ? 0.6 : 1 }}>{serverBusy ? 'Fetching…' : '⭳ Server pack'}</button>
        <button className="rp-btn sm active" onClick={() => fileInputRef.current?.click()}>{fileCount > 0 ? 'Load new' : 'Open .zip'}</button>
        <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Tabs */}
      {fileCount > 0 && analysis && (
        <div className="rp-tabs">
          {PRIMARY_TABS.map((t) => (
            <div key={t.id} className={`rp-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.badge != null && t.badge > 0 && <span className={`tabnum${t.id === 'report' && (analysis?.summary.errors ?? 0) > 0 ? ' err' : ''}`}>{t.badge}</span>}
            </div>
          ))}
          <MoreTabs items={MORE_TABS} tab={tab} setTab={setTab} />
        </div>
      )}

      {/* Body */}
      <div className="rp-body">
        {fileCount === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}
            onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}>
            <div style={{ width: '100%', maxWidth: 560 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div className="rp-label" style={{ marginBottom: 14 }}>JOÐcraft · Resource Pack Assay</div>
                <div className="rp-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: 'var(--ink)', lineHeight: 1.05, marginBottom: 14 }}>
                  Find what’s broken.<br />Prove what’s safe to remove.
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>
                  A Minecraft-accurate dependency analyser. It resolves your parent chains, blockstates, item definitions,
                  atlases and datapacks — then shows its work on every verdict, so nothing it flags can break your pack.
                </div>
              </div>
              <Glass className={`rp-drop${dragging ? ' drag' : ''}`} onClick={() => fileInputRef.current?.click()}>
                <div style={{ fontSize: 30, marginBottom: 14, color: 'var(--accent)' }}>◫</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginBottom: 6 }}>Drop your resource pack .zip</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginBottom: 18 }}>or click to browse · analysed locally in your browser, nothing is uploaded</div>
                <span className="rp-btn primary">Choose file</span>
              </Glass>

              {/* Or pull the pack the live server is running. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 4px 0' }}>
                <span style={{ height: 1, flex: 1, background: 'var(--hair)' }} />
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>or</span>
                <span style={{ height: 1, flex: 1, background: 'var(--hair)' }} />
              </div>
              <button className="rp-btn" disabled={serverBusy} onClick={loadFromServer}
                style={{ width: '100%', justifyContent: 'center', marginTop: 14, padding: '13px 16px', fontSize: '0.82rem', gap: 9, opacity: serverBusy ? 0.7 : 1, cursor: serverBusy ? 'default' : 'pointer' }}>
                {serverBusy ? <><span className="rp-spin" style={{ width: 14, height: 14, borderWidth: 2 }} /> Fetching from server…</> : <>⭳ Use the JOÐcraft server pack</>}
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.64rem', color: 'var(--ink-faint)', marginTop: 10, lineHeight: 1.6 }}>
                Pulls the live pack from <b style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>play.jodcraft.world</b> — then view, edit, and export it here.
              </div>
              {serverError && (
                <div role="alert" style={{ marginTop: 14, padding: '10px 13px', borderRadius: 8, border: '1px solid var(--sev-error)', background: 'rgba(var(--bg-rgb),0.45)', color: 'var(--sev-error)', fontSize: '0.68rem', lineHeight: 1.55 }}>
                  {serverError}
                </div>
              )}
            </div>
          </div>
        ) : analysis ? (
          <>
            {tab === 'overview' && <OverviewView analysis={analysis} packName={packName} onGo={setTab} />}
            {tab === 'report' && <ReportView analysis={analysis} fileData={fileDataRef.current} onOpen={openInEditor} onApplyFix={applyFix} onApplyManyFixes={applyManyFixes} onDelete={deleteFiles} onExport={exportReport} />}
            {tab === 'assets' && <AssetsView analysis={analysis} fileData={fileDataRef.current} onOpen={openInEditor} onDelete={deleteFiles} />}
            {tab === 'textures' && <TexturesView analysis={analysis} fileData={fileDataRef.current} revision={revision} onSaveTexture={saveTextureAt} onAddOverlay={addOverlayLayer} onRemoveOverlay={removeOverlayLayer} onOpenInEditor={openInEditor} />}
            {tab === 'graph' && <GraphView analysis={analysis} onOpen={openInEditor} />}
            {tab === 'datapacks' && <DatapacksView analysis={analysis} onAddDatapacks={addDatapacks} onOpen={openInEditor} />}
            {tab === 'diff' && <PackDiffView fileDataA={fileDataRef.current} filePathsA={filePaths} />}
            {tab === 'discs' && <DiscsView fileData={fileDataRef.current} filePaths={filePaths} onUpdateFiles={updateFiles} onDeleteFiles={deleteFiles} onOpenInEditor={openInEditor} />}
            {tab === 'editor' && (
              <EditorPane
                tree={tree} selected={selected} selectedContent={selectedContent}
                editorTab={editorTab} setEditorTab={setEditorTab} openInEditor={openInEditor}
                renameFile={renameFile} isImage={isImage} isAudio={isAudio} isMeta={isMeta} isJson={isJson}
                fileData={fileDataRef.current} filePaths={filePaths} revision={revision}
                updateContent={updateContent} saveTexture={saveTexture}
                painting3dTex={painting3dTex} setPainting3dTex={setPainting3dTex}
                onSave3d={(p: string, d: string) => { fileDataRef.current[p] = d; setRevision((r) => r + 1); setStatus(`Saved ${p.split('/').pop()}`); }}
              />
            )}
          </>
        ) : null}
      </div>

      {/* Status bar */}
      <div className="rp-status">
        <span>{status}</span>
        {fileCount > 0 && analysis && <>
          <span><b>{fileCount}</b> files</span>
          <span><b>{analysis.summary.textures}</b> textures</span>
          {analysis.summary.errors > 0 && <span style={{ color: 'var(--sev-error)' }}><b>{analysis.summary.errors}</b> errors</span>}
          {analysis.summary.safeRemove > 0 && <span style={{ color: 'var(--sev-warning)' }}><b>{analysis.summary.safeRemove}</b> removable</span>}
          <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }}>{analysis.meta.versionLabel}</span>
        </>}
      </div>
    </div>
  );
}

// ── "More" tab dropdown — secondary destinations, one click away ──────────────
function MoreTabs({ items, tab, setTab }: {
  items: Array<{ id: string; label: string; hint?: string }>;
  tab: string; setTab: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  const active = items.find((t) => t.id === tab);
  return (
    <div ref={ref} className="rp-more">
      <div className={`rp-tab${active ? ' active' : ''}`} onClick={() => setOpen((o) => !o)}>
        {active ? active.label : 'More'} <span style={{ fontSize: 8 }}>▾</span>
      </div>
      {open && (
        <div className="rp-more-menu rp-rise">
          {items.map((t) => (
            <div key={t.id} className={`rp-more-item${tab === t.id ? ' active' : ''}`} onClick={() => { setTab(t.id); setOpen(false); }}>
              {t.label}
              {t.hint && <span className="hint">{t.hint}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Editor pane (tree + preview/paint/audio/json/meta/3d) ─────────────────────
function EditorPane({
  tree, selected, selectedContent, editorTab, setEditorTab, openInEditor, renameFile,
  isImage, isAudio, isMeta, isJson, fileData, filePaths, revision,
  updateContent, saveTexture, painting3dTex, setPainting3dTex, onSave3d,
}: any) {
  return (
    <div className="rp-editor-layout">
      <div className="rp-sidebar">
        <div className="rp-sidebar-title">Pack files · double-click to rename</div>
        <div className="rp-tree">
          {Object.entries(tree).sort(([, a], [, b]: any) => (typeof a === 'object' && a !== null ? -1 : 0) - (typeof b === 'object' && b !== null ? -1 : 0)).map(([k, v]) => (
            <TreeNode key={k} name={k} node={v} path="" depth={0} selected={selected} onSelect={openInEditor} onRename={renameFile} />
          ))}
        </div>
      </div>
      <div className="rp-center">
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 28 }}>◫</div><div>Select a file from the tree</div>
          </div>
        ) : (
          <>
            <div className="rp-tabbar">
              {isImage && <div className={`rp-subtab${editorTab === 'preview' ? ' active' : ''}`} onClick={() => setEditorTab('preview')}>Preview</div>}
              {isImage && <div className={`rp-subtab${editorTab === 'paint' ? ' active' : ''}`} onClick={() => setEditorTab('paint')}>✏ Paint</div>}
              {isAudio && <div className={`rp-subtab${editorTab === 'audio' ? ' active' : ''}`} onClick={() => setEditorTab('audio')}>♪ Audio</div>}
              {isMeta && <div className={`rp-subtab${editorTab === 'meta' ? ' active' : ''}`} onClick={() => setEditorTab('meta')}>Form</div>}
              {(isJson || isMeta) && <div className={`rp-subtab${editorTab === 'editor' ? ' active' : ''}`} onClick={() => setEditorTab('editor')}>JSON</div>}
              {isJson && <div className={`rp-subtab${editorTab === '3d' ? ' active' : ''}`} onClick={() => setEditorTab('3d')}>◈ 3D View</div>}
              {!isImage && !isAudio && !isJson && !isMeta && <div className={`rp-subtab${editorTab === 'editor' ? ' active' : ''}`} onClick={() => setEditorTab('editor')}>Raw</div>}
              <div style={{ padding: '8px 12px', fontSize: '0.65rem', color: 'var(--ink-faint)', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.split('/').slice(-2).join('/')}</div>
            </div>
            {editorTab === '3d' && isJson ? (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '12px 16px' }}>
                  <ModelViewer3D modelContent={selectedContent ?? ''} fileData={fileData} texturePaths={filePaths.filter((p: string) => IMG.test(p))} revision={revision} onSelectTexture={setPainting3dTex} />
                </div>
                {painting3dTex ? (
                  <div style={{ width: 300, borderLeft: '1px solid var(--hair)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <img src={fileData[painting3dTex]} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain', border: '1px solid var(--hair)' }} alt="" />
                      <span style={{ flex: 1, fontSize: '0.62rem', color: 'var(--sev-info)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✏ {painting3dTex.split('/').pop()}</span>
                      <button className="rp-btn sm" onClick={() => setPainting3dTex(null)}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: 12, minHeight: 0 }}>
                      <PixelPainter compact dataUrl={fileData[painting3dTex]} onSave={(d: string) => onSave3d(painting3dTex, d)} />
                    </div>
                  </div>
                ) : (
                  <div style={{ width: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: '0.7rem', padding: 20, textAlign: 'center', flexShrink: 0, borderLeft: '1px solid var(--hair)' }}>
                    <div><div style={{ fontSize: 26, marginBottom: 8, color: 'var(--hair-strong)' }}>◈</div>Click a texture below the 3D view to paint it</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rp-editarea">
                {editorTab === 'preview' && isImage && <div><img src={selectedContent} style={{ imageRendering: 'pixelated', border: '1px solid var(--hair)', borderRadius: 8, maxWidth: '100%' }} alt={selected} /><div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--ink-faint)' }}>Switch to ✏ Paint to edit pixels</div></div>}
                {editorTab === 'paint' && isImage && <PixelPainter dataUrl={selectedContent} onSave={saveTexture} />}
                {editorTab === 'audio' && isAudio && <AudioPlayer dataUrl={selectedContent} name={selected.split('/').pop()} />}
                {editorTab === 'meta' && isMeta && <PackMetaEditor content={selectedContent} onChange={updateContent} />}
                {editorTab === 'editor' && (isJson || isMeta) && <JsonEditor content={selectedContent} onChange={updateContent} />}
                {editorTab === 'editor' && !isJson && !isMeta && !isImage && !isAudio && (
                  selectedContent?.startsWith('data:application/octet-stream')
                    ? <div style={{ padding: 20, fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.7 }}>
                        Binary file — kept as-is and included unchanged when you export the pack.
                      </div>
                    : <textarea className="rp-code" value={selectedContent || ''} onChange={(e) => updateContent(e.target.value)} spellCheck={false} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
