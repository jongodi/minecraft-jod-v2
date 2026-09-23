'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { plural } from '@/lib/format';
import type { DatapackUpdateResult } from '@/app/api/datapacks/check-updates/route';
import type { RefreshResult } from '@/app/api/admin/datapacks/refresh/route';
import type { PackView } from '@/lib/datapacks-store';
import { categoryLabel } from '@/lib/icelandic';
import PixelGlyph from '@/components/badlands/PixelGlyph';
import { GENERIC_GLYPHS, PACK_GLYPHS, glyphFor } from '@/components/badlands/packGlyphs';
import { Button, Field, Kbd, Modal, Notice, Panel, Toggle, api, errText } from './ui';

const CATEGORIES = ['BUILD', 'COMBAT', 'SURVIVAL', 'QOL', 'STRUCTURE', 'SOCIAL', 'LOOT', 'TRADE', 'CRAFT', 'WORLD'];
const SOURCES = [{ id: 'modrinth', label: 'Modrinth' }, { id: 'github', label: 'GitHub' }, { id: 'manual', label: 'Handvirkt' }] as const;
type Source = typeof SOURCES[number]['id'];

interface PackForm { name: string; description: string; category: string; source: Source; modrinthSlug: string; githubRepo: string; gameVersion: string; serverFile: string; currentVersion: string; glyph: string; hidden: boolean }
const EMPTY: PackForm = { name: '', description: '', category: 'QOL', source: 'manual', modrinthSlug: '', githubRepo: '', gameVersion: '26.1', serverFile: '', currentVersion: '', glyph: '', hidden: false };

function formFrom(p: PackView): PackForm {
  return { name: p.name, description: p.description, category: p.category, source: p.source, modrinthSlug: p.modrinthSlug ?? '', githubRepo: p.githubRepo ?? '', gameVersion: p.gameVersion, serverFile: p.serverFile ?? '', currentVersion: p.currentVersion ?? '', glyph: p.glyph ?? '', hidden: p.hidden };
}

