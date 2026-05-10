'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { BG, BG2, BG3, BORDER, ACCENT, ACCENT2, DIM, TEXT, TEXT2, WARN, ERR } from '../rp-constants';

// ─── All vanilla music discs ──────────────────────────────────────────────────

// duration = vanilla track length in seconds (used to warn when upload is longer)
const VANILLA_DISCS = [
  { id: '13',               vanillaName: 'Music Disc',  vanillaDesc: 'C418 - 13',                         color: '#f97316', duration: 178 },
  { id: 'cat',              vanillaName: 'Music Disc',  vanillaDesc: 'C418 - cat',                        color: '#eab308', duration: 185 },
  { id: 'blocks',           vanillaName: 'Music Disc',  vanillaDesc: 'C418 - blocks',                     color: '#22c55e', duration: 345 },
  { id: 'chirp',            vanillaName: 'Music Disc',  vanillaDesc: 'C418 - chirp',                      color: '#f87171', duration: 185 },
  { id: 'far',              vanillaName: 'Music Disc',  vanillaDesc: 'C418 - far',                        color: '#6366f1', duration: 174 },
  { id: 'mall',             vanillaName: 'Music Disc',  vanillaDesc: 'C418 - mall',                       color: '#ec4899', duration: 197 },
  { id: 'mellohi',          vanillaName: 'Music Disc',  vanillaDesc: 'C418 - mellohi',                    color: '#8b5cf6', duration:  96 },
  { id: 'stal',             vanillaName: 'Music Disc',  vanillaDesc: 'C418 - stal',                       color: '#a78bfa', duration: 150 },
  { id: 'strad',            vanillaName: 'Music Disc',  vanillaDesc: 'C418 - strad',                      color: '#34d399', duration: 188 },
  { id: 'ward',             vanillaName: 'Music Disc',  vanillaDesc: 'C418 - ward',                       color: '#22d3ee', duration: 251 },
  { id: '11',               vanillaName: 'Music Disc',  vanillaDesc: 'C418 - 11',                         color: '#94a3b8', duration:  71 },
  { id: 'wait',             vanillaName: 'Music Disc',  vanillaDesc: 'C418 - wait',                       color: '#38bdf8', duration: 238 },
  { id: 'otherside',        vanillaName: 'Music Disc',  vanillaDesc: 'Lena Raine - otherside',            color: '#c084fc', duration: 195 },
  { id: '5',                vanillaName: 'Music Disc',  vanillaDesc: 'Samuel Åberg - 5',                  color: '#fb923c', duration: 178 },
  { id: 'pigstep',          vanillaName: 'Music Disc',  vanillaDesc: 'Lena Raine - Pigstep',              color: '#f472b6', duration: 148 },
  { id: 'relic',            vanillaName: 'Music Disc',  vanillaDesc: 'Aaron Cherof - Relic',              color: '#a3e635', duration: 218 },
  { id: 'precipice',        vanillaName: 'Music Disc',  vanillaDesc: 'Aaron Cherof - Precipice',          color: '#4ade80', duration: 299 },
  { id: 'creator',          vanillaName: 'Music Disc',  vanillaDesc: 'Lena Raine - Creator',              color: '#e879f9', duration: 176 },
  { id: 'creator_music_box',vanillaName: 'Music Disc',  vanillaDesc: 'Lena Raine - Creator (Music Box)',  color: '#f0abfc', duration:  74 },
  { id: 'tears',            vanillaName: 'Music Disc',  vanillaDesc: 'Lena Raine - Tears',                color: '#67e8f9', duration: 287 },
] as const;

type VanillaDiscId = typeof VANILLA_DISCS[number]['id'];
const VANILLA_IDS = new Set<string>(VANILLA_DISCS.map(d => d.id));

