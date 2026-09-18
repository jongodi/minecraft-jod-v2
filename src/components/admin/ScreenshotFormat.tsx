'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SwapItem } from '@/lib/gallery-swap';
import { Button, Notice, api, errText } from './ui';

/* The bundled screenshots ship as both .png and .webp. The gallery in KV was
   seeded while the committed list still named the .png originals, so that is
   what the site asks for, and the 43MB of originals cannot be removed until
   the stored records point at the .webp files instead.

   This shows exactly which photos would move before anything is written, and
   moves them back just as readily, so the originals are only deleted once the
   site has been seen working without them. */

interface Plan { toWebp: SwapItem[]; toPng: SwapItem[] }

function Rows({ items }: { items: SwapItem[] }) {
  return (
    <ul className="a-list">
      {items.map(i => (
        <li key={i.id} className="a-list__item">
          <span className="a-row__name">{i.title || i.id}</span>
          <span className="a-data a-muted">
            {i.from.replace('/screenshots/', '')} → {i.to.replace('/screenshots/', '')}
          </span>
          {!i.ready && <span className="a-tag">{i.reason}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function ScreenshotFormat({ onChanged }: { onChanged: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try { setPlan(await api<Plan>('/api/admin/gallery/swap')); }
    catch { /* the rest of the gallery panel still works without this */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (to: 'webp' | 'png') => {
    const dir = to === 'webp' ? 'yfir í WebP' : 'til baka í PNG';
    if (!confirm(`Færa myndirnar ${dir}? Myndirnar sjálfar breytast ekki, aðeins hvor skráin er sótt.`)) return;
    setBusy(true); setMsg('');
    try {
      const res = await api<{ moved: SwapItem[]; skipped: SwapItem[] }>('/api/admin/gallery/swap', {
        method: 'POST', body: JSON.stringify({ to }),
      });
      setMsg(`✓ ${res.moved.length} myndir færðar ${dir}${res.skipped.length ? `, ${res.skipped.length} sleppt` : ''}. Opnaðu forsíðuna og athugaðu að þær birtist allar.`);
      await load();
      onChanged();
    } catch (e) { setMsg(errText(e)); }
    finally { setBusy(false); }
  };

  if (!plan) return null;
  const { toWebp, toPng } = plan;
  if (toWebp.length === 0 && toPng.length === 0) return null;

  const pending  = toWebp.length > 0;
  const items    = pending ? toWebp : toPng;
  const ready    = items.filter(i => i.ready).length;

  return (
    <div className="a-stack">
      <Notice
        tone={pending ? 'warn' : 'ok'}
        text={pending
          ? `${toWebp.length} myndir sækja enn PNG-frumritin. WebP-útgáfurnar eru nákvæmlega sömu myndir og margfalt léttari; þegar safnið sækir þær má eyða frumritunum úr public/screenshots.`
          : `Safnið sækir WebP-útgáfurnar. Eftir að þú hefur séð allar myndirnar birtast á vefnum má eyða PNG-frumritunum úr public/screenshots.`}
      />
      <div className="a-inline">
        <Button tone="ghost" small onClick={() => setOpen(o => !o)}>
          {open ? 'Fela listann' : `Sjá hvaða ${items.length} myndir`}
        </Button>
        {pending
          ? <Button tone="primary" small disabled={busy || ready === 0} onClick={() => run('webp')}>
              {busy ? 'Færi…' : `Skipta ${ready} myndum yfir í WebP`}
            </Button>
          : <Button tone="ghost" small disabled={busy || ready === 0} onClick={() => run('png')}>
              {busy ? 'Færi…' : 'Til baka í PNG'}
            </Button>}
      </div>
      {open && <Rows items={items} />}
      <Notice text={msg} />
    </div>
  );
}
