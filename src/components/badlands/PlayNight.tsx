'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PublicNight } from '@/app/api/playnight/route';
import { Campfire } from './Bits';
import PlayerHead from './PlayerHead';
import type { ServerState } from './hooks';
import { useMounted } from './hooks';
import { TIME_CHOICES, WhenAt, dayChoices, dayOf, usePlayNight, whenAt } from './night';
import { plural } from '@/lib/format';

/* Næsta spilakvöld (src/lib/play-night.ts). The hero carries one line about
   it under the server's lantern; the crew's room holds the fire itself:
   lighting one, answering, choosing the night, starting the server. */

const chosenOf = (n: PublicNight) => n.options.find(o => o.id === n.chosen) ?? null;
const lower = (s: string) => s.toLowerCase();

/** A fire that grows with everyone who can make it: from a spark to a blaze at eight. */
function Fire({ count, embers = false, big = false }: { count: number; embers?: boolean; big?: boolean }) {
  const size = embers ? 2.5 : (big ? 3.5 : 2.25) + Math.min(8, count) * (big ? 0.45 : 0.3);
  return <span className="b-night__fire" style={{ '--fire': `${size}rem` } as React.CSSProperties}><Campfire embers={embers} /></span>;
}

function Heads({ names, lit }: { names: string[]; lit?: (n: string) => boolean }) {
  if (names.length === 0) return null;
  return (
    <span className="b-night__heads">
      {names.map(n => <span key={n} className={`b-night__head${lit?.(n) ? ' is-in' : ''}`} title={n}><PlayerHead name={n} size={24} /></span>)}
    </span>
  );
}

/* ─── the hero's line ─────────────────────────────────────────────────── */

/** One line under the server's lantern while a fire burns; a tap opens the crew's room, where it is. */
export function NightLine() {
  const { state } = usePlayNight();
  const mounted = useMounted();
  const night = state?.night;
  if (!mounted || !night) return null;
  const chosen = chosenOf(night);
  const yes = chosen?.yes ?? [];
  let text: string;
  if (night.phase === 'open') {
    const most = Math.max(...night.options.map(o => o.yes.length));
    text = `Kvöld í kortunum · ${night.options.length} ${plural(night.options.length, 'tími', 'tímar')}${most ? ` · allt að ${most} geta` : ''}`;
  } else if (night.phase === 'live') {
    text = `Kvöldið er hafið · ${night.came.filter(n => yes.some(y => lower(y) === lower(n))).length} af ${yes.length} komin`;
  } else if (night.phase === 'over') {
    text = `${dayOf(chosen!.at)} · ${night.came.length} ${plural(night.came.length, 'mætti', 'mættu')}`;
  } else {
    text = `${WhenAt(chosen!.at)} · ${yes.length} ${plural(yes.length, 'mætir', 'mæta')}`;
  }
  return (
    <a href="#hopur" className={`b-nightline${night.phase === 'over' ? ' is-embers' : ''}`}>
      <Fire count={night.phase === 'open' ? Math.max(...night.options.map(o => o.yes.length)) : yes.length} embers={night.phase === 'over'} />
      <span className="b-nightline__text">
        <span className="b-nightline__kicker">Næsta spilakvöld</span>
        <span>{text}</span>
        {night.phase !== 'open' && <Heads names={night.phase === 'over' ? night.came : yes} />}
      </span>
    </a>
  );
}

/* ─── the fire in the crew's room ─────────────────────────────────────── */