interface DiscDef {
  id: string;
  vanillaName: string;
  vanillaDesc: string;
  color: string;
  duration?: number; // vanilla track length in seconds; undefined for custom discs
  isCustom?: boolean;
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function detectAudioDuration(dataUrl: string): Promise<number | null> {
  return new Promise(resolve => {
    const audio = new Audio(dataUrl);
    const done = () => resolve(isFinite(audio.duration) ? audio.duration : null);
    audio.addEventListener('loadedmetadata', done, { once: true });
    audio.addEventListener('error', () => resolve(null), { once: true });
    // Fallback in case the event never fires
    setTimeout(() => resolve(null), 8000);
  });
}

// ─── Path / lang key helpers ──────────────────────────────────────────────────

const texPath    = (id: string) => `assets/minecraft/textures/item/music_disc_${id}.png`;
const modelPath  = (id: string) => `assets/minecraft/models/item/music_disc_${id}.json`;
const nameKey    = (id: string) => `item.minecraft.music_disc_${id}`;
const descKey    = (id: string) => `item.minecraft.music_disc_${id}.desc`;
const jukeKey    = (id: string) => `jukebox_song.minecraft.${id}`;
const sndKey     = (id: string) => `music_disc.${id}`;
const sndOggPath = (ref: string) => `assets/minecraft/sounds/${ref}.ogg`;

function getLangPath(fileData: Record<string,string>): string {
  return 'assets/minecraft/lang/en_us.json' in fileData
    ? 'assets/minecraft/lang/en_us.json'
    : 'assets/minecraft/lang/en_US.json';
}

function parseSoundsJson(fileData: Record<string,string>): Record<string,any> {
  const c = fileData['assets/minecraft/sounds.json'];
  if (!c) return {};
  try { return JSON.parse(c); } catch { return {}; }
}

function parseLangFile(fileData: Record<string,string>): Record<string,string> {
  for (const p of ['assets/minecraft/lang/en_us.json', 'assets/minecraft/lang/en_US.json']) {
    if (fileData[p]) { try { return JSON.parse(fileData[p]); } catch {} }
  }
  return {};
}

function getSoundRef(id: string, sounds: Record<string,any>): string | null {
  const entry = sounds[sndKey(id)];
  if (!entry?.sounds?.length) return null;
  const s = entry.sounds[0];
  return typeof s === 'string' ? s : (typeof s === 'object' ? s?.name ?? null : null);
}

function makeDiscModel(id: string): string {
  return JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: { layer0: `minecraft:item/music_disc_${id}` },
  }, null, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiscIcon({ color, size = 28, url }: { color: string; size?: number; url?: string | null }) {
  if (url) {
    return (
      <img src={url} alt=""
        style={{ width: size, height: size, imageRendering: 'pixelated', objectFit: 'contain', background: '#070910', flexShrink: 0 }}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx={50} cy={50} r={47} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={3}/>
      <circle cx={50} cy={50} r={38} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.3}/>
      <circle cx={50} cy={50} r={29} fill="none" stroke={color} strokeWidth={1}   strokeOpacity={0.2}/>
      <circle cx={50} cy={50} r={20} fill={color} fillOpacity={0.3}/>
      <circle cx={50} cy={50} r={8}  fill="#0d0f12"/>
    </svg>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${BORDER}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Fld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 9, color: DIM, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 9, color: DIM, marginTop: 3, letterSpacing: '0.5px' }}>{hint}</div>}
    </div>
  );
}

const inputCss = {
  width: '100%', background: BG3, border: `1px solid ${BORDER}`,
  color: TEXT, padding: '6px 8px', fontFamily: "'Courier New', monospace",
  fontSize: 12, outline: 'none',
} as const;

function TxtIn({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      style={{ ...inputCss, fontFamily: mono ? "'Courier New', monospace" : "'Courier New', monospace" }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = ACCENT; }}
      onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER; }}
    />
  );
}

