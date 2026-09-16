'use client';

import { useState } from 'react';
import type { MapLocation } from '@/lib/map-types';
import type { AdminPhoto } from './GalleryPanel';
import { Modal } from './ui';

interface Props {
  photos: AdminPhoto[];
  locations: MapLocation[];
  currentId: string | null;
  pin: MapLocation;
  error: string;
  uploading: boolean;
  onPick: (id: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}

/** Choose the photo a place shows. A photo belongs to one place at a time. */
export default function PhotoPicker({ photos, locations, currentId, pin, error, uploading, onPick, onUpload, onClose }: Props) {
  const [query, setQuery] = useState('');
  const pinByPhoto = new Map<string, MapLocation>();
  for (const l of locations) if (l.photoId) pinByPhoto.set(l.photoId, l);
  const q = query.trim().toLocaleLowerCase('is-IS');
  const shown = [...photos].sort((a, b) => a.order - b.order).filter(p => !q || p.title.toLocaleLowerCase('is-IS').includes(q) || p.sublabel.toLocaleLowerCase('is-IS').includes(q));

  return (
    <Modal title={`Mynd fyrir stað ${pin.id}, ${pin.label || 'án heitis'}`} onClose={onClose} width="56rem">
      <div className="a-stack">
        <div className="a-inline">
          <input className="a-input" style={{ flex: 1, minWidth: '10rem' }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Leita eftir titli" autoFocus />
          <label className="a-btn a-btn--small" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Hleð upp' : 'Hlaða upp nýrri'}
            <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }} />
          </label>
        </div>
        {error && <p className="a-update--err">{error}</p>}
        {!error && photos.length === 0 && <p className="a-muted">Engar myndir í safninu enn. Hladdu upp mynd hér að ofan.</p>}
        {photos.length > 0 && shown.length === 0 && <p className="a-muted">Engin mynd passar við leitina.</p>}
        <div className="a-picker">
          {shown.map(p => {
            const holder = pinByPhoto.get(p.id);
            const elsewhere = holder && holder.id !== pin.id ? holder : null;
            return (
              <button key={p.id} type="button" className={`a-picker__item${p.id === currentId ? ' is-current' : ''}${p.active ? '' : ' is-off'}`} onClick={() => onPick(p.id)} title={p.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.filename} alt={p.title} loading="lazy" />
                <span className="a-picker__cap">
                  {p.title}
                  <small className={elsewhere ? 'is-warn' : ''}>{elsewhere ? `nú á stað ${elsewhere.id}, ${elsewhere.label}` : !p.active ? 'falin á vefnum' : p.sublabel || ' '}</small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="a-help">Hver mynd getur aðeins verið á einum stað. Sé mynd valin sem er þegar á öðrum stað flyst hún hingað. Vistaðu kortið á eftir.</p>
      </div>
    </Modal>
  );
}
