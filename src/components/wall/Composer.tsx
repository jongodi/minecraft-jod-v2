'use client';

// The pin slot: the one place on a member's own wall where things go up.
// Drop screenshots on it, paste them, pick several, or just write. Each
// picture starts uploading the moment it lands, gets a caption line, and
// the whole lot is pinned with one press.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { CrewEntry } from '@/lib/crew-types';
import { LIMITS } from '@/lib/crew-types';
import { fetchStorageInfo, uploadPrint, errorFrom, type StorageInfo, type UploadedPrint } from '@/lib/crew-upload';
import { formatDate, plural } from '@/lib/format';
import { CloseIcon } from '@/components/badlands/Bits';
import type { WallPlace } from './Wall';

interface Draft {
  key:      string;
  name:     string;
  preview:  string;          // object URL for the thumbnail
  caption:  string;
  progress: number;
  done:     UploadedPrint | null;
  error:    string | null;
}

interface Props {
  username: string;
  places:   WallPlace[];
  onPinned: (entry: CrewEntry) => void;
}

const newKey = () => Math.random().toString(36).slice(2);

export default function Composer({ username, places, onPinned }: Props) {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [text, setText]       = useState('');
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [drafts, setDrafts]   = useState<Draft[]>([]);
  const [over, setOver]       = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError]     = useState('');
  const input = useRef<HTMLInputElement>(null);
  const slot  = useRef<HTMLFormElement>(null);

  useEffect(() => { fetchStorageInfo(username).then(setStorage); }, [username]);
  /* Previews are let go when the slot goes away. (A cleanup keyed on the
     drafts ran on every progress tick and revoked the previews still showing.) */
  const live = useRef<Draft[]>([]);
  live.current = drafts;
  useEffect(() => () => { live.current.forEach(d => URL.revokeObjectURL(d.preview)); }, []);
  /* drafts taken out while still uploading: their copy is removed from the store once it lands */
  const dropped = useRef(new Set<string>());
  const discard = useCallback((done: UploadedPrint) => {
    fetch(`/api/crew/${username}/upload`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: done.id, url: done.url }) }).catch(() => {});
  }, [username]);

  const patch = useCallback((key: string, p: Partial<Draft>) => setDrafts(ds => ds.map(d => (d.key === key ? { ...d, ...p } : d))), []);

  const add = useCallback((files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;
    const room = LIMITS.photosPer - drafts.length;
    if (room <= 0) { setError(`Mest ${LIMITS.photosPer} myndir í einu.`); return; }
    const left = images.length - room;
    setError(left > 0 ? `Mest ${LIMITS.photosPer} myndir í einu; ${left} ${plural(left, 'komst', 'komust')} ekki með.` : '');
    const fresh: Draft[] = images.slice(0, room).map(f => ({ key: newKey(), name: f.name, preview: URL.createObjectURL(f), caption: '', progress: 0, done: null, error: null }));
    setDrafts(ds => [...ds, ...fresh]);
    fresh.forEach((d, i) => {
      const file = images[i];
      const info = storage ?? { mode: 'none' as const, access: null, maxBytes: 0, error: 'Geymslan svarar ekki enn.' };
      uploadPrint(username, file, info, pct => patch(d.key, { progress: pct }))
        .then(done => { if (dropped.current.has(d.key)) discard(done); else patch(d.key, { done, progress: 100 }); })
        .catch(e => patch(d.key, { error: e instanceof Error ? e.message : 'Upphleðsla mistókst.' }));
    });
  }, [drafts.length, patch, storage, username, discard]);

  /* Taken out of the slot: the preview goes, and so does the copy already in the store. */
  const remove = (key: string) => {
    const d = drafts.find(x => x.key === key);
    if (!d) return;
    URL.revokeObjectURL(d.preview);
    if (d.done) discard(d.done);
    else if (!d.error) dropped.current.add(key);
    setDrafts(ds => ds.filter(x => x.key !== key));
  };

  /* Dropped or pasted anywhere on the page, the picture lands in the slot. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      add(files);
      slot.current?.scrollIntoView({ block: 'nearest' });
    };
    let depth = 0;
    const onEnter = (e: globalThis.DragEvent) => { if (e.dataTransfer?.types.includes('Files')) { depth++; setOver(true); } };
    const onLeave = () => { if (--depth <= 0) { depth = 0; setOver(false); } };
    const onOver  = (e: globalThis.DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    /* One listener for the whole page, the pin slot included: a second one on
       the slot saw the same drop and uploaded every picture twice. */
    const onDrop  = (e: globalThis.DragEvent) => {
      depth = 0; setOver(false);
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      add(Array.from(e.dataTransfer.files));
      slot.current?.scrollIntoView({ block: 'nearest' });
    };
    document.addEventListener('paste', onPaste);
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [add]);

  const uploading = drafts.some(d => !d.done && !d.error);
  const ready = drafts.filter(d => d.done);
  const canPin = !pinning && !uploading && (text.trim().length > 0 || ready.length > 0);

  async function pin(e: FormEvent) {
    e.preventDefault();
    if (!canPin) return;
    setPinning(true);
    setError('');
    try {
      const res = await fetch(`/api/crew/${username}/entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          placeId,
          photos: ready.map(d => ({ ...d.done!, caption: d.caption })),
        }),
      });
      if (!res.ok) throw new Error(await errorFrom(res));
      const entry = await res.json() as CrewEntry;
      onPinned(entry);
      drafts.forEach(d => URL.revokeObjectURL(d.preview));
      setDrafts([]); setText(''); setPlaceId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ekki tókst að festa þetta upp.');
    } finally {
      setPinning(false);
    }
  }


  const storageNote =
    !storage ? 'athuga geymsluna' :
    storage.mode === 'none' ? (storage.error ?? 'myndageymsla er ekki stillt') :
    storage.error ? storage.error :
    'dragðu skjámyndir hingað, límdu þær, eða veldu';

  return (
    <form ref={slot} className={`w-pin${over ? ' is-over' : ''}${drafts.length ? ' has-prints' : ''}`} onSubmit={pin} aria-label="Festa eitthvað upp">
      <span className="b-paper__nail" aria-hidden="true" />
      <textarea
        className="w-pin__text"
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={LIMITS.text}
        rows={2}
        placeholder="Hvað er að frétta úr heiminum?"
        aria-label="Miði"
      />

      {drafts.length > 0 && (
        <ul className="w-pin__prints" aria-label="Myndir sem eru að fara upp">
          {drafts.map(d => (
            <li key={d.key} className={`w-draft${d.error ? ' is-error' : d.done ? ' is-done' : ''}`}>
              <div className="w-draft__pic">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.preview} alt="" />
                {!d.done && !d.error && <span className="w-draft__bar" style={{ '--p': `${d.progress}%` } as React.CSSProperties} aria-hidden="true" />}
                <button type="button" className="w-draft__x" onClick={() => remove(d.key)} aria-label={`Taka ${d.name} úr`}><CloseIcon /></button>
              </div>
              <input className="w-draft__cap" value={d.caption} onChange={e => patch(d.key, { caption: e.target.value })} maxLength={LIMITS.caption} placeholder="myndatexti" aria-label={`Myndatexti fyrir ${d.name}`} />
              <span className="w-draft__meta">
                {d.error ? d.error : d.done ? (d.done.takenAt ? `tekin ${formatDate(d.done.takenAt)}` : 'tilbúin') : `hleð upp ${Math.round(d.progress)}%`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="w-pin__row">
        <input ref={input} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="b-btn b-btn--small" onClick={() => input.current?.click()} disabled={!storage || storage.mode === 'none'}>Velja myndir</button>
        <label className="w-pin__place">
          <span className="b-visually-hidden">Staður</span>
          <select className="w-pin__select" value={placeId ?? ''} onChange={e => setPlaceId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Hvar var þetta?</option>
            {places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <span className="w-pin__note">{storageNote}</span>
        <button type="submit" className="b-btn b-btn--solid b-btn--small w-pin__go" disabled={!canPin}>
          {pinning ? 'Festi upp…' : uploading ? 'Hleð upp…' : 'Festa upp'}
        </button>
      </div>
      {error && <p className="b-err">{error}</p>}
    </form>
  );
}