function AddCustomDisc({ onAdd }: { onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [newId, setNewId] = useState('');

  const commit = () => {
    const v = newId.trim();
    if (v) { onAdd(v); setOpen(false); setNewId(''); }
  };

  if (!open) return (
    <button className="btn sm"
      style={{ width: '100%', textAlign: 'center', borderColor: `${ACCENT2}44`, color: ACCENT2 }}
      onClick={() => setOpen(true)}>
      + Custom Disc
    </button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        autoFocus
        value={newId}
        onChange={e => setNewId((e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
        placeholder="disc_id (a-z, 0-9, _)"
        style={{ ...inputCss, padding: '4px 8px', fontSize: 11, borderColor: ACCENT2 }}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setOpen(false); setNewId(''); }
        }}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn sm" style={{ flex: 1, borderColor: `${ACCENT}44`, color: ACCENT }} onClick={commit}>Create</button>
        <button className="btn sm" onClick={() => { setOpen(false); setNewId(''); }}>✕</button>
      </div>
    </div>
  );
}

function MiniPlayer({ url, label }: { url: string; label?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: BG3, border: `1px solid ${BORDER}` }}>
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} style={{ display: 'none' }}/>
      <button onClick={toggle}
        style={{ background: 'none', border: 'none', color: playing ? ACCENT : TEXT2, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>
        {playing ? '■' : '▶'}
      </button>
      <span style={{ fontSize: 10, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {label ?? 'sound file'}
      </span>
      {playing && (
        <span style={{ fontSize: 8, color: ACCENT, letterSpacing: '2px', animation: 'fadein 0.2s ease' }}>PLAYING</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DiscsViewProps {
  fileData:       Record<string, string>;
  filePaths:      string[];
  onUpdateFiles:  (updates: Record<string, string>) => void;
  onDeleteFiles:  (paths: string[]) => void;
  onOpenInEditor: (path: string) => void;
}

export default function DiscsView({ fileData, filePaths, onUpdateFiles, onDeleteFiles, onOpenInEditor }: DiscsViewProps) {
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState<'all' | 'overridden' | 'vanilla'>('all');

  // Per-disc edit state (reset when disc changes)
  const [editName,      setEditName]      = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [editJukeTitle, setEditJukeTitle] = useState('');
  const [editTexUrl,    setEditTexUrl]    = useState<string | null>(null);  // null = no pending change
  const [editSoundRef,      setEditSoundRef]      = useState('');                   // e.g. "records/custom_song"
  const [editSoundData,     setEditSoundData]     = useState<{ url: string; filename: string } | null>(null);
  const [editSoundDuration, setEditSoundDuration] = useState<number | null>(null); // detected duration of uploaded OGG
  const [saved,             setSaved]             = useState(false);

  const texInputRef   = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);

  // Derived pack state (memoised to avoid re-parsing on every render)
  const soundsJson = useMemo(() => parseSoundsJson(fileData), [fileData]);
  const langJson   = useMemo(() => parseLangFile(fileData),   [fileData]);

  // Full disc list = vanilla + any custom ones detected in pack
  const allDiscs = useMemo<DiscDef[]>(() => {
    const list: DiscDef[] = VANILLA_DISCS.map(d => ({ ...d }));
    for (const p of filePaths) {
      const m = p.match(/assets\/minecraft\/textures\/item\/music_disc_(.+?)\.png$/i);
      if (m && !VANILLA_IDS.has(m[1])) {
        list.push({ id: m[1], vanillaName: 'Music Disc', vanillaDesc: `Custom · ${m[1]}`, color: '#4ade80', isCustom: true, duration: undefined });
      }
    }
    return list;
  }, [filePaths]);

  // Override checks
  const hasTexture  = useCallback((id: string) => !!fileData[texPath(id)],          [fileData]);
  const hasSound    = useCallback((id: string) => !!soundsJson[sndKey(id)],          [soundsJson]);
  const hasLang     = useCallback((id: string) => !!(langJson[nameKey(id)] || langJson[descKey(id)] || langJson[jukeKey(id)]), [langJson]);
  const hasOverride = useCallback((id: string) => hasTexture(id) || hasSound(id) || hasLang(id), [hasTexture, hasSound, hasLang]);

  const overrideCount = useMemo(() => allDiscs.filter(d => hasOverride(d.id)).length, [allDiscs, hasOverride]);

  // Available .ogg files in the pack
  const availableOggs = useMemo(() =>
    filePaths
      .filter(p => p.endsWith('.ogg') && p.includes('assets/minecraft/sounds/'))
      .map(p => ({ path: p, ref: p.replace('assets/minecraft/sounds/', '').replace(/\.ogg$/i, '') })),
    [filePaths]
  );

  // Filtered list
  const filtered = useMemo(() => {
    let list = allDiscs;
    if (filter === 'overridden') list = list.filter(d => hasOverride(d.id));
    if (filter === 'vanilla')    list = list.filter(d => !hasOverride(d.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.id.toLowerCase().includes(q) || d.vanillaDesc.toLowerCase().includes(q) || (langJson[descKey(d.id)] ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allDiscs, filter, search, hasOverride, langJson]);

  // Select a disc and populate fields from current pack state
  const selectDisc = useCallback((id: string) => {
    setSelectedId(id);
    setSaved(false);
    setEditTexUrl(null);
    setEditSoundData(null);
    setEditSoundDuration(null);
    const disc = allDiscs.find(d => d.id === id);
    setEditName(langJson[nameKey(id)]  ?? disc?.vanillaName ?? 'Music Disc');
    setEditDesc(langJson[descKey(id)]  ?? disc?.vanillaDesc ?? '');
    setEditJukeTitle(langJson[jukeKey(id)] ?? '');
    setEditSoundRef(getSoundRef(id, soundsJson) ?? `records/${id}`);
  }, [allDiscs, langJson, soundsJson]);

  // Texture file upload
  const handleTexUpload = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => { setEditTexUrl(ev.target.result as string); setSaved(false); };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // Sound file upload — also detects duration asynchronously
  const handleSoundUpload = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const url = ev.target.result as string;
      const cleanName = f.name.replace(/\.ogg$/i, '').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
      setEditSoundData({ url, filename: cleanName });
      setEditSoundRef(`records/${cleanName}`);
      setEditSoundDuration(null);
      setSaved(false);
      detectAudioDuration(url).then(dur => setEditSoundDuration(dur));
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // Write all pending changes into the pack
  const applyChanges = useCallback(() => {
    if (!selectedId) return;
    const updates: Record<string, string> = {};
    const disc = allDiscs.find(d => d.id === selectedId);

    // 1. Texture
    if (editTexUrl) updates[texPath(selectedId)] = editTexUrl;

    // 2. Model — only needed for truly custom discs (vanilla models already exist in the game)
    if (disc?.isCustom && !fileData[modelPath(selectedId)]) {
      updates[modelPath(selectedId)] = makeDiscModel(selectedId);
    }

    // 3. Lang file
    const lp = getLangPath(fileData) || 'assets/minecraft/lang/en_us.json';
    const lang: Record<string,string> = { ...langJson };
    if (editName.trim())      lang[nameKey(selectedId)]  = editName.trim();
    if (editDesc.trim())      lang[descKey(selectedId)]  = editDesc.trim();
    if (editJukeTitle.trim()) lang[jukeKey(selectedId)]  = editJukeTitle.trim();
    updates[lp] = JSON.stringify(lang, null, 2);

    // 4. sounds.json — override the sound event
    const sndRef = editSoundRef.trim() || `records/${selectedId}`;
    const newSounds: Record<string,any> = { ...soundsJson };
    newSounds[sndKey(selectedId)] = { sounds: [{ name: sndRef, stream: true }] };
    updates['assets/minecraft/sounds.json'] = JSON.stringify(newSounds, null, 2);

    // 5. Uploaded .ogg
    if (editSoundData) {
      updates[sndOggPath(sndRef)] = editSoundData.url;
    }

    onUpdateFiles(updates);
    setSaved(true);
  }, [selectedId, allDiscs, editTexUrl, editName, editDesc, editJukeTitle, editSoundRef, editSoundData, fileData, langJson, soundsJson, onUpdateFiles]);

  // Remove all RP overrides for the selected disc
  const clearOverrides = useCallback(() => {
    if (!selectedId) return;
    if (!confirm(`Remove all resource pack overrides for disc "${selectedId}"? This will revert it to vanilla.`)) return;

    // Files to delete
    const toDelete: string[] = [];
    if (fileData[texPath(selectedId)])   toDelete.push(texPath(selectedId));
    if (fileData[modelPath(selectedId)]) toDelete.push(modelPath(selectedId));
    // Remove the sound file path if it's in the pack
    const sndRef = getSoundRef(selectedId, soundsJson);
    if (sndRef && fileData[sndOggPath(sndRef)]) toDelete.push(sndOggPath(sndRef));

    // Patch sounds.json and lang — remove this disc's entries
    const newSounds = { ...soundsJson };
    delete newSounds[sndKey(selectedId)];

    const lang = { ...langJson };
    delete lang[nameKey(selectedId)];
    delete lang[descKey(selectedId)];
    delete lang[jukeKey(selectedId)];

    const lp = getLangPath(fileData) || 'assets/minecraft/lang/en_us.json';
    const updates: Record<string,string> = {
      'assets/minecraft/sounds.json': JSON.stringify(newSounds, null, 2),
      [lp]: JSON.stringify(lang, null, 2),
    };

    onUpdateFiles(updates);
    if (toDelete.length > 0) onDeleteFiles(toDelete);

    // Re-load edit state to show vanilla defaults
    setTimeout(() => selectDisc(selectedId), 50);
  }, [selectedId, fileData, soundsJson, langJson, onUpdateFiles, onDeleteFiles, selectDisc]);

  // ─── Derived display values ─────────────────────────────────────────────────
  const disc           = selectedId ? (allDiscs.find(d => d.id === selectedId) ?? null) : null;
  const currentTexUrl  = editTexUrl ?? (selectedId ? (fileData[texPath(selectedId)] ?? null) : null);
  const curSoundRef    = selectedId ? getSoundRef(selectedId, soundsJson) : null;
  const curSoundUrl    = editSoundData?.url
    ?? (curSoundRef && fileData[sndOggPath(curSoundRef)] ? fileData[sndOggPath(curSoundRef)] : null);

  // Files that will be written on Apply
  const willWrite = useMemo(() => {
    if (!selectedId || !disc) return [];
    const items: { path: string; kind: string }[] = [];
    if (editTexUrl)                               items.push({ path: texPath(selectedId),                       kind: 'new' });
    if (disc.isCustom && !fileData[modelPath(selectedId)]) items.push({ path: modelPath(selectedId),            kind: 'generated' });
    const lp = getLangPath(fileData) || 'assets/minecraft/lang/en_us.json';
    items.push({ path: lp,                                                                                       kind: 'patch' });
    items.push({ path: 'assets/minecraft/sounds.json',                                                          kind: 'patch' });
    if (editSoundData) items.push({ path: sndOggPath(editSoundRef || `records/${selectedId}`),                  kind: 'new' });
    return items;
  }, [selectedId, disc, editTexUrl, editSoundData, editSoundRef, fileData]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left: disc list ── */}
      <div style={{ width: 244, flexShrink: 0, background: BG2, borderRight: `2px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            💿 Music Discs
            {overrideCount > 0 && <span style={{ color: ACCENT, background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`, padding: '1px 5px', fontSize: 9, letterSpacing: 0 }}>{overrideCount} overridden</span>}
          </div>
          <input
            value={search}
            onChange={e => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search discs…"
            style={{ ...inputCss, padding: '4px 8px', fontSize: 11, marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 3 }}>
            {(['all', 'overridden', 'vanilla'] as const).map(f => (
              <button key={f} className={`btn sm${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
                style={{ flex: 1, padding: '2px 0', fontSize: 9, textTransform: 'uppercase' }}>
                {f === 'all' ? `All (${allDiscs.length})` : f === 'overridden' ? `✓ ${overrideCount}` : 'Vanilla'}
              </button>
            ))}
          </div>
        </div>

        {/* Disc rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 12px', fontSize: 10, color: DIM, textAlign: 'center' }}>No discs match filter</div>
          )}
          {filtered.map(d => {
            const isSel  = selectedId === d.id;
            const over   = hasOverride(d.id);
            const hasTex = hasTexture(d.id);
            const hasSnd = hasSound(d.id);
            const hasLng = hasLang(d.id);
            return (
              <div key={d.id} onClick={() => selectDisc(d.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                  cursor: 'pointer',
                  background: isSel ? '#0a1a0a' : 'transparent',
                  borderLeft: `2px solid ${isSel ? ACCENT : 'transparent'}`,
                  borderBottom: `1px solid ${BORDER}22`,
                  transition: 'background 0.1s',
                }}>
                <DiscIcon color={d.color} size={24} url={fileData[texPath(d.id)] ?? null}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: isSel ? ACCENT : over ? TEXT : TEXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.id}{d.isCustom ? ' ✦' : ''}
                  </div>
                  <div style={{ fontSize: 9, color: DIM, display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {langJson[descKey(d.id)] ?? d.vanillaDesc}
                    </span>
                    {d.duration != null && (
                      <span style={{ flexShrink: 0, color: DIM, fontFamily: 'monospace', fontSize: 9 }}>{fmtDur(d.duration)}</span>
                    )}
                  </div>
                </div>
                {over && (
                  <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    {hasTex && <span title="Texture overridden" style={{ fontSize: 9, color: ACCENT2 }}>🎨</span>}
                    {hasSnd && <span title="Sound overridden"   style={{ fontSize: 9, color: ACCENT  }}>♪</span>}
                    {hasLng && <span title="Text overridden"    style={{ fontSize: 9, color: WARN    }}>T</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add custom */}
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <AddCustomDisc onAdd={id => selectDisc(id)}/>
        </div>
      </div>

      {/* ── Right: edit panel ── */}
      {!disc ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM, flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 56, opacity: 0.12 }}>💿</div>
          <div style={{ fontSize: 13 }}>Select a disc to edit</div>
          <div style={{ fontSize: 10, color: DIM, opacity: 0.5 }}>All 20 vanilla discs · custom discs in your pack</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26, paddingBottom: 18, borderBottom: `1px solid ${BORDER}` }}>
            <DiscIcon color={disc.color} size={64} url={currentTexUrl}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 2, letterSpacing: '-0.02em' }}>
                {editName || disc.vanillaName}
              </div>
              <div style={{ fontSize: 11, color: TEXT2 }}>{editDesc || disc.vanillaDesc}</div>
              {editJukeTitle && (
                <div style={{ fontSize: 10, color: ACCENT2, marginTop: 3 }}>♪ Now Playing: {editJukeTitle}</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {disc.isCustom && (
                  <span style={{ fontSize: 9, padding: '2px 7px', border: `1px solid ${ACCENT2}44`, color: ACCENT2, letterSpacing: '1px' }}>CUSTOM DISC</span>
                )}
                {hasOverride(disc.id) ? (
                  <span style={{ fontSize: 9, padding: '2px 7px', border: `1px solid ${ACCENT}44`, color: ACCENT, letterSpacing: '1px' }}>● OVERRIDDEN IN PACK</span>
                ) : (
                  <span style={{ fontSize: 9, padding: '2px 7px', border: `1px solid ${BORDER}`, color: DIM, letterSpacing: '1px' }}>○ VANILLA — no overrides yet</span>
                )}
                {saved && (
                  <span style={{ fontSize: 9, padding: '2px 7px', border: `1px solid ${ACCENT}`, color: ACCENT, letterSpacing: '1px', background: `${ACCENT}10` }}>✓ SAVED TO PACK</span>
                )}
              </div>
            </div>
          </div>

          {/* ── TEXTURE ── */}
          <Sec title="Disc Texture">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Preview box */}
              <div>
                <div style={{ width: 80, height: 80, background: '#070910', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {currentTexUrl
                    ? <img src={currentTexUrl} alt="" style={{ width: '100%', height: '100%', imageRendering: 'pixelated', objectFit: 'contain' }}/>
                    : <DiscIcon color={disc.color} size={66}/>}
                </div>
                <div style={{ fontSize: 8, color: DIM, marginTop: 3, textAlign: 'center', letterSpacing: '0.5px' }}>
                  {currentTexUrl ? (editTexUrl ? 'pending upload' : 'in pack') : 'vanilla'}
                </div>
              </div>
              {/* Controls */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, color: TEXT2, lineHeight: 1.5 }}>
                  {currentTexUrl
                    ? `Custom texture${editTexUrl ? ' (not yet saved)' : ' — in pack'}`
                    : 'No custom texture. The vanilla disc texture will show in-game.'}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn sm" style={{ borderColor: `${ACCENT2}55`, color: ACCENT2 }}
                    onClick={() => texInputRef.current?.click()}>
                    ↑ Upload PNG
                  </button>
                  {fileData[texPath(disc.id)] && (
                    <button className="btn sm" onClick={() => onOpenInEditor(texPath(disc.id))}>
                      ✏ Open in Pixel Painter
                    </button>
                  )}
                  {editTexUrl && (
                    <button className="btn sm danger" onClick={() => setEditTexUrl(null)}>✕ Remove pending</button>
                  )}
                </div>
                <input ref={texInputRef} type="file" accept=".png" style={{ display: 'none' }} onChange={handleTexUpload}/>
                <div style={{ fontSize: 9, color: DIM, fontFamily: 'monospace' }}>
                  → {texPath(disc.id)}
                </div>
              </div>
            </div>
          </Sec>

          {/* ── NAMES & TEXT ── */}
          <Sec title="Names & Display Text">
            <Fld label="Item display name" hint={`Lang key: ${nameKey(disc.id)}`}>
              <TxtIn value={editName} onChange={v => { setEditName(v); setSaved(false); }} placeholder={disc.vanillaName}/>
            </Fld>
            <Fld label="Tooltip / description (shown when holding the disc)" hint={`Lang key: ${descKey(disc.id)}`}>
              <TxtIn value={editDesc} onChange={v => { setEditDesc(v); setSaved(false); }} placeholder={disc.vanillaDesc}/>
            </Fld>
            <Fld
              label={`Jukebox "Now Playing" title (1.21+)`}
              hint={`Lang key: ${jukeKey(disc.id)} — leave blank to keep vanilla / not override`}>
              <TxtIn value={editJukeTitle} onChange={v => { setEditJukeTitle(v); setSaved(false); }} placeholder="e.g. Artist Name - Song Title"/>
            </Fld>
            <div style={{ fontSize: 10, color: DIM, background: BG3, padding: '7px 10px', border: `1px solid ${BORDER}`, lineHeight: 1.7 }}>
              All text is written to <span style={{ color: TEXT2 }}>{getLangPath(fileData) || 'assets/minecraft/lang/en_us.json'}</span>
              {!fileData[getLangPath(fileData)] && !fileData['assets/minecraft/lang/en_US.json'] && (
                <span style={{ color: WARN }}> · lang file will be created</span>
              )}
            </div>
          </Sec>

          {/* ── SOUND ── */}
          <Sec title="Sound / Music">

            {/* Duration info bar */}
            {disc.duration != null && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14, padding: '8px 12px', background: BG3, border: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: DIM, letterSpacing: '1px', textTransform: 'uppercase' }}>Vanilla length</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: ACCENT2, fontWeight: 700 }}>{fmtDur(disc.duration)}</span>
                </div>
                {editSoundDuration != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: DIM, letterSpacing: '1px', textTransform: 'uppercase' }}>Uploaded</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: editSoundDuration > disc.duration ? ERR : ACCENT }}>
                      {fmtDur(editSoundDuration)}
                    </span>
                  </div>
                )}
                {editSoundDuration == null && editSoundData && (
                  <span style={{ fontSize: 9, color: DIM }}>detecting length…</span>
                )}
              </div>
            )}

            {/* Over-length warning */}
            {disc.duration != null && editSoundDuration != null && editSoundDuration > disc.duration && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: `${ERR}0d`, border: `1px solid ${ERR}44`, fontSize: 10, color: ERR, lineHeight: 1.6 }}>
                ⚠ Your song ({fmtDur(editSoundDuration)}) is longer than the vanilla track ({fmtDur(disc.duration)}).
                Minecraft will cut playback at {fmtDur(disc.duration)} because the sound event length is defined by the vanilla game data.
                Choose a different (shorter) disc to override, or trim your song to fit.
              </div>
            )}

            {/* Current playback */}
            {curSoundUrl && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: DIM, letterSpacing: '1px', marginBottom: 4 }}>CURRENT SOUND IN PACK</div>
                <MiniPlayer url={curSoundUrl} label={editSoundData?.filename ?? (curSoundRef ?? 'sound file')}/>
              </div>
            )}
            {editSoundData && !curSoundUrl && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: DIM, letterSpacing: '1px', marginBottom: 4 }}>PENDING UPLOAD (not saved yet)</div>
                <MiniPlayer url={editSoundData.url} label={`${editSoundData.filename}.ogg`}/>
              </div>
            )}
            {!curSoundUrl && !editSoundData && (
              <div style={{ marginBottom: 12, padding: '8px 10px', background: BG3, border: `1px solid ${BORDER}`, fontSize: 10, color: DIM }}>
                {hasSound(disc.id)
                  ? `Sound event set → "${editSoundRef}" but the .ogg file is not in this pack`
                  : `No custom sound. The game plays the vanilla ${disc.id} music disc track.`}
              </div>
            )}

            <Fld
              label="Sound event reference path"
              hint={`Sound event key: ${sndKey(disc.id)}   →   file: assets/minecraft/sounds/${editSoundRef || `records/${disc.id}`}.ogg`}>
              <TxtIn
                value={editSoundRef}
                onChange={v => { setEditSoundRef(v); setSaved(false); }}
                placeholder={`records/${disc.id}`}
                mono
              />
            </Fld>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <button className="btn sm" style={{ borderColor: `${ACCENT}44`, color: ACCENT }}
                onClick={() => soundInputRef.current?.click()}>
                ↑ Upload .ogg
              </button>
              {availableOggs.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => {
                    const v = (e.target as HTMLSelectElement).value;
                    if (v) { setEditSoundRef(v); setSaved(false); }
                  }}
                  style={{ background: BG3, border: `1px solid ${BORDER}`, color: TEXT2, padding: '3px 8px', fontFamily: 'monospace', fontSize: 11, outline: 'none', flex: 1, minWidth: 0 }}>
                  <option value="" disabled>Pick existing .ogg from pack…</option>
                  {availableOggs.map(o => <option key={o.path} value={o.ref}>{o.ref}</option>)}
                </select>
              )}
            </div>
            <input ref={soundInputRef} type="file" accept=".ogg,.mp3,.wav" style={{ display: 'none' }} onChange={handleSoundUpload}/>

            {editSoundData && (
              <div style={{ padding: '6px 10px', background: '#0a1a0a', border: `1px solid ${ACCENT}44`, fontSize: 10, color: ACCENT, display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span>↑</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Will write: {editSoundData.filename}.ogg → assets/minecraft/sounds/{editSoundRef || `records/${disc.id}`}.ogg
                </span>
                <button className="btn sm danger" onClick={() => { setEditSoundData(null); setSaved(false); }}>✕</button>
              </div>
            )}

            <div style={{ fontSize: 10, color: DIM, background: BG3, padding: '7px 10px', border: `1px solid ${BORDER}`, lineHeight: 1.7, marginTop: 10 }}>
              The sound path is relative to <span style={{ color: TEXT2 }}>assets/minecraft/sounds/</span>.
              Standard vanilla format is <span style={{ color: TEXT2 }}>records/disc_name</span>.
              The sounds.json entry will use <span style={{ color: ACCENT }}>"stream": true</span> (required for long tracks).
            </div>
          </Sec>

          {/* ── FILES THAT WILL BE WRITTEN ── */}
          {willWrite.length > 0 && (
            <Sec title="Files That Will Be Written on Apply">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {willWrite.map(({ path, kind }) => (
                  <div key={path} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: 'monospace' }}>
                    <span style={{ color: kind === 'new' ? ACCENT2 : kind === 'generated' ? ACCENT : WARN, flexShrink: 0, width: 70 }}>
                      {kind === 'new' ? '+ CREATE' : kind === 'generated' ? '+ GENERATE' : '~ PATCH'}
                    </span>
                    <span style={{ color: TEXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* ── APPLY + CLEAR ── */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            <button
              className="btn"
              style={{ borderColor: `${ACCENT}66`, color: ACCENT, background: `${ACCENT}10`, padding: '7px 16px' }}
              onClick={applyChanges}>
              ✓ Apply Changes to Pack
            </button>
            {hasOverride(disc.id) && (
              <button className="btn danger"
                style={{ color: ERR, borderColor: `${ERR}44` }}
                onClick={clearOverrides}>
                ✕ Clear All Overrides
              </button>
            )}
            {saved && (
              <span style={{ fontSize: 11, color: ACCENT }}>✓ Saved — export zip to use the pack</span>
            )}
          </div>

          <div style={{ height: 32 }}/>
        </div>
      )}
    </div>
  );
}