/** One tab for everything about packs: what is shown, what is installed, what is new. */
export default function DatapacksPanel() {
  const [packs, setPacks] = useState<PackView[]>([]);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<Record<number, DatapackUpdateResult>>({});
  const [checking, setChecking] = useState(false);
  const [versions, setVersions] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<RefreshResult | null>(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<{ pack: PackView | null; filename?: string } | null>(null);

  /* Every action (a toggle, a move, a save) answers with the fresh list. A
     version the admin has typed and not yet saved is kept through that, so
     reordering a pack no longer quietly wipes three typed versions. */
  const stored = useRef<Record<number, string>>({});
  const apply = useCallback((list: PackView[]) => {
    const before = stored.current;
    stored.current = Object.fromEntries(list.map(p => [p.id, p.currentVersion ?? '']));
    setPacks(list);
    setVersions(v => Object.fromEntries(list.map(p => {
      const typed = v[p.id];
      const edited = typed !== undefined && p.id in before && typed !== before[p.id];
      return [p.id, edited ? typed : (p.currentVersion ?? '')];
    })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { apply(await api<PackView[]>('/api/admin/datapacks')); setMsg(''); }
    catch (e) { setMsg(errText(e)); }
    finally { setLoading(false); }
  }, [apply]);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const list = await api<DatapackUpdateResult[]>('/api/datapacks/check-updates');
      setUpdates(Object.fromEntries(list.map(u => [u.id, u])));
    } catch { /* the row shows nothing until the next check */ }
    finally { setChecking(false); }
  }, []);

  useEffect(() => { load().then(check); }, [load, check]);

  const changed = useMemo(() => packs.filter(p => (versions[p.id] ?? '') !== (p.currentVersion ?? '')), [packs, versions]);

  async function saveVersions() {
    setSaving(true); setMsg('');
    try {
      const settings = Object.fromEntries(changed.map(p => [p.id, { version: versions[p.id] }]));
      const r = await api<{ packs: PackView[] }>('/api/admin/datapacks', { method: 'PUT', body: JSON.stringify({ settings }) });
      apply(r.packs);
      setMsg(`✓ ${changed.length} ${plural(changed.length, 'útgáfa vistuð', 'útgáfur vistaðar')}.`);
      check();
    } catch (e) { setMsg(errText(e)); }
    finally { setSaving(false); }
  }

  async function setHidden(p: PackView, hidden: boolean) {
    setPacks(ps => ps.map(x => x.id === p.id ? { ...x, hidden } : x));
    try {
      const r = await api<{ packs: PackView[] }>('/api/admin/datapacks', { method: 'PUT', body: JSON.stringify({ settings: { [p.id]: { hidden } } }) });
      apply(r.packs);
      setMsg(hidden ? `✓ ${p.name} er falinn á vefnum.` : `✓ ${p.name} birtist á vefnum.`);
    } catch (e) { setMsg(errText(e)); load(); }
  }

  async function move(p: PackView, dir: -1 | 1) {
    const i = packs.findIndex(x => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= packs.length) return;
    const next = [...packs];
    [next[i], next[j]] = [next[j], next[i]];
    setPacks(next);
    try {
      const settings = Object.fromEntries(next.map((x, k) => [x.id, { order: k + 1 }]));
      const r = await api<{ packs: PackView[] }>('/api/admin/datapacks', { method: 'PUT', body: JSON.stringify({ settings }) });
      apply(r.packs);
    } catch (e) { setMsg(errText(e)); load(); }
  }

  async function syncServer() {
    setSyncing(true); setSync(null); setMsg('');
    try {
      const r = await api<RefreshResult>('/api/admin/datapacks/refresh', { method: 'POST' });
      setSync(r);
      await load();
      check();
    } catch (e) { setMsg(errText(e)); }
    finally { setSyncing(false); }
  }

  async function remove(p: PackView) {
    if (!confirm(`Eyða pakkanum ${p.name} af listanum? Skráin á þjóninum er ekki snert.`)) return;
    try {
      const r = await api<{ packs: PackView[] }>(`/api/admin/datapacks/custom/${p.id}`, { method: 'DELETE' });
      apply(r.packs);
      setMsg(`✓ ${p.name} fjarlægður.`);
    } catch (e) { setMsg(errText(e)); }
  }

  const visible = packs.filter(p => !p.hidden).length;
  const available = Object.values(updates).filter(u => u.updateAvailable).length;

  return (
    <>
      <Panel
        title="Gagnapakkar"
        sub={<>Það sem er sýnt í kaupfélaginu á vefnum, hvaða útgáfa er uppsett og hvort nýrri sé til. {visible} af {packs.length} {plural(visible, 'sýnilegur', 'sýnilegir')}{available ? `, ${available} með uppfærslu` : ''}.</>}
        tools={<>
          <Button tone="ghost" small onClick={check} disabled={checking}>{checking ? 'Athuga' : 'Athuga uppfærslur'}</Button>
          <Button tone="ghost" small onClick={syncServer} disabled={syncing}>{syncing ? 'Samstilli' : 'Lesa af þjóninum'}</Button>
          <Button tone="primary" small onClick={() => setEditing({ pack: null })}>Nýr pakki</Button>
        </>}
      >
        {loading ? <p className="a-muted">Sæki pakkana</p> : (
          <div className="a-stack">
            <div className="a-rows">
              {packs.map((p, i) => {
                const u = updates[p.id];
                const dirty = (versions[p.id] ?? '') !== (p.currentVersion ?? '');
                return (
                  <div key={p.id} className={`a-row${p.hidden ? ' is-hidden' : ''}`}>
                    <span className="a-row__glyph" aria-hidden="true"><PixelGlyph rows={glyphFor(p)} /></span>
                    <div>
                      <div className="a-row__name">{p.name} {p.isCustom && <span className="a-tag">eigin</span>}</div>
                      <div className="a-row__meta">{categoryLabel(p.category)}, {SOURCES.find(s => s.id === p.source)?.label}{p.serverFile ? `, skrá: ${p.serverFile}` : ''}. {p.description}</div>
                    </div>
                    <div className="a-field">
                      <input className={`a-input a-input--short a-input--data${dirty ? ' is-changed' : ''}`} value={versions[p.id] ?? ''} onChange={e => setVersions(v => ({ ...v, [p.id]: e.target.value }))} placeholder="útgáfa" aria-label={`Uppsett útgáfa af ${p.name}`} />
                      <span className="a-update">
                        {u?.updateAvailable ? <span className="a-update--new">{u.latestVersion} er til {u.downloadUrl && <a className="b-link" href={u.downloadUrl} target="_blank" rel="noopener noreferrer">sækja</a>}</span>
                          : u?.latestVersion ? <span className="a-update--ok">nýjasta</span>
                          : u?.error ? <span className="a-update--err" title={u.error}>athugun brást</span>
                          : p.source === 'manual' ? <span className="a-muted">handvirkt</span> : null}
                      </span>
                    </div>
                    <div className="a-row__actions">
                      <Toggle checked={!p.hidden} onChange={v => setHidden(p, !v)} label={p.hidden ? 'Falinn' : 'Sýndur'} />
                      <Button tone="ghost" small icon onClick={() => move(p, -1)} disabled={i === 0} aria-label="Færa ofar">↑</Button>
                      <Button tone="ghost" small icon onClick={() => move(p, 1)} disabled={i === packs.length - 1} aria-label="Færa neðar">↓</Button>
                      <Button tone="ghost" small onClick={() => setEditing({ pack: p })}>{p.isCustom ? 'Breyta' : 'Mynd'}</Button>
                      {p.isCustom && <Button tone="danger" small onClick={() => remove(p)}>Eyða</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="a-inline">
              <Button tone="primary" onClick={saveVersions} disabled={saving || changed.length === 0}>{saving ? 'Vista' : `Vista útgáfur${changed.length ? ` (${changed.length})` : ''}`}</Button>
              <span className="a-muted">Útgáfan er borin saman við Modrinth eða GitHub. „Lesa af þjóninum“ les skráarheitin í world/datapacks og fyllir inn það sem það þekkir.</span>
            </div>
            <Notice text={msg} />
            {sync && (
              <div className="a-notice a-notice--ok">
                <p>Skrár á þjóninum: {sync.scanned.length}. Þekktar: {sync.matched.length}. Útgáfur uppfærðar: {sync.updated}.</p>
                {sync.unmatched.length > 0 && (
                  <div className="a-stack" style={{ marginTop: 'var(--sp-3)' }}>
                    <p className="a-muted">Óþekktar skrár. Bættu þeim við sem pökkum svo þær birtist á vefnum:</p>
                    {sync.unmatched.map(f => (
                      <div key={f} className="a-inline"><span className="a-data" style={{ overflowWrap: 'anywhere' }}>{f}</span><Button small onClick={() => setEditing({ pack: null, filename: f })}>Bæta við</Button></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      {editing && (
        <PackModal
          pack={editing.pack}
          filename={editing.filename}
          onClose={() => setEditing(null)}
          onSaved={(list, text) => { apply(list); setEditing(null); setMsg(text); setSync(s => s && editing.filename ? { ...s, unmatched: s.unmatched.filter(f => f !== editing.filename) } : s); check(); }}
        />
      )}
    </>
  );
}

/* Guess a name and a matching part from a filename like "JOD Custom Pack v1.2.zip". */
function guessFromFilename(f: string): Pick<PackForm, 'name' | 'serverFile' | 'currentVersion'> {
  const base = f.replace(/\.zip$/i, '');
  const m = base.match(/^(.*?)[\s_-]*v?\.?(\d+(?:[._-]\d+)+)/i);
  const name = (m ? m[1] : base).replace(/[_-]+/g, ' ').replace(/[[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return { name: name || base, serverFile: name || base, currentVersion: m ? m[2].replace(/[_-]/g, '.') : '' };
}

function PackModal({ pack, filename, onClose, onSaved }: { pack: PackView | null; filename?: string; onClose: () => void; onSaved: (packs: PackView[], msg: string) => void }) {
  const [form, setForm] = useState<PackForm>(() => pack ? formFrom(pack) : filename ? { ...EMPTY, ...guessFromFilename(filename) } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof PackForm>(k: K, v: PackForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const seedOnly = !!pack && !pack.isCustom;
  const glyphChoices = [...GENERIC_GLYPHS, ...Object.keys(PACK_GLYPHS).filter(k => !(GENERIC_GLYPHS as readonly string[]).includes(k))];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (seedOnly) {
        const r = await api<{ packs: PackView[] }>('/api/admin/datapacks', { method: 'PUT', body: JSON.stringify({ settings: { [pack!.id]: { glyph: form.glyph, hidden: form.hidden, version: form.currentVersion } } }) });
        onSaved(r.packs, `✓ ${pack!.name} vistaður.`);
        return;
      }
      const body = { ...form, modrinthSlug: form.source === 'modrinth' ? form.modrinthSlug : '', githubRepo: form.source === 'github' ? form.githubRepo : '' };
      const r = pack
        ? await api<{ packs: PackView[] }>(`/api/admin/datapacks/custom/${pack.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api<{ packs: PackView[] }>('/api/admin/datapacks/custom', { method: 'POST', body: JSON.stringify(body) });
      onSaved(r.packs, pack ? `✓ ${form.name} vistaður.` : `✓ ${form.name} bætt við${form.hidden ? ', falinn þar til þú sýnir hann' : ' og sýndur á vefnum'}.`);
    } catch (err) { setError(errText(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={pack ? (seedOnly ? `${pack.name}: mynd og birting` : `Breyta: ${pack.name}`) : 'Nýr gagnapakki'} onClose={onClose} width="38rem">
      <form onSubmit={submit} className="a-stack" id="pack-form">
        {filename && <p className="a-help">Úr skránni <span className="a-data">{filename}</span>. Nafn og útgáfa eru ágiskun, lagaðu þau.</p>}
        {!seedOnly && (
          <>
            <div className="a-form-row">
              <Field label="Nafn"><input className="a-input" value={form.name} onChange={e => set('name', e.target.value)} required maxLength={120} /></Field>
              <Field label="Flokkur">
                <select className="a-select" value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select>
              </Field>
            </div>
            <Field label="Lýsing" help="Ein setning, birtist undir nafninu í kaupfélaginu."><input className="a-input" value={form.description} onChange={e => set('description', e.target.value)} required maxLength={120} /></Field>
            <div className="a-form-row">
              <Field label="Uppruni" help="Hvar er leitað að nýrri útgáfu.">
                <select className="a-select" value={form.source} onChange={e => set('source', e.target.value as Source)}>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </Field>
              {form.source === 'modrinth' && <Field label="Auðkenni á Modrinth" help="Síðasti hluti slóðarinnar á modrinth.com/datapack/…"><input className="a-input a-input--data" value={form.modrinthSlug} onChange={e => set('modrinthSlug', e.target.value)} placeholder="minn-pakki" /></Field>}
              {form.source === 'github' && <Field label="GitHub-safn" help="eigandi/safn"><input className="a-input a-input--data" value={form.githubRepo} onChange={e => set('githubRepo', e.target.value)} placeholder="eigandi/safn" /></Field>}
            </div>
            <div className="a-form-row">
              <Field label="Útgáfa leiks"><input className="a-input a-input--data" value={form.gameVersion} onChange={e => set('gameVersion', e.target.value)} placeholder="26.1" /></Field>
              <Field label="Uppsett útgáfa"><input className="a-input a-input--data" value={form.currentVersion} onChange={e => set('currentVersion', e.target.value)} placeholder="1.0" /></Field>
              <Field label="Auðkenni skrár á þjóni" help="Sá hluti skráarheitisins sem er alltaf eins, án útgáfunúmers."><input className="a-input a-input--data" value={form.serverFile} onChange={e => set('serverFile', e.target.value)} /></Field>
            </div>
          </>
        )}
        {seedOnly && (
          <Field label="Uppsett útgáfa"><input className="a-input a-input--data a-input--short" value={form.currentVersion} onChange={e => set('currentVersion', e.target.value)} /></Field>
        )}
        <Field label="Mynd á kassanum" help="Pakkar með eigin teikningu nota hana sjálfkrafa. Aðrir fá kistuna nema annað sé valið.">
          <div className="a-inline">
            <span className="a-row__glyph" aria-hidden="true"><PixelGlyph rows={glyphFor({ name: form.name, glyph: form.glyph })} /></span>
            <select className="a-select" style={{ width: 'auto', flex: 1 }} value={form.glyph} onChange={e => set('glyph', e.target.value)}>
              <option value="">Sjálfgefið</option>
              {glyphChoices.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </Field>
        <Toggle checked={!form.hidden} onChange={v => set('hidden', !v)} label="Sýna í kaupfélaginu á vefnum" />
        <Notice text={error} />
        <p className="a-help"><Kbd>Esc</Kbd> lokar án þess að vista.</p>
      </form>
      <div className="a-modal__foot">
        <Button tone="ghost" onClick={onClose}>Hætta við</Button>
        <Button tone="primary" type="submit" form="pack-form" disabled={saving}>{saving ? 'Vista' : pack ? 'Vista' : 'Bæta við'}</Button>
      </div>
    </Modal>
  );
}
