'use client';

// The wall's three dialogs: signing in, choosing a password, and the name
// and email the letters use. Each is paper on the dark, closed by Escape or
// a click that starts on the dark (useWallDialog), and the page stays still
// behind it. Kept apart from the wall itself, which only opens them.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorFrom } from '@/lib/crew-upload';
import { useBackdropClose, useDialogFocus, useScrollLock } from '@/components/badlands/hooks';

/* the same floor the server holds a password to */
const LIMITS_PW = 6;

// ─── Login: the password, or a link by post ───────────────────────────────────

export function LoginModal({ username, onSuccess, onClose }: { username: string; onSuccess: () => void; onClose: () => void }) {
  const [token,   setToken]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  /* a sign-in link asked for by post: on its way, or asked for */
  const [mail,    setMail]    = useState<'idle' | 'sending' | 'sent'>('idle');
  const { box, backdrop } = useWallDialog(onClose);

  async function askForLink() {
    setMail('sending');
    setError('');
    try {
      const res = await fetch('/api/crew/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
      if (res.ok) setMail('sent');
      else { setError(await errorFrom(res)); setMail('idle'); }
    } catch { setError('Nettenging brást. Reyndu aftur.'); setMail('idle'); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crew/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else setError(await errorFrom(res));
    } catch { setError('Nettenging brást. Reyndu aftur.'); }
    finally   { setLoading(false); }
  }

  return (
    <div ref={box} tabIndex={-1} className="b-modal" {...backdrop} role="dialog" aria-modal="true" aria-label="Skrá inn">
      <form className="b-paper b-modal__box" onSubmit={submit}>
        <p className="b-modal__title">Skrá inn sem {username}</p>
        <p className="b-modal__sub">lykilorðið sem þú valdir þér á veggnum. Ekkert lykilorð, eða gleymt? Fáðu tengil í pósti, eða biddu stjórnandann um einn.</p>
        <input type="password" className={`b-input${error ? ' is-error' : ''}`} value={token} onChange={e => setToken(e.target.value)} placeholder="Lykilorð" autoFocus autoComplete="current-password" />
        {error && <p className="b-err" role="alert">{error}</p>}
        {mail === 'sent'
          ? <p className="b-modal__ok" role="status">Sé netfang skráð á {username} kemur tengill í pósti eftir smástund. Opnaðu hann í tækinu sem þú vilt nota.</p>
          : <p className="b-modal__alt"><button type="button" className="b-link" onClick={askForLink} disabled={mail === 'sending'}>{mail === 'sending' ? 'Sendi…' : 'Senda mér innskráningartengil í pósti'}</button></p>}
        <div className="b-modal__actions">
          <button type="submit" className="b-btn b-btn--solid" disabled={loading || !token}>{loading ? 'Athuga…' : 'Skrá inn'}</button>
          <button type="button" className="b-btn" onClick={onClose}>Hætta við</button>
        </div>
      </form>
    </div>
  );
}

/* The wall's dialogs share one frame: Escape closes it, the page stays
   still behind it, and only a click that starts on the dark closes it, so a
   password dragged-to-select past the paper's edge is not thrown away. */
function useWallDialog(onClose: () => void) {
  /* the dialog itself, which holds focus until a field inside can take it */
  const box = useRef<HTMLDivElement>(null);
  useScrollLock();
  useDialogFocus(box);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return { box, backdrop: useBackdropClose(onClose) };
}

// ─── A password of the member's own ───────────────────────────────────────────
// Chosen on the wall once they are in; from then on "Þetta er ég" works on
// any phone or computer without a link from the admin.

export function PasswordModal({ username, change, onDone, onClose }: { username: string; change: boolean; onDone: () => void; onClose: () => void }) {
  const [pw,      setPw]      = useState('');
  const [again,   setAgain]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { box, backdrop } = useWallDialog(onClose);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw !== again) { setError('Lykilorðin eru ekki eins.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crew/${username}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (res.ok) { onDone(); onClose(); }
      else setError(await errorFrom(res));
    } catch { setError('Nettenging brást. Reyndu aftur.'); }
    finally   { setLoading(false); }
  }

  return (
    <div ref={box} tabIndex={-1} className="b-modal" {...backdrop} role="dialog" aria-modal="true" aria-label="Lykilorð">
      <form className="b-paper b-modal__box" onSubmit={submit}>
        <p className="b-modal__title">{change ? 'Nýtt lykilorð' : 'Veldu þér lykilorð'}</p>
        <p className="b-modal__sub">með því skráir þú þig inn á hvaða síma eða tölvu sem er undir „Þetta er ég“, án tengils frá stjórnandanum. Minnst {LIMITS_PW} stafir.</p>
        <input type="password" className={`b-input${error ? ' is-error' : ''}`} value={pw} onChange={e => setPw(e.target.value)} placeholder="Lykilorð" autoFocus autoComplete="new-password" />
        <input type="password" className={`b-input${error ? ' is-error' : ''}`} value={again} onChange={e => setAgain(e.target.value)} placeholder="Aftur, til öryggis" autoComplete="new-password" style={{ marginTop: '0.5rem' }} />
        {error && <p className="b-err" role="alert">{error}</p>}
        <div className="b-modal__actions">
          <button type="submit" className="b-btn b-btn--solid" disabled={loading || pw.length < LIMITS_PW || !again}>{loading ? 'Vista…' : 'Vista'}</button>
          <button type="button" className="b-btn" onClick={onClose}>Hætta við</button>
        </div>
      </form>
    </div>
  );
}

