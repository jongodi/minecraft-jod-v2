'use client';

import { useEffect, useState, useRef, useCallback, type FormEvent, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { DatapackUpdateResult } from '@/app/api/datapacks/check-updates/route';
import type { RefreshResult } from '@/app/api/admin/datapacks/refresh/route';
import type { GalleryPhoto } from '@/lib/gallery';
import type { MapConfig } from '@/lib/map-types';
import dynamic from 'next/dynamic';

const AdminMapEditor = dynamic(() => import('@/components/AdminMapEditor'), { ssr: false });

// ─── Shared styles ────────────────────────────────────────────────────────────

const mono = "'JetBrains Mono', monospace";
const sans = "'Space Grotesk', sans-serif";
const green = '#00ff41';
const card  = { background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1.5rem' };

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.75rem' }}>
      <p style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.3em', color: green, marginBottom: '0.25rem', textTransform: 'uppercase' }}>{sub}</p>
      <h2 style={{ fontFamily: sans, fontSize: '1.4rem', fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.02em' }}>{label}</h2>
    </div>
  );
}

function StatusPill({ status }: { status: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown' }) {
  const colors: Record<string, string> = {
    online: green, offline: '#ff4466', starting: '#f0a500', stopping: '#f0a500', unknown: '#444',
  };
  const c = colors[status] ?? '#444';
  return (
    <span style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: c, background: c + '18', border: `1px solid ${c}33`, padding: '0.2rem 0.6rem', textTransform: 'uppercase' }}>
      ● {status}
    </span>
  );
}

// ─── Server Control ───────────────────────────────────────────────────────────

interface ExarotonServer {
  name: string; status: number; players?: { count: number; max: number };
  ram?: number; address?: string;
}

const STATUS_LABELS: Record<number, 'online' | 'offline' | 'starting' | 'stopping' | 'unknown'> = {
  0: 'offline', 1: 'online', 2: 'starting', 3: 'stopping', 4: 'starting', 5: 'offline', 6: 'starting', 7: 'offline',
};

function ServerControlSection() {
  const [info,     setInfo]     = useState<ExarotonServer | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [actMsg,   setActMsg]   = useState('');
  const [acting,   setActing]   = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/server/info');
      if (res.ok) setInfo(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  async function doAction(action: string) {
    setActing(action);
    setActMsg('');
    try {
      const res = await fetch(`/api/admin/server/${action}`, { method: 'POST' });
      const data = await res.json() as { ok?: boolean; error?: string };
      setActMsg(data.ok ? `✓ ${action} command sent` : `✗ ${data.error}`);
      setTimeout(() => fetchInfo(), 3000);
    } catch {
      setActMsg('Network error');
    } finally {
      setActing(null);
    }
  }

  const status = info ? (STATUS_LABELS[info.status] ?? 'unknown') : 'unknown';

  return (
    <div style={card}>
      <SectionHeader label="SERVER CONTROL" sub="Exaroton" />
      {loading ? (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#444' }}>Loading server info...</p>
      ) : info ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <StatusPill status={status} />
            {info.players && (
              <span style={{ fontFamily: mono, fontSize: '0.65rem', color: '#555' }}>
                {info.players.count}/{info.players.max} players
              </span>
            )}
            {info.ram && (
              <span style={{ fontFamily: mono, fontSize: '0.65rem', color: '#555' }}>
                {info.ram} MB RAM
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['start', 'stop', 'restart'] as const).map(action => (
              <button
                key={action}
                onClick={() => doAction(action)}
                disabled={!!acting}
                style={{
                  fontFamily:    mono,
                  fontSize:      '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding:       '0.5rem 1rem',
                  cursor:        acting ? 'not-allowed' : 'pointer',
                  border:        '1px solid',
                  background:    'transparent',
                  color:         action === 'start' ? green : action === 'stop' ? '#ff4466' : '#f0a500',
                  borderColor:   action === 'start' ? green + '44' : action === 'stop' ? '#ff446644' : '#f0a50044',
                  opacity:       acting && acting !== action ? 0.4 : 1,
                  transition:    'opacity 0.2s',
                }}
              >
                {acting === action ? '...' : action}
              </button>
            ))}
            <button
              onClick={fetchInfo}
              style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}
            >
              REFRESH
            </button>
          </div>

          {actMsg && (
            <p style={{ fontFamily: mono, fontSize: '0.65rem', color: actMsg.startsWith('✓') ? green : '#ff4466' }}>
              {actMsg}
            </p>
          )}
        </div>
      ) : (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#ff4466' }}>
          Could not load server info. Check EXAROTON_API_KEY.
        </p>
      )}
    </div>
  );
}

