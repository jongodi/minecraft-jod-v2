'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import type { MapConfig, MapLocation } from '@/lib/map-types';
import GalleryUploader from './GalleryUploader';
import ScreenshotFormat from './ScreenshotFormat';
import { Button, Field, Notice, Panel, api, errText } from './ui';

/** A gallery photo as the admin API returns it: with the id of the map pin it is linked to. */
export type AdminPhoto = GalleryPhoto & { locationId: number | null };

type Filter = 'all' | 'shown' | 'hidden' | 'unlinked';

export default function GalleryPanel() {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', sublabel: '', locationId: null as number | null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, cfg] = await Promise.all([api<AdminPhoto[]>('/api/admin/gallery'), api<MapConfig>('/api/admin/map')]);
      setPhotos(ps);
      setLocations([...cfg.locations].sort((a, b) => a.id - b.id));
    } catch (e) { setMsg(errText(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...photos].sort((a, b) => a.order - b.order), [photos]);
  const shown = sorted.filter(p => filter === 'all' || (filter === 'shown' && p.active) || (filter === 'hidden' && !p.active) || (filter === 'unlinked' && p.locationId === null));
  const locById = (id: number | null) => (id === null ? null : locations.find(l => l.id === id) ?? null);

  async function patch(photo: AdminPhoto, body: Record<string, unknown>, ok: string) {
    setSaving(true); setMsg('');
    try {
      const saved = await api<Partial<AdminPhoto>>(`/api/admin/gallery/${photo.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      const newLoc = saved.locationId !== undefined ? saved.locationId : photo.locationId;
      setPhotos(ps => ps.map(p => {
        if (p.id === photo.id) return { ...p, ...saved, locationId: newLoc };
        if (newLoc !== null && p.locationId === newLoc) return { ...p, locationId: null };
        return p;
      }));
      setMsg(ok);
      return true;
    } catch (e) { setMsg(errText(e)); return false; }
    finally { setSaving(false); }
  }

  async function saveEdit(photo: AdminPhoto) {
    const body: Record<string, unknown> = { title: draft.title, sublabel: draft.sublabel };
    if (draft.locationId !== photo.locationId) body.locationId = draft.locationId;
    const loc = locById(draft.locationId);
    if (await patch(photo, body, loc ? `✓ Vistað. Myndin birtist á stað ${loc.id}, ${loc.label}.` : '✓ Vistað.')) setEditing(null);
  }

  async function remove(photo: AdminPhoto) {
    if (!confirm(`Eyða myndinni „${photo.title}“? Hún hverfur líka af kortinu. Þetta er ekki hægt að afturkalla.`)) return;
    try {
      await api(`/api/admin/gallery/${photo.id}`, { method: 'DELETE' });
      setPhotos(ps => ps.filter(p => p.id !== photo.id));
      setMsg('✓ Myndinni eytt.');
    } catch (e) { setMsg(errText(e)); }
  }

  async function reorder(next: AdminPhoto[]) {
    const renumbered = next.map((p, i) => ({ ...p, order: i + 1 }));
    setPhotos(renumbered);
    try { await api('/api/admin/gallery/reorder', { method: 'POST', body: JSON.stringify({ ids: renumbered.map(p => p.id) }) }); }
    catch (e) { setMsg(errText(e)); load(); }
  }
  /** Put a photo at a given 1-based position, sliding the rest along. */
  function moveTo(photo: AdminPhoto, pos: number) {
    const target = Math.max(1, Math.min(sorted.length, Math.round(pos))) - 1;
    const from = sorted.findIndex(p => p.id === photo.id);
    if (from === -1 || from === target) return;
    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    reorder(next);
  }
  const moveBy = (photo: AdminPhoto, dir: -1 | 1) => moveTo(photo, photo.order + dir);
  function drop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const next = [...sorted];
    const from = next.findIndex(p => p.id === dragId);
    const [moved] = next.splice(from, 1);
    next.splice(next.findIndex(p => p.id === targetId), 0, moved);
    setDragId(null); setOverId(null);
    reorder(next);
  }

  const startEdit = (p: AdminPhoto) => { setEditing(p.id); setDraft({ title: p.title, sublabel: p.sublabel, locationId: p.locationId }); };
  const onUploaded = useCallback((p: AdminPhoto, first: boolean) => {
    setPhotos(ps => (ps.some(x => x.id === p.id) ? ps : [...ps, p]));
    setMsg('✓ Mynd komin í safnið. Gefðu henni titil og tengdu hana við stað á kortinu.');
    if (first) { setEditing(p.id); setDraft({ title: p.title, sublabel: p.sublabel, locationId: p.locationId }); }
  }, []);

  const counts = { shown: photos.filter(p => p.active).length, linked: photos.filter(p => p.locationId !== null).length };

  return (
    <Panel
      title="Myndasafn"
      sub={`${counts.shown} af ${photos.length} sýnilegar á vefnum, ${counts.linked} tengdar stað á kortinu. Röðin hér er röðin í albúminu á vefnum: dragðu mynd, notaðu örvarnar eða skrifaðu sæti í reitinn efst á myndinni og ýttu á Enter.`}
      tools={(['all', 'shown', 'hidden', 'unlinked'] as Filter[]).map(f => (
        <Button key={f} tone="ghost" small on={filter === f} onClick={() => setFilter(f)}>{{ all: 'Allar', shown: 'Sýndar', hidden: 'Faldar', unlinked: 'Án staðar' }[f]}</Button>
      ))}
    >
      <div className="a-stack">
        <ScreenshotFormat onChanged={load} />
        <GalleryUploader onUploaded={onUploaded} />
        <Notice text={msg} />
        {loading ? <p className="a-muted">Sæki myndir</p> : shown.length === 0 ? <p className="a-muted">Engin mynd passar við síuna.</p> : (
          <div className="a-cards">
            {shown.map(photo => {
              const loc = locById(photo.locationId);
              const isEdit = editing === photo.id;
              return (
                <article
                  key={photo.id}
                  className={`a-card${photo.active ? '' : ' is-off'}${overId === photo.id ? ' is-target' : ''}`}
                  draggable={!isEdit}
                  onDragStart={() => setDragId(photo.id)}
                  onDragOver={e => { e.preventDefault(); setOverId(photo.id); }}
                  onDragLeave={() => setOverId(null)}
                  onDrop={() => drop(photo.id)}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                >
                  <div className="a-card__img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.filename} alt={photo.title} loading="lazy" />
                    <label className="a-card__pos" title="Sláðu inn nýtt sæti og ýttu á Enter">
                      <span className="a-sr">Sæti myndarinnar</span>
                      <input
                        className="a-card__posinput"
                        type="number"
                        min={1}
                        max={sorted.length}
                        defaultValue={photo.order}
                        key={`pos-${photo.id}-${photo.order}`}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); moveTo(photo, Number((e.target as HTMLInputElement).value)); } }}
                        onBlur={e => { const v = Number(e.target.value); if (v !== photo.order) moveTo(photo, v); }}
                      />
                    </label>
                    {!photo.active && <span className="a-card__badge a-card__badge--r">falin</span>}
                  </div>
                  <div className="a-card__body">
                    {isEdit ? (
                      <>
                        <Field label="Titill"><input className="a-input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} maxLength={100} autoFocus /></Field>
                        <Field label="Undirtitill"><input className="a-input" value={draft.sublabel} onChange={e => setDraft(d => ({ ...d, sublabel: e.target.value }))} maxLength={100} placeholder="t.d. Nýja byggðin" /></Field>
                        <Field label="Staður á kortinu">
                          <select className="a-select" value={draft.locationId === null ? '' : String(draft.locationId)} onChange={e => setDraft(d => ({ ...d, locationId: e.target.value === '' ? null : Number(e.target.value) }))}>
                            <option value="">Enginn</option>
                            {locations.map(l => {
                              const holder = photos.find(p => p.locationId === l.id && p.id !== photo.id);
                              return <option key={l.id} value={String(l.id)}>{l.id}. {l.label}{holder ? ` (nú: ${holder.title})` : ''}</option>;
                            })}
                          </select>
                        </Field>
                        <div className="a-card__actions">
                          <Button tone="primary" small onClick={() => saveEdit(photo)} disabled={saving}>{saving ? 'Vista' : 'Vista'}</Button>
                          <Button tone="ghost" small onClick={() => setEditing(null)} disabled={saving}>Hætta við</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="a-card__title" title={photo.title}>{photo.title}</p>
                        <p className="a-muted">{photo.sublabel || 'enginn undirtitill'}</p>
                        <p className={`a-card__pin${loc ? ' is-linked' : ''}`}>{loc ? `Staður ${loc.id}, ${loc.label}` : 'Ekki á kortinu'}</p>
                        <div className="a-card__actions">
                          <Button tone="ghost" small onClick={() => startEdit(photo)}>Breyta</Button>
                          <Button tone="ghost" small onClick={() => patch(photo, { active: !photo.active }, photo.active ? '✓ Myndin er falin á vefnum og á kortinu.' : '✓ Myndin er sýnd á vefnum.')}>{photo.active ? 'Fela' : 'Sýna'}</Button>
                          <span className="a-card__order">
                            <Button tone="ghost" small icon onClick={() => moveTo(photo, 1)} disabled={photo.order === 1} aria-label="Fremst" title="Fremst">⇤</Button>
                            <Button tone="ghost" small icon onClick={() => moveBy(photo, -1)} disabled={photo.order === 1} aria-label="Færa framar" title="Færa framar">←</Button>
                            <Button tone="ghost" small icon onClick={() => moveBy(photo, 1)} disabled={photo.order === sorted.length} aria-label="Færa aftar" title="Færa aftar">→</Button>
                            <Button tone="ghost" small icon onClick={() => moveTo(photo, sorted.length)} disabled={photo.order === sorted.length} aria-label="Aftast" title="Aftast">⇥</Button>
                          </span>
                          <Button tone="danger" small onClick={() => remove(photo)}>Eyða</Button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