// ─── A name and an email address of the member's own ──────────────────────────
// The address is where a sign-in link goes when they ask for one, and word of
// the play nights; the name is what the letters call them instead of their
// Minecraft name. Seen only here, by its owner, and by the admin.

interface Contact { email: { address: string; nights: boolean } | null; name: string | null }

export function ContactModal({ username, onClose }: { username: string; onClose: () => void }) {
  /* The saved ones are fetched first. Until they are in, nothing can be
     saved: empty fields saved over a load that failed would erase them. */
  const [state,   setState]   = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const ready = state === 'ready';
  const [name,    setName]    = useState('');
  const [address, setAddress] = useState('');
  const [nights,  setNights]  = useState(true);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const { box, backdrop } = useWallDialog(onClose);

  useEffect(() => {
    let live = true;
    setState('loading');
    fetch(`/api/crew/${username}/email`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<Contact>; })
      .then(d => {
        if (!live) return;
        if (d.email) { setAddress(d.email.address); setNights(d.email.nights); }
        if (d.name) setName(d.name);
        setState('ready');
      })
      .catch(() => { if (live) setState('failed'); });
    return () => { live = false; };
  }, [username, attempt]);

  /* the first field takes focus once it can be typed in */
  useEffect(() => { if (ready) nameRef.current?.focus(); }, [ready]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crew/${username}/email`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email: address, nights }) });
      if (res.ok) onClose();
      else setError(await errorFrom(res));
    } catch { setError('Nettenging brást. Reyndu aftur.'); }
    finally   { setLoading(false); }
  }

  return (
    <div ref={box} tabIndex={-1} className="b-modal" {...backdrop} role="dialog" aria-modal="true" aria-label="Nafn og netfang">
      <form className="b-paper b-modal__box" onSubmit={submit}>
        <p className="b-modal__title">Nafn og netfang</p>
        <p className="b-modal__sub">fyrir póstinn frá JOÐ. Aðrir sjá þetta ekki á vefnum; nafnið sést aðeins í bréfunum.</p>
        <label className="b-modal__label" htmlFor="w-contact-name">Hvað eiga bréfin að kalla þig?</label>
        <input ref={nameRef} id="w-contact-name" className={`b-input${error ? ' is-error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder={ready ? username : state === 'loading' ? 'sæki…' : ''} disabled={!ready} maxLength={40} autoComplete="given-name" />
        <label className="b-modal__label" htmlFor="w-contact-email">Netfang</label>
        <input id="w-contact-email" type="email" className={`b-input${error ? ' is-error' : ''}`} value={address} onChange={e => setAddress(e.target.value)} placeholder={ready ? 'nafn@dæmi.is' : state === 'loading' ? 'sæki…' : ''} disabled={!ready} autoComplete="email" />
        <label className="b-modal__check">
          <input type="checkbox" checked={nights} onChange={e => setNights(e.target.checked)} disabled={!ready} />
          Póstur þegar bál er kveikt, þegar kvöldið er ákveðið, og hálftíma áður en það hefst
        </label>
        <p className="b-modal__ok">Autt nafn: bréfin segja {username}. Autt netfang: enginn póstur.</p>
        {state === 'failed' && (
          <p className="b-err" role="alert">
            Náði ekki í það sem er skráð, svo ekkert verður vistað í bili.{' '}
            <button type="button" className="b-link" onClick={() => setAttempt(a => a + 1)}>Reyna aftur</button>
          </p>
        )}
        {error && <p className="b-err" role="alert">{error}</p>}
        <div className="b-modal__actions">
          <button type="submit" className="b-btn b-btn--solid" disabled={loading || !ready}>{loading ? 'Vista…' : 'Vista'}</button>
          <button type="button" className="b-btn" onClick={onClose}>Hætta við</button>
        </div>
      </form>
    </div>
  );
}
