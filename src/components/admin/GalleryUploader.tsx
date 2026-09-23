'use client';

// Photo uploader for the admin gallery: pick or drop several photos, each is shrunk in the
// browser, sent straight to Vercel Blob (or to the server in local dev) and then registered.
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { plural } from '@/lib/format';
import { upload } from '@vercel/blob/client';
import type { GalleryPhoto } from '@/lib/gallery';
import { prepareImage, formatBytes, MAX_EDGE } from '@/lib/client-image';

export type AdminPhoto = GalleryPhoto & { locationId: number | null };

export interface StorageInfo { mode: 'blob' | 'local' | 'none'; access: 'public' | 'private' | null; maxBytes: number; error: string | null }

type Stage = 'queued' | 'preparing' | 'uploading' | 'saving' | 'done' | 'error';
interface Job { key: string; name: string; size: number; stage: Stage; progress: number; note?: string }

const STAGE_LABEL: Record<Stage, string> = {
  queued: 'Bíður', preparing: 'Undirbý', uploading: 'Hleð upp', saving: 'Skrái', done: 'Tilbúin', error: 'Mistókst',
};

function titleFromName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // RFC 4122 v4 layout from Math.random — only for very old browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Read an error message out of any response, JSON or not (Vercel's 413 page is plain text). */
async function errorFrom(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    if (j.error || j.message) return j.error ?? j.message!;
  } catch { /* not json */ }
  if (res.status === 413) return 'Skráin er of stór fyrir þjóninn.';
  if (res.status === 401) return 'Innskráningin er útrunnin. Skráðu þig inn aftur.';
  return `Villa ${res.status}${res.statusText ? ` (${res.statusText})` : ''}`;
}

const STORAGE_UNKNOWN: StorageInfo = { mode: 'none', access: null, maxBytes: 0, error: 'Náði ekki í stillingar geymslunnar.' };

/** Where photos go right now: Blob (public or private), the local folder, or nowhere. */
export async function fetchGalleryStorage(): Promise<StorageInfo> {
  try {
    const r = await fetch('/api/admin/gallery/upload', { cache: 'no-store' });
    return (r.ok ? (await r.json()) as StorageInfo : null) ?? STORAGE_UNKNOWN;
  } catch {
    return STORAGE_UNKNOWN;
  }
}

/** One photo into the album: shrunk in the browser, sent straight to Blob (or
    to the server in local dev, where there is no body limit), then registered.
    The uploader below and the map editor's "Hlaða upp nýrri" both go this way,
    so neither posts a raw 20 MB screenshot at a function capped at 4.5 MB. */
export async function uploadGalleryPhoto(
  file: File,
  info: StorageInfo,
  fields: { title: string; sublabel: string },
  report: (p: { stage: 'uploading' | 'saving'; progress?: number; note?: string }) => void = () => {},
): Promise<AdminPhoto> {
  if (info.mode === 'none') throw new Error(info.error ?? 'Myndageymsla er ekki stillt.');
  const prepared = await prepareImage(file);
  if (prepared.blob.size > info.maxBytes) throw new Error(`Of stór eftir minnkun (${formatBytes(prepared.blob.size)}, hámark ${formatBytes(info.maxBytes)}).`);
  const note = prepared.resized ? `${formatBytes(file.size)} → ${formatBytes(prepared.blob.size)} · ${prepared.width}×${prepared.height}` : formatBytes(file.size);
  report({ stage: 'uploading', note });

  if (info.mode === 'blob') {
    const id = newId();
    const blob = await upload(`gallery/${id}.${prepared.ext}`, prepared.blob, {
      access:          info.access ?? 'public',
      handleUploadUrl: '/api/admin/gallery/upload',
      contentType:     prepared.contentType,
      multipart:       prepared.blob.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => report({ stage: 'uploading', progress: percentage }),
    });
    report({ stage: 'saving', progress: 100 });
    const res = await fetch('/api/admin/gallery', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: blob.url, pathname: blob.pathname, ...fields }),
    });
    if (!res.ok) throw new Error(await errorFrom(res));
    return await res.json() as AdminPhoto;
  }

  const fd = new FormData();
  fd.append('file', new File([prepared.blob], `${titleFromName(file.name) || 'mynd'}.${prepared.ext}`, { type: prepared.contentType }));
  fd.append('title', fields.title);
  fd.append('sublabel', fields.sublabel);
  const res = await fetch('/api/admin/gallery/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await errorFrom(res));
  report({ stage: 'saving', progress: 100 });
  return await res.json() as AdminPhoto;
}