export function NightBoard({ server }: { server: ServerState }) {
  const { state, act } = usePlayNight();
  const mounted = useMounted();
  const [lighting, setLighting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  if (!mounted || state === undefined) return null;
  const { night, me } = state;

  const run = async (body: Record<string, unknown>) => {
    setBusy(true); setErr('');
    const e = await act(body);
    setBusy(false);
    if (e) setErr(e);
    return !e;
  };

  const share = async () => {
    const url = `${window.location.origin}/kvold#hopur`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && matchMedia('(pointer: coarse)').matches) {
      try { await nav.share({ title: 'Næsta spilakvöld · JOÐ', url }); return; } catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt('Afritaðu hlekkinn:', url); }
  };

  if (!night) {
    if (lighting && me) return <LightFire busy={busy} err={err} onCancel={() => { setLighting(false); setErr(''); }} onLight={async (times, note) => { if (await run({ action: 'propose', times, note })) setLighting(false); }} />;
    return (
      <section className="b-night b-night--none" aria-label="Næsta spilakvöld">
        <Fire count={0} embers />
        <div className="b-night__body">
          <h3 className="b-night__title">Næsta spilakvöld</h3>
          <p className="b-note">{me ? 'Ekkert bál logar. Kveiktu eitt og sjáðu hver kemur.' : 'Ekkert kvöld á dagskrá.'}</p>
        </div>
        {me ? <button type="button" className="b-btn b-btn--solid b-btn--small" onClick={() => setLighting(true)}>Kveikja bál</button>
            : <Link href="/crew" className="b-btn b-btn--small b-btn--ghost">Skrá sig inn</Link>}
      </section>
    );
  }

  const mine = me ? night.options.filter(o => o.yes.some(y => lower(y) === lower(me))).map(o => o.id) : [];
  const mineIsBy = !!me && lower(night.by) === lower(me);
  const chosen = chosenOf(night);
  const online = !!server.online;
  const inGame = (n: string) => online && server.list.some(p => lower(p) === lower(n));
  const came = (n: string) => inGame(n) || night.came.some(c => lower(c) === lower(n));
  const toggle = (id: string) => run({ action: 'vote', yes: mine.includes(id) ? mine.filter(x => x !== id) : [...mine, id] });

  return (
    <section className={`b-night b-night--${night.phase}`} aria-label="Næsta spilakvöld">
      <header className="b-night__top">
        <h3 className="b-night__title">
          {night.phase === 'open' ? 'Kvöld í kortunum' :
           night.phase === 'live' ? 'Kvöldið er hafið' :
           night.phase === 'over' ? dayOf(chosen!.at) :
           WhenAt(chosen!.at)}
        </h3>
        <p className="b-note">
          {night.note && <><q>{night.note}</q> · </>}{night.by} kveikti bálið
          {night.phase === 'open' && `. Kvöldið velst sjálft ${whenAt(night.decidesAt)}, sá tími sem flest geta.`}
        </p>
      </header>

      {night.phase === 'open' ? (
        <ul className="b-night__options">
          {night.options.map(o => {
            const on = mine.includes(o.id);
            return (
              <li key={o.id} className={`b-night__option${on ? ' is-on' : ''}`}>
                <Fire count={o.yes.length} />
                <span className="b-night__when">{WhenAt(o.at)}</span>
                <span className="b-note">{o.yes.length ? `${o.yes.length} ${plural(o.yes.length, 'getur', 'geta')}` : 'enginn enn'}</span>
                <Heads names={o.yes} />
                {me && (
                  <span className="b-inline">
                    <button type="button" className={`b-btn b-btn--small${on ? ' b-btn--solid' : ''}`} aria-pressed={on} disabled={busy} onClick={() => toggle(o.id)}>{on ? 'Ég get ✓' : 'Ég get'}</button>
                    {mineIsBy && <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => run({ action: 'choose', option: o.id })}>Velja</button>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="b-night__one">
          <Fire count={chosen!.yes.length} embers={night.phase === 'over'} big />
          <div className="b-night__body">
            {night.phase === 'over' ? (
              <p className="b-night__count">{night.came.length} {plural(night.came.length, 'mætti', 'mættu')}</p>
            ) : night.phase === 'live' ? (
              <p className="b-night__count">{chosen!.yes.filter(came).length} af {chosen!.yes.length} komin</p>
            ) : (
              <p className="b-night__count">{chosen!.yes.length} {plural(chosen!.yes.length, 'mætir', 'mæta')}</p>
            )}
            <Heads names={night.phase === 'over' ? night.came : chosen!.yes} lit={night.phase === 'live' ? came : undefined} />
            {night.startedBy && night.phase !== 'over' && <p className="b-note">{night.startedBy} kveikti á þjóninum.</p>}
          </div>
        </div>
      )}

      {me && night.phase !== 'over' && (
        <div className="b-inline b-night__mine">
          {night.phase !== 'open' && night.phase !== 'live' && (
            <>
              <button type="button" className={`b-btn b-btn--small${mine.length ? ' b-btn--solid' : ''}`} aria-pressed={mine.length > 0} disabled={busy} onClick={() => run({ action: 'vote', yes: [chosen!.id] })}>Mæti</button>
              <button type="button" className={`b-btn b-btn--small${!mine.length ? ' is-on' : ''}`} aria-pressed={mine.length === 0} disabled={busy} onClick={() => run({ action: 'vote', yes: [] })}>Kemst ekki</button>
            </>
          )}
          {night.phase === 'open' && mine.length > 0 && (
            <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => run({ action: 'vote', yes: [] })}>Kemst ekki</button>
          )}
          {(night.phase === 'soon' || night.phase === 'live') && mine.length > 0 && server.online === false && (
            <button type="button" className="b-btn b-btn--solid" disabled={busy} onClick={() => run({ action: 'start' })}>Kveikja á þjóninum</button>
          )}
          <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={share}>{copied ? 'Afritað' : 'Deila'}</button>
          {mineIsBy && night.phase !== 'live' && (
            <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => { if (confirm('Slökkva bálið? Kvöldið fellur niður.')) run({ action: 'cancel' }); }}>Slökkva bálið</button>
          )}
        </div>
      )}
      {!me && night.phase !== 'over' && night.phase !== 'live' && <p className="b-note"><Link href="/crew" className="b-link">Skráðu þig inn</Link> til að svara.</p>}
      {me && night.phase === 'over' && (
        <div className="b-inline b-night__mine">
          <button type="button" className="b-btn b-btn--small" onClick={() => { setErr(''); setLighting(true); }}>Kveikja nýtt bál</button>
        </div>
      )}
      {lighting && me && night.phase === 'over' && (
        <LightFire busy={busy} err={err} onCancel={() => { setLighting(false); setErr(''); }} onLight={async (times, note) => { if (await run({ action: 'propose', times, note })) setLighting(false); }} />
      )}
      {err && !lighting && <p className="b-err" role="alert">{err}</p>}
    </section>
  );
}

/* ─── lighting a fire ─────────────────────────────────────────────────── */

function LightFire({ busy, err, onLight, onCancel }: { busy: boolean; err: string; onLight: (times: string[], note: string) => void; onCancel: () => void }) {
  const days = useMemo(() => dayChoices(), []);
  const [rows, setRows] = useState([{ day: days[0].value, time: '20:00' }]);
  const [note, setNote] = useState('');
  const set = (i: number, key: 'day' | 'time', v: string) => setRows(rs => rs.map((r, k) => (k === i ? { ...r, [key]: v } : r)));

  return (
    <form className="b-night b-night--light" aria-label="Kveikja bál" onSubmit={e => { e.preventDefault(); onLight(rows.map(r => `${r.day}T${r.time}:00Z`), note); }}>
      <header className="b-night__top">
        <h3 className="b-night__title">Kveikja bál</h3>
        <p className="b-note">Einn til þrír tímar. Hópurinn segir hvaða tímar henta og kvöldið velst þremur tímum fyrir þann fyrsta, nema þú veljir fyrr.</p>
      </header>
      {rows.map((r, i) => (
        <div key={i} className="b-inline b-night__row">
          <select className="b-input b-night__select" aria-label={`Dagur ${i + 1}`} value={r.day} onChange={e => set(i, 'day', e.target.value)}>
            {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select className="b-input b-night__select" aria-label={`Klukkan ${i + 1}`} value={r.time} onChange={e => set(i, 'time', e.target.value)}>
            {TIME_CHOICES.map(t => <option key={t} value={t}>kl. {t}</option>)}
          </select>
          {rows.length > 1 && <button type="button" className="b-btn b-btn--small b-btn--ghost" aria-label={`Fjarlægja tíma ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}>✕</button>}
        </div>
      ))}
      {rows.length < 3 && (
        <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={() => setRows(rs => [...rs, { day: days[Math.min(rs.length, days.length - 1)].value, time: rs[rs.length - 1].time }])}>+ Annar tími</button>
      )}
      <input className="b-input" placeholder="Hvað á að gera? (má sleppa)" maxLength={80} value={note} onChange={e => setNote(e.target.value)} aria-label="Hvað á að gera" />
      {err && <p className="b-err" role="alert">{err}</p>}
      <div className="b-inline">
        <button type="submit" className="b-btn b-btn--solid" disabled={busy}>{busy ? 'Kveiki…' : 'Kveikja bál'}</button>
        <button type="button" className="b-btn b-btn--ghost" onClick={onCancel}>Hætta við</button>
      </div>
    </form>
  );
}
