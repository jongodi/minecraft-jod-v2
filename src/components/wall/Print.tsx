'use client';

// One thing on the wall: a note, a print, or a note with prints. The owner
// can rewrite it, recaption or take down its pictures, move it to a place,
// or make one of its prints the poster's backdrop. Anyone signed in can
// light a lantern under it or leave a line.
import { memo, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import type { CrewEntry, CrewPhoto } from '@/lib/crew-types';
import { LIMITS, sameUser } from '@/lib/crew-types';
import { formatDate, formatAge, plural } from '@/lib/format';
import { Lantern } from '@/components/badlands/Bits';
import { useMounted } from '@/components/badlands/hooks';
import PlayerHead from '@/components/badlands/PlayerHead';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';
import { errorFrom } from '@/lib/crew-upload';
import { woodClass } from '@/lib/sign-wood';
import type { WallPlace } from './Wall';

interface Props {
  username:     string;
  entry:        CrewEntry;
  places:       WallPlace[];
  me:           string | null | undefined;
  isOwner:      boolean;
  coverPhotoId: string | null;
  /** just put up from this page: it swings on its chains and settles */
  fresh?:       boolean;
  /** change this entry as it is now in the wall's state, not as it was when the request began */
  onChange:     (id: string, update: (entry: CrewEntry) => CrewEntry) => void;
  onRemove:     (id: string) => void;
  onCover:      (photoId: string | null) => void;
  onOpen:       (photoId: string, origin: DOMRect) => void;
}

interface EditState { text: string; placeId: number | null; photos: CrewPhoto[] }

/* the longest note still lettered across a sign rather than written on it */
const WORD_MAX = 90;

/* Every prop the wall hands a sign is a value or a callback that keeps its
   identity, so a lantern lit on one sign, or a line typed in the bio, does
   not draw every other sign on the wall again. */
export default memo(function Print({ username, entry, places, me, isOwner, coverPhotoId, fresh = false, onChange, onRemove, onCover, onOpen }: Props) {
  const [edit, setEdit]       = useState<EditState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [reply, setReply]     = useState('');
  const [replying, setReplying] = useState(false);
  const [busyLantern, setBusyLantern] = useState(false);
  /* the light a lantern just lit throws across the board: where it stands, and a count so a second lighting starts it again */
  const [light, setLight] = useState<{ x: number; y: number; n: number } | null>(null);
  const mounted = useMounted();
  /* how long ago depends on the clock, and the server's is not the browser's; until mounted the plain date stands in.
     A date is written out the same everywhere (formatDate), so it needs no wait. */
  const age  = (iso: string) => (mounted ? formatAge(iso) : iso.slice(0, 10));
  const date = formatDate;

  const place = entry.placeId !== null ? places.find(p => p.id === entry.placeId) ?? null : null;
  /* what the sign is called to a screen reader, and what its own buttons say they act on */
  const name = entry.text ? entry.text.slice(0, 60) : `Mynd frá ${date(entry.createdAt)}`;
  const lit = !!me && entry.lanterns.some(n => sameUser(n, me));
  const api = (path: string, init?: RequestInit) => fetch(`/api/crew/${username}/entries/${entry.id}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });

  async function save() {
    if (!edit) return;
    setSaving(true); setError('');
    try {
      const res = await api('', { method: 'PATCH', body: JSON.stringify({ text: edit.text, placeId: edit.placeId, photos: edit.photos.map(p => ({ id: p.id, caption: p.caption })) }) });
      if (!res.ok) throw new Error(await errorFrom(res));
      const saved = await res.json() as CrewEntry;
      onChange(entry.id, () => saved);
      setEdit(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ekki tókst að vista.'); }
    finally { setSaving(false); }
  }

  const OFFLINE = 'Nettenging brást. Reyndu aftur.';

  async function remove() {
    if (!confirm('Taka þetta niður af veggnum? Myndirnar hverfa líka.')) return;
    setError('');
    try {
      const res = await api('', { method: 'DELETE' });
      if (res.ok) onRemove(entry.id);
      else setError(await errorFrom(res));
    } catch { setError(OFFLINE); }
  }

  async function toggleLantern(e: MouseEvent<HTMLButtonElement>) {
    if (!me || busyLantern) return;
    /* lighting it, not putting it out: the board takes the light at once, from the lantern */
    if (!lit) {
      const board = e.currentTarget.closest('article')?.getBoundingClientRect();
      const lamp = e.currentTarget.querySelector('svg')?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
      if (board) setLight(l => ({ x: lamp.left + lamp.width / 2 - board.left, y: lamp.top + lamp.height / 2 - board.top, n: (l?.n ?? 0) + 1 }));
    }
    setBusyLantern(true); setError('');
    try {
      const res = await api('/lantern', { method: 'POST' });
      if (!res.ok) throw new Error(await errorFrom(res));
      const { lanterns } = await res.json() as { lanterns: string[] };
      onChange(entry.id, e => ({ ...e, lanterns }));
    } catch (err) { setError(err instanceof Error ? err.message : OFFLINE); }
    finally { setBusyLantern(false); }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || replying) return;
    setReplying(true); setError('');
    try {
      const res = await api('/replies', { method: 'POST', body: JSON.stringify({ text: reply }) });
      if (!res.ok) throw new Error(await errorFrom(res));
      const r = await res.json() as CrewEntry['replies'][number];
      onChange(entry.id, e => ({ ...e, replies: [...e.replies, r] }));
      setReply('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Svarið komst ekki upp.'); }
    finally { setReplying(false); }
  }

  async function dropReply(rid: string) {
    if (!confirm('Eyða svarinu?')) return;
    setError('');
    try {
      const res = await api(`/replies/${rid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await errorFrom(res));
      onChange(entry.id, e => ({ ...e, replies: e.replies.filter(r => r.id !== rid) }));
    } catch (err) { setError(err instanceof Error ? err.message : OFFLINE); }
  }

  const open = (photo: CrewPhoto) => (e: MouseEvent<HTMLButtonElement>) => onOpen(photo.id, e.currentTarget.getBoundingClientRect());
  const photos = edit ? edit.photos : entry.photos;
  const many = photos.length > 1;

  /* a few words and nothing else are lettered like a sign: larger, centred */
  const word = !edit && photos.length === 0 && entry.text.length <= WORD_MAX && !entry.text.includes('\n');

  return (
    <article id={entry.id} className={`w-sign${woodClass(place?.wood)} w-print${word ? ' w-print--word' : ''}${fresh ? ' is-fresh' : ''}${edit ? ' is-editing' : ''}`} aria-label={name}>

      {photos.length > 0 && (
        <div className={`w-print__pics${many ? ' is-many' : ''}`}>
          {photos.map((photo, i) => (
            <figure key={photo.id} className="w-print__pic">
              <button type="button" className="w-print__btn" onClick={open(photo)} aria-label={photo.caption || 'Stækka myndina'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img {...photoProps(photo.filename, many ? PHOTO_SIZES.shot : PHOTO_SIZES.print)} alt={photo.caption || ''} loading="lazy" decoding="async" />
              </button>
              {edit ? (
                <div className="w-print__edit-pic">
                  <input className="w-draft__cap" value={photo.caption} maxLength={LIMITS.caption} placeholder="myndatexti" aria-label={photos.length > 1 ? `Myndatexti, mynd ${i + 1} af ${photos.length}` : 'Myndatexti'}
                    onChange={e => setEdit(s => s && ({ ...s, photos: s.photos.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p) }))} />
                  <div className="w-print__pic-tools">
                    <button type="button" className={`w-tool${coverPhotoId === photo.id ? ' is-on' : ''}`} onClick={() => onCover(coverPhotoId === photo.id ? null : photo.id)}>
                      {coverPhotoId === photo.id ? 'á plakatinu' : 'setja á plakatið'}
                    </button>
                    <button type="button" className="w-tool" onClick={() => setEdit(s => s && ({ ...s, photos: s.photos.filter(p => p.id !== photo.id) }))}>taka niður</button>
                  </div>
                </div>
              ) : (photo.caption || photo.takenAt) && (
                <figcaption className="w-print__cap">
                  {photo.caption && <span>{photo.caption}</span>}
                  {photo.takenAt && <small>tekin {date(photo.takenAt)}</small>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {edit ? (
        <div className="w-print__editor">
          <textarea className="b-textarea" value={edit.text} onChange={e => setEdit(s => s && ({ ...s, text: e.target.value }))} maxLength={LIMITS.text} rows={3} placeholder="Miði" aria-label="Miði" />
          <div className="w-print__editrow">
            <select className="w-pin__select" value={edit.placeId ?? ''} onChange={e => setEdit(s => s && ({ ...s, placeId: e.target.value ? Number(e.target.value) : null }))} aria-label="Staður">
              <option value="">Enginn staður</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <span className="b-inline">
              <button type="button" className="b-btn b-btn--solid b-btn--small" onClick={save} disabled={saving || (!edit.text.trim() && edit.photos.length === 0)}>{saving ? 'Vista…' : 'Vista'}</button>
              <button type="button" className="b-btn b-btn--small" onClick={() => { setEdit(null); setError(''); }}>Hætta við</button>
            </span>
          </div>
        </div>
      ) : (
        entry.text && <p className="w-print__note">{entry.text}</p>
      )}

      {light && (
        <span key={light.n} className="w-sign__light" aria-hidden="true" onAnimationEnd={() => setLight(null)}
          style={{ '--lx': `${light.x}px`, '--ly': `${light.y}px` } as CSSProperties} />
      )}

      <footer className="w-print__meta">
        {/* the day is in the tip for the eye and after the age for a screen reader, which does not read a tip */}
        <time className="b-tip" dateTime={entry.createdAt} data-tip={date(entry.createdAt)}>{age(entry.createdAt)}<span className="b-visually-hidden">, {date(entry.createdAt)}</span></time>
        {place && <Link href={`/?stadur=${place.id}#heimur`} className="w-print__place">{place.label}</Link>}
        <button type="button" className={`w-lantern b-tip${lit ? ' is-lit' : ''}`} onClick={toggleLantern} disabled={!me || busyLantern}
          aria-pressed={lit} aria-label={`Lukt undir færslunni${entry.lanterns.length ? `, ${entry.lanterns.length} ${plural(entry.lanterns.length, 'logar', 'loga')}` : ''}${me ? '' : '. Skráðu þig inn til að kveikja á lukt'}`}
          data-tip={me ? (lit ? 'Slökkva á luktinni' : 'Kveikja á lukt') : 'Skráðu þig inn til að kveikja á lukt'}>
          <Lantern lit={lit || entry.lanterns.length > 0} />
          {entry.lanterns.length > 0 && <span>{entry.lanterns.length}</span>}
          <span className="b-visually-hidden">{entry.lanterns.length ? `luktir: ${entry.lanterns.join(', ')}` : 'engin lukt enn'}</span>
        </button>
        {isOwner && !edit && (
          <span className="w-print__actions">
            <button type="button" onClick={() => setEdit({ text: entry.text, placeId: entry.placeId, photos: entry.photos })} aria-label={`Breyta færslunni: ${name}`}>breyta</button>
            <button type="button" onClick={remove} aria-label={`Eyða færslunni: ${name}`}>eyða</button>
          </span>
        )}
      </footer>

      {(entry.replies.length > 0 || me) && (
        <div className="w-replies">
          {entry.replies.map(r => (
            <div key={r.id} className="w-reply">
              <span className="w-reply__head"><PlayerHead name={r.username} size={24} /></span>
              <span className="w-reply__body">
                <Link href={`/crew/${r.username}`} className="w-reply__who">{r.username}</Link>
                <span className="w-reply__text">{r.text}</span>
                <span className="w-reply__when">
                  {age(r.createdAt)}
                  {(sameUser(me, r.username) || isOwner) && <button type="button" onClick={() => dropReply(r.id)} aria-label={`Eyða svari frá ${r.username}: ${r.text.slice(0, 40)}`}>eyða</button>}
                </span>
              </span>
            </div>
          ))}
          {me && (
            <form className="w-reply__form" onSubmit={sendReply}>
              <span className="w-reply__head"><PlayerHead name={me} size={24} /></span>
              <input className="w-reply__input" value={reply} onChange={e => setReply(e.target.value)} maxLength={LIMITS.reply} placeholder="Svara…" aria-label="Svara" />
              <button type="submit" className="b-btn b-btn--small" disabled={!reply.trim() || replying}>{replying ? '…' : 'Senda'}</button>
            </form>
          )}
        </div>
      )}

      {error && <p className="b-err" role="alert">{error}</p>}
    </article>
  );
});