export default function GalleryUploader({ onUploaded }: { onUploaded: (photo: AdminPhoto, first: boolean) => void }) {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef  = useRef(false);

  useEffect(() => { fetchGalleryStorage().then(setStorage); }, []);

  const patch = useCallback((key: string, p: Partial<Job>) => {
    setJobs(js => js.map(j => (j.key === key ? { ...j, ...p } : j)));
  }, []);

  const uploadOne = useCallback(async (file: File, key: string, first: boolean) => {
    patch(key, { stage: 'preparing', progress: 0 });
    const photo = await uploadGalleryPhoto(file, storage!, { title: titleFromName(file.name), sublabel: '' }, p => patch(key, p));
    patch(key, { stage: 'done', progress: 100 });
    onUploaded(photo, first);
  }, [storage, patch, onUploaded]);

  const run = useCallback(async (files: File[]) => {
    if (!storage || storage.mode === 'none' || busyRef.current) return;
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) { setJobs([{ key: newId(), name: files[0]?.name ?? '', size: 0, stage: 'error', progress: 0, note: 'Aðeins er hægt að hlaða upp myndum.' }]); return; }

    busyRef.current = true;
    const queue = images.map(f => ({ file: f, key: newId() }));
    setJobs(queue.map(({ file, key }) => ({ key, name: file.name, size: file.size, stage: 'queued' as Stage, progress: 0 })));
    let first = true;
    for (const { file, key } of queue) {
      try {
        await uploadOne(file, key, first);
        first = false;
      } catch (e) {
        patch(key, { stage: 'error', note: e instanceof Error ? e.message : 'Upphleðsla mistókst.' });
      }
    }
    busyRef.current = false;
    if (inputRef.current) inputRef.current.value = '';
  }, [storage, uploadOne, patch]);

  const busy = jobs.some(j => j.stage !== 'done' && j.stage !== 'error');
  const disabled = !storage || storage.mode === 'none' || busy;

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false);
    if (disabled) return;
    run(Array.from(e.dataTransfer.files));
  }

  const doneCount = jobs.filter(j => j.stage === 'done').length;
  const failCount = jobs.filter(j => j.stage === 'error').length;

  return (
    <div>
      <div
        className={`a-drop${dragging ? ' is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple disabled={disabled} onChange={e => run(Array.from(e.target.files ?? []))} className="a-sr" id="gallery-upload" />
        <label htmlFor="gallery-upload" className={`a-btn a-btn--primary${disabled ? '' : ''}`} aria-disabled={disabled}>{busy ? 'Hleð upp' : 'Hlaða upp myndum'}</label>
        <span className="a-help">
          {!storage ? 'Athuga geymslu'
            : storage.mode === 'none' ? <span className="a-update--err">{storage.error ?? 'Myndageymsla er ekki stillt. Bættu BLOB_READ_WRITE_TOKEN við á Vercel.'}</span>
            : storage.error ? <span className="a-update--err">{storage.error}</span>
            : <>Dragðu myndir hingað eða veldu þær. Stórar myndir eru minnkaðar í {MAX_EDGE} px og vistaðar sem WebP, hámark {formatBytes(storage.maxBytes)}.{storage.mode === 'local' ? ' Vistast í /public/screenshots.' : storage.access === 'private' ? ' Lokuð Blob-geymsla, myndir birtar um /api/blob.' : ''}</>}
        </span>
      </div>

      {jobs.length > 0 && (
        <ul className="a-jobs">
          {jobs.map(j => (
            <li key={j.key} className="a-job">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {j.name}{j.note && <span className={j.stage === 'error' ? 'a-update--err' : 'a-muted'}> {j.note}</span>}
              </span>
              <span className={`a-progress${j.stage === 'error' ? ' is-err' : ''}`} aria-hidden="true" style={{ '--p': `${j.stage === 'done' ? 100 : j.progress}%` } as React.CSSProperties}><span /></span>
              <span className={j.stage === 'error' ? 'a-update--err' : j.stage === 'done' ? 'a-update--ok' : 'a-muted'}>
                {STAGE_LABEL[j.stage]}{j.stage === 'uploading' ? ` ${Math.round(j.progress)}%` : ''}
              </span>
            </li>
          ))}
          {!busy && jobs.length > 1 && (
            <li className={failCount ? 'a-update--err' : 'a-update--ok'}>{doneCount} af {jobs.length} {plural(jobs.length, 'mynd', 'myndum')} hlaðið upp{failCount ? `, ${failCount} ${plural(failCount, 'mistókst', 'mistókust')}` : ''}.</li>
          )}
        </ul>
      )}
    </div>
  );
}