// ─── Datapack Updates ─────────────────────────────────────────────────────────

function DatapacksSection() {
  const [results,  setResults]  = useState<DatapackUpdateResult[] | null>(null);
  const [loading,  setLoading]  = useState(false);

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/datapacks/check-updates');
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  const updates = results?.filter(r => r.updateAvailable) ?? [];

  return (
    <div style={card}>
      <SectionHeader label="DATAPACK UPDATES" sub="Modrinth · GitHub" />

      {loading && <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#444' }}>Checking for updates...</p>}

      {updates.length > 0 && (
        <div style={{ background: '#f0a50010', border: '1px solid #f0a50030', padding: '0.6rem 0.8rem', marginBottom: '1rem', fontFamily: mono, fontSize: '0.6rem', color: '#f0a500' }}>
          {updates.length} update{updates.length !== 1 ? 's' : ''} available
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {results.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #111', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#333', width: '1.2rem', flexShrink: 0 }}>
                {String(r.id).padStart(2,'0')}
              </span>
              <span style={{ fontFamily: sans, fontSize: '0.85rem', fontWeight: 600, color: '#ccc', flex: 1, minWidth: '120px' }}>
                {r.name}
              </span>
              <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#333', minWidth: '60px' }}>
                {r.currentVersion ? `v${r.currentVersion}` : '—'}
              </span>
              {r.source === 'manual' ? (
                <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#2a2a2a', letterSpacing: '0.1em' }}>MANUAL</span>
              ) : r.updateAvailable ? (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#f0a500' }}>→ v{r.latestVersion}</span>
                  {r.downloadUrl && (
                    <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: mono, fontSize: '0.5rem', color: '#f0a500', border: '1px solid #f0a50044', padding: '0.15rem 0.4rem', textDecoration: 'none', letterSpacing: '0.1em' }}>
                      ↓ DL
                    </a>
                  )}
                  {r.modrinthUrl && (
                    <a href={r.modrinthUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555', border: '1px solid #2a2a2a', padding: '0.15rem 0.4rem', textDecoration: 'none', letterSpacing: '0.1em' }}>
                      MR →
                    </a>
                  )}
                </div>
              ) : r.latestVersion ? (
                <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#00ff4144', letterSpacing: '0.1em' }}>✓ UP TO DATE</span>
              ) : r.error ? (
                <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#ff446666' }} title={r.error}>CHECK FAILED</span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchUpdates}
        disabled={loading}
        style={{ marginTop: '1rem', fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.4rem 0.8rem', cursor: loading ? 'not-allowed' : 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}
      >
        {loading ? 'CHECKING...' : 'REFRESH'}
      </button>
    </div>
  );
}

// ─── Add Custom Pack Modal ────────────────────────────────────────────────────

const PACK_CATEGORIES = ['BUILD', 'COMBAT', 'SURVIVAL', 'QOL', 'STRUCTURE', 'SOCIAL', 'LOOT', 'TRADE', 'CRAFT', 'WORLD'];

function AddPackModal({ filename, onClose, onSaved }: { filename: string; onClose: () => void; onSaved: () => void }) {
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [category,   setCategory]   = useState('QOL');
  const [source,     setSource]     = useState<'modrinth' | 'github' | 'manual'>('modrinth');
  const [slug,       setSlug]       = useState('');
  const [repo,       setRepo]       = useState('');
  const [gameVer,    setGameVer]    = useState('26.1');
  const [serverFile, setServerFile] = useState(filename);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/datapacks/custom', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description: desc, category, source,
          modrinthSlug: source === 'modrinth' ? slug : undefined,
          githubRepo:   source === 'github'   ? repo : undefined,
          gameVersion: gameVer,
          serverFile:  serverFile || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
      onSaved();
    } catch { setError('Network error'); }
    finally   { setSaving(false); }
  }

  const inp: CSSProperties = { background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.7rem', padding: '0.4rem 0.6rem', outline: 'none', width: '100%' };
  const lbl: CSSProperties = { fontFamily: mono, fontSize: '0.5rem', color: '#444', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' };
  const row: CSSProperties = { marginBottom: '0.85rem' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '1.75rem', width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.75rem' }}>
          <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.3em', color: green, marginBottom: '0.25rem' }}>NEW DATAPACK</p>
          <h2 style={{ fontFamily: sans, fontSize: '1.2rem', fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.02em', margin: 0 }}>Add custom pack</h2>
          <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', marginTop: '0.4rem', wordBreak: 'break-all' }}>{filename}</p>
        </div>
        <form onSubmit={submit}>
          <div style={row}>
            <label style={lbl}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inp} placeholder="Herobrine DP" />
          </div>
          <div style={row}>
            <label style={lbl}>Description *</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} required style={inp} placeholder="One sentence description" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {PACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Source *</label>
              <select value={source} onChange={e => setSource(e.target.value as typeof source)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="modrinth">Modrinth</option>
                <option value="github">GitHub</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          {source === 'modrinth' && (
            <div style={row}>
              <label style={lbl}>Modrinth slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} style={inp} placeholder="my-datapack-slug" />
            </div>
          )}
          {source === 'github' && (
            <div style={row}>
              <label style={lbl}>GitHub repo</label>
              <input value={repo} onChange={e => setRepo(e.target.value)} style={inp} placeholder="owner/repo" />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Game version</label>
              <input value={gameVer} onChange={e => setGameVer(e.target.value)} style={inp} placeholder="26.1" />
            </div>
            <div style={{ flex: 2 }}>
              <label style={lbl}>Server file identifier</label>
              <input value={serverFile} onChange={e => setServerFile(e.target.value)} style={inp} />
            </div>
          </div>
          <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#2a2a2a', marginBottom: '1rem', lineHeight: 1.6 }}>
            Trim server file to the distinctive part before the version — e.g. &quot;Herobrine DP&quot; from &quot;Herobrine DP 1.21.9 - 26.1.2 v7.3.3&quot;
          </p>
          {error && <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#ff4466', marginBottom: '0.75rem' }}>✗ {error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving} style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: saving ? 'not-allowed' : 'pointer', border: `1px solid ${green}44`, background: green + '18', color: green }}>
              {saving ? 'SAVING...' : 'ADD PACK'}
            </button>
            <button type="button" onClick={onClose} style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}>
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Datapack Version Manager ─────────────────────────────────────────────────

interface PackVersionRow { id: number; name: string; source: string; currentVersion: string | null; isOverridden: boolean; isCustom?: boolean }

function DatapackVersionsSection() {
  const [packs,      setPacks]      = useState<PackVersionRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [edits,      setEdits]      = useState<Record<number, string>>({});
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState<RefreshResult | null>(null);
  const [syncError,  setSyncError]  = useState('');
  const [addingFor,  setAddingFor]  = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/datapacks');
      if (res.ok) {
        const data = await res.json() as PackVersionRow[];
        setPacks(data);
        const initial: Record<number, string> = {};
        data.forEach(p => { initial[p.id] = p.currentVersion ?? ''; });
        setEdits(initial);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPacks(); }, [fetchPacks]);

  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/datapacks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versions: Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, v])) }),
      });
      setMsg(res.ok ? '✓ Versions saved — update checker will use these next run' : '✗ Save failed');
      if (res.ok) fetchPacks();
    } catch { setMsg('✗ Network error'); }
    finally   { setSaving(false); }
  }

  async function sync() {
    setSyncing(true); setSyncResult(null); setSyncError('');
    try {
      const res  = await fetch('/api/admin/datapacks/refresh', { method: 'POST' });
      const data = await res.json() as RefreshResult & { error?: string };
      if (!res.ok) { setSyncError(data.error ?? 'Sync failed'); }
      else         { setSyncResult(data); await fetchPacks(); }
    } catch { setSyncError('Network error'); }
    finally  { setSyncing(false); }
  }

  const hasChanges = packs.some(p => (edits[p.id] ?? '') !== (p.currentVersion ?? ''));

  return (
    <div style={card}>
      <SectionHeader label="DATAPACK VERSIONS" sub="Installed versions" />
      <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Edit the installed version for each pack. The update checker uses these values to detect when a newer version is available on Modrinth or GitHub.
      </p>

      {loading ? <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#444' }}>Loading...</p> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {packs.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 0', borderBottom: '1px solid #111', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#2a2a2a', width: '1.5rem', flexShrink: 0 }}>{String(p.id).padStart(2,'0')}</span>
                <span style={{ fontFamily: sans, fontSize: '0.85rem', fontWeight: 600, color: '#ccc', flex: 1, minWidth: '140px' }}>{p.name}</span>
                <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#2a2a2a', width: '60px', letterSpacing: '0.1em' }}>{p.source.toUpperCase()}</span>
                <input
                  value={edits[p.id] ?? ''}
                  onChange={e => setEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder="e.g. 1.2.3"
                  style={{
                    background:  '#0d0d0d',
                    border:      `1px solid ${edits[p.id] !== (p.currentVersion ?? '') ? '#f0a50055' : '#1a1a1a'}`,
                    color:       '#f0f0f0',
                    fontFamily:  mono,
                    fontSize:    '0.65rem',
                    padding:     '0.25rem 0.5rem',
                    outline:     'none',
                    width:       '110px',
                    letterSpacing: '0.05em',
                  }}
                />
                {p.isOverridden && (
                  <span style={{ fontFamily: mono, fontSize: '0.45rem', color: '#f0a500', letterSpacing: '0.1em' }}>OVERRIDDEN</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={sync}
              disabled={syncing || saving}
              style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: syncing || saving ? 'not-allowed' : 'pointer', border: '1px solid #4ecdc444', background: 'transparent', color: '#4ecdc4', transition: 'all 0.2s' }}
            >
              {syncing ? 'SYNCING...' : 'SYNC FROM SERVER'}
            </button>
            <button
              onClick={save}
              disabled={saving || !hasChanges}
              style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: saving || !hasChanges ? 'not-allowed' : 'pointer', border: `1px solid ${green}44`, background: hasChanges ? green + '18' : 'transparent', color: hasChanges ? green : '#333', transition: 'all 0.2s' }}
            >
              {saving ? 'SAVING...' : 'SAVE VERSIONS'}
            </button>
            {msg && <span style={{ fontFamily: mono, fontSize: '0.6rem', color: msg.startsWith('✓') ? green : '#ff4466' }}>{msg}</span>}
          </div>

          {syncError && (
            <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#ff4466', marginTop: '0.75rem' }}>
              ✗ {syncError}
            </p>
          )}
          {syncResult && (
            <div style={{ marginTop: '0.75rem', border: '1px solid #1a2a1a', background: '#0a120a', padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.6rem', color: green, marginBottom: '0.5rem' }}>
                ✓ Scanned {syncResult.scanned.length} file{syncResult.scanned.length !== 1 ? 's' : ''} — {syncResult.updated} version{syncResult.updated !== 1 ? 's' : ''} updated, {syncResult.matched.length} matched, {syncResult.unmatched.length} unrecognised
              </p>
              {syncResult.matched.map(m => (
                <div key={m.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.2rem 0', fontFamily: mono, fontSize: '0.55rem' }}>
                  <span style={{ color: '#2a2a2a', width: '1.5rem', flexShrink: 0 }}>{String(m.id).padStart(2, '0')}</span>
                  <span style={{ color: '#888', flex: 1 }}>{m.name}</span>
                  {m.version
                    ? <span style={{ color: green }}>v{m.version}</span>
                    : <span style={{ color: '#333' }}>detected — set version manually</span>}
                </div>
              ))}
              {syncResult.unmatched.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1a1a1a', paddingTop: '0.5rem' }}>
                  <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#444', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>UNRECOGNISED</p>
                  {syncResult.unmatched.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                      <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', flex: 1, wordBreak: 'break-all' }}>{f}</span>
                      <button
                        onClick={() => setAddingFor(f)}
                        style={{ fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#555', flexShrink: 0 }}
                      >
                        + ADD
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {addingFor && (
        <AddPackModal
          filename={addingFor}
          onClose={() => setAddingFor(null)}
          onSaved={() => {
            setAddingFor(null);
            fetchPacks();
            // Remove the newly-added filename from the unrecognised list
            setSyncResult(prev => prev
              ? { ...prev, unmatched: prev.unmatched.filter(f => f !== addingFor) }
              : prev
            );
          }}
        />
      )}
    </div>
  );
}

// ─── Gallery Manager ──────────────────────────────────────────────────────────

function GalleryManagerSection() {
  const [photos,      setPhotos]      = useState<GalleryPhoto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dragId,      setDragId]      = useState<string | null>(null);
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editTitle,   setEditTitle]   = useState('');
  const [editSublabel,setEditSublabel]= useState('');
  const [uploading,   setUploading]   = useState(false);
  const [statusMsg,   setStatusMsg]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gallery');
      if (res.ok) setPhotos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  async function toggleActive(photo: GalleryPhoto) {
    const res = await fetch(`/api/admin/gallery/${photo.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !photo.active }),
    });
    if (res.ok) setPhotos(ps => ps.map(p => p.id === photo.id ? { ...p, active: !p.active } : p));
    else setStatusMsg('✗ Failed to update — try again');
  }

  async function saveTitle(photo: GalleryPhoto) {
    const res = await fetch(`/api/admin/gallery/${photo.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: editTitle.toUpperCase(), sublabel: editSublabel.toUpperCase() }),
    });
    if (res.ok) {
      setPhotos(ps => ps.map(p => p.id === photo.id ? { ...p, title: editTitle.toUpperCase(), sublabel: editSublabel.toUpperCase() } : p));
      setEditingId(null);
      setStatusMsg('✓ Title saved');
    } else {
      setStatusMsg('✗ Failed to save title — try again');
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) setPhotos(ps => ps.filter(p => p.id !== id));
    else setStatusMsg('✗ Failed to delete — try again');
  }

  // Drag-and-drop reorder
  function onDragStart(id: string) { setDragId(id); }
  function onDragOver(e: React.DragEvent, id: string) { e.preventDefault(); setDragOverId(id); }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ordered = [...photos].sort((a, b) => a.order - b.order);
    const fromIdx = ordered.findIndex(p => p.id === dragId);
    const toIdx   = ordered.findIndex(p => p.id === targetId);
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    const newPhotos = ordered.map((p, i) => ({ ...p, order: i + 1 }));
    setPhotos(newPhotos);
    setDragId(null);
    setDragOverId(null);
    const res = await fetch('/api/admin/gallery/reorder', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids: newPhotos.map(p => p.id) }),
    });
    if (!res.ok) setStatusMsg('✗ Failed to save order — try again');
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatusMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', 'NEW SCREENSHOT');
    fd.append('sublabel', '');
    try {
      const res = await fetch('/api/admin/gallery/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const p = await res.json() as GalleryPhoto;
        setPhotos(ps => [...ps, p]);
        setStatusMsg('✓ Photo uploaded');
      } else {
        const err = await res.json() as { error: string };
        setStatusMsg(`✗ ${err.error}`);
      }
    } catch {
      setStatusMsg('✗ Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const sorted = [...photos].sort((a, b) => a.order - b.order);

  return (
    <div style={card}>
      <SectionHeader label="GALLERY MANAGER" sub="Photos" />

      {/* Upload */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} id="gallery-upload" />
        <label
          htmlFor="gallery-upload"
          style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.5rem 1rem', cursor: uploading ? 'not-allowed' : 'pointer', border: `1px solid ${green}44`, color: green, background: green + '08' }}
        >
          {uploading ? 'UPLOADING...' : '+ UPLOAD PHOTO'}
        </label>
        {statusMsg && <span style={{ fontFamily: mono, fontSize: '0.6rem', color: statusMsg.startsWith('✓') ? green : '#ff4466' }}>{statusMsg}</span>}
        <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#333', marginLeft: 'auto' }}>
          {photos.filter(p => p.active).length}/{photos.length} active · drag to reorder
        </span>
      </div>

      {loading ? (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#444' }}>Loading photos...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {sorted.map(photo => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => onDragStart(photo.id)}
              onDragOver={e => onDragOver(e, photo.id)}
              onDrop={() => onDrop(photo.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              style={{
                border:     `1px solid ${dragOverId === photo.id ? green : '#1a1a1a'}`,
                background: '#111',
                opacity:    photo.active ? 1 : 0.45,
                cursor:     'grab',
                transition: 'border-color 0.15s, opacity 0.2s',
                position:   'relative',
              }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: '#080808' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.filename} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {!photo.active && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#666', background: '#0008', padding: '0.2rem 0.5rem' }}>HIDDEN</span>
                  </div>
                )}
                {/* Order badge */}
                <span style={{ position: 'absolute', top: '0.3rem', left: '0.3rem', fontFamily: mono, fontSize: '0.45rem', color: '#666', background: '#0008', padding: '0.1rem 0.3rem' }}>
                  #{photo.order}
                </span>
              </div>

              {/* Info / edit */}
              <div style={{ padding: '0.6rem' }}>
                {editingId === photo.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Title"
                      style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.6rem', padding: '0.3rem 0.4rem', outline: 'none' }}
                    />
                    <input
                      value={editSublabel}
                      onChange={e => setEditSublabel(e.target.value)}
                      placeholder="Sublabel (e.g. NEW BASE)"
                      style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.6rem', padding: '0.3rem 0.4rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => saveTitle(photo)} style={{ flex: 1, fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', background: green + '22', color: green, border: `1px solid ${green}44`, padding: '0.25rem', cursor: 'pointer' }}>SAVE</button>
                      <button onClick={() => setEditingId(null)} style={{ fontFamily: mono, fontSize: '0.5rem', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontFamily: sans, fontSize: '0.75rem', fontWeight: 700, color: '#ccc', marginBottom: '0.1rem' }}>{photo.title}</p>
                    <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#444', marginBottom: '0.5rem' }}>{photo.sublabel || '—'}</p>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { setEditingId(photo.id); setEditTitle(photo.title); setEditSublabel(photo.sublabel); }}
                        style={{ fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.1em', background: 'none', color: '#444', border: '1px solid #222', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                      >EDIT</button>
                      <button
                        onClick={() => toggleActive(photo)}
                        style={{ fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.1em', background: photo.active ? '#ff446618' : green + '18', color: photo.active ? '#ff4466' : green, border: `1px solid ${photo.active ? '#ff446633' : green + '33'}`, padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                      >{photo.active ? 'HIDE' : 'SHOW'}</button>
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        style={{ fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.1em', background: 'none', color: '#3a1a1a', border: '1px solid #2a1010', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                      >DEL</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map Editor Section ───────────────────────────────────────────────────────

function MapEditorSection() {
  const [config,  setConfig]  = useState<MapConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/map')
      .then(r => r.ok ? r.json() : null)
      .then((cfg: MapConfig | null) => { if (cfg) setConfig(cfg); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={card}>
      <SectionHeader label="MAP EDITOR" sub="World locations & zones" />
      <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Drag pins to reposition them. Click a pin to edit its label, sublabel, and type. Drag zone ellipses to move them; drag the handles to resize. Click &quot;Save Map&quot; when done.
      </p>
      {loading ? (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#444' }}>Loading map...</p>
      ) : config ? (
        <AdminMapEditor initialConfig={config} />
      ) : (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#ff4466' }}>Failed to load map config.</p>
      )}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

type Tab = 'server' | 'datapacks' | 'versions' | 'gallery' | 'map';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('server');

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'server',    label: 'SERVER' },
    { id: 'datapacks', label: 'DATAPACKS' },
    { id: 'versions',  label: 'VERSIONS' },
    { id: 'gallery',   label: 'GALLERY' },
    { id: 'map',       label: 'MAP' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: mono }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 100 }}>
        <span style={{ fontFamily: sans, fontSize: '1rem', fontWeight: 900, color: green, letterSpacing: '-0.02em' }}>JOD</span>
        <span style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.3em', color: '#2a2a2a', textTransform: 'uppercase' }}>ADMIN PANEL</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', color: '#444', textDecoration: 'none', textTransform: 'uppercase' }}>← SITE</a>
        <button onClick={logout} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', color: '#ff4466', border: '1px solid #ff446633', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
          LOGOUT
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #1a1a1a', marginBottom: '2rem' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily:    mono,
                fontSize:      '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding:       '0.6rem 1.2rem',
                background:    'none',
                border:        'none',
                borderBottom:  `2px solid ${tab === t.id ? green : 'transparent'}`,
                color:         tab === t.id ? green : '#444',
                cursor:        'pointer',
                transition:    'color 0.2s, border-color 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'server'    && <ServerControlSection />}
        {tab === 'datapacks' && <DatapacksSection />}
        {tab === 'versions'  && <DatapackVersionsSection />}
        {tab === 'gallery'   && <GalleryManagerSection />}
        {tab === 'map'       && <MapEditorSection />}
      </div>
    </div>
  );
}
