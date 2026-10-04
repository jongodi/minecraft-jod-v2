'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicNight } from '@/app/api/playnight/route';
import { CalendarIcon, CheckIcon, ChevronIcon, CloseIcon } from './Bits';
import Calendar from './Calendar';
import type { ServerState } from './hooks';
import { expectStarting, useMounted } from './hooks';
import { isChanging } from '@/lib/server-state';
import { LAST_DAY_AHEAD, TIME_CHOICES, WhenAt, dayLabel, dayLong, dayNum, dayOf, dayValue, isLate, usePlayNight, whenAt } from './night';
import { Fire, Heads, chosenOf, lower } from './NightLine';
import { plural } from '@/lib/format';
import { toast } from './Toast';

/* Spilakvöld (src/lib/play-night.ts). The crew's room holds the fires
   themselves, up to five planned at once, soonest first: lighting one,
   answering, choosing the night, starting the server. The hero's one line
   about the next one is NightLine.tsx, so the first bundle carries that
   line and not this room. */

/* ─── the fires in the crew's room ────────────────────────────────────── */

export function NightBoard({ server }: { server: ServerState }) {
  const { state, act } = usePlayNight();
  const mounted = useMounted();
  const [lighting, setLighting] = useState(false);
  const [busy, setBusy] = useState(false);
  /* an error goes by the fire it came from, or the new one ('new') */
  const [err, setErr] = useState<{ at: string; text: string } | null>(null);
  /* /kvold/<id> is one night's link: that fire is lit up and brought into view */
  const [picked, setPicked] = useState<string | null>(null);
  const shown = useRef(false);
  useEffect(() => { setPicked(/^\/kvold\/([^/]+)/.exec(window.location.pathname)?.[1] ?? null); }, []);
  useEffect(() => {
    if (!picked || shown.current || !state) return;
    const el = document.querySelector(`[data-night="${CSS.escape(picked)}"]`);
    if (!el) return;
    shown.current = true;
    el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [picked, state]);

  if (!mounted || state === undefined) return null;
  const { nights, me, max } = state;
  const planned = nights.filter(n => n.phase !== 'over').length;

  const run = async (at: string, body: Record<string, unknown>) => {
    setBusy(true); setErr(null);
    const e = await act(body);
    setBusy(false);
    if (e) setErr({ at, text: e });
    /* the server was asked to start: the lantern kindles at once, and the status is asked again soon */
    else if (body.action === 'start') expectStarting();
    return !e;
  };

  const share = async (id: string) => {
    const url = `${window.location.origin}/kvold/${id}#hopur`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && matchMedia('(pointer: coarse)').matches) {
      try { await nav.share({ title: 'Spilakvöld · JOÐ', url }); return; } catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Afritað', 'hlekkur á kvöldið', 'límdu hann í spjallið'); }
    catch { window.prompt('Afritaðu hlekkinn:', url); }
  };

  const lightFire = (
    <LightFire
      busy={busy}
      err={err?.at === 'new' ? err.text : ''}
      onCancel={() => { setLighting(false); setErr(null); }}
      onLight={async (times, note) => { if (await run('new', { action: 'propose', times, note })) setLighting(false); }}
    />
  );

  if (nights.length === 0) {
    if (lighting && me) return lightFire;
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

  return (
    <div className="b-nights">
      {nights.map((n, i) => (
        <NightFire
          key={n.id}
          night={n}
          kicker={n.phase === 'over' ? 'Síðasta spilakvöld' : i === 0 ? 'Næsta spilakvöld' : 'Á dagskrá'}
          me={me}
          server={server}
          busy={busy}
          err={err?.at === n.id ? err.text : ''}
          picked={picked === n.id}
          onRun={body => run(n.id, { ...body, night: n.id })}
          onShare={() => share(n.id)}
        />
      ))}
      {me && (lighting ? lightFire : planned < max ? (
        <button type="button" className="b-btn b-btn--small b-nights__more" onClick={() => { setErr(null); setLighting(true); }}>
          {planned === 0 ? 'Kveikja nýtt bál' : '+ Kveikja annað bál'}
        </button>
      ) : (
        <p className="b-note b-nights__full">{max} kvöld eru á dagskrá, eins mörg og komast í einu. Nýtt bál má kveikja þegar eitt er liðið.</p>
      ))}
    </div>
  );
}

/** One fire: the times it offers and who can make each, or the night chosen and who is coming. */
function NightFire({ night, kicker, me, server, busy, err, picked, onRun, onShare }: {
  night: PublicNight; kicker: string; me: string | null; server: ServerState;
  busy: boolean; err: string; picked: boolean;
  onRun: (body: Record<string, unknown>) => void; onShare: () => void;
}) {
  const mine = me ? night.options.filter(o => o.yes.some(y => lower(y) === lower(me))).map(o => o.id) : [];
  const mineIsBy = !!me && lower(night.by) === lower(me);
  const chosen = chosenOf(night);
  const online = !!server.online;
  const inGame = (n: string) => online && server.list.some(p => lower(p) === lower(n));
  const came = (n: string) => inGame(n) || night.came.some(c => lower(c) === lower(n));
  const toggle = (id: string) => onRun({ action: 'vote', yes: mine.includes(id) ? mine.filter(x => x !== id) : [...mine, id] });
  const title = night.phase === 'open' ? 'Kvöld í kortunum' :
    night.phase === 'live' ? 'Kvöldið er hafið' :
    night.phase === 'over' ? dayOf(chosen!.at) :
    WhenAt(chosen!.at);

  return (
    <section className={`b-night b-night--${night.phase}${picked ? ' is-picked' : ''}`} data-night={night.id} aria-label={`${kicker}: ${title}`}>
      <header className="b-night__top">
        <span className="b-night__kicker">{kicker}</span>
        <h3 className="b-night__title">{title}</h3>
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
                    <button type="button" className={`b-btn b-btn--small${on ? ' b-btn--solid' : ''}`} aria-pressed={on} disabled={busy} onClick={() => toggle(o.id)}>Ég get{on && <CheckIcon className="b-btn__icon" />}</button>
                    {mineIsBy && <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => onRun({ action: 'choose', option: o.id })}>Velja</button>}
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
              <button type="button" className={`b-btn b-btn--small${mine.length ? ' b-btn--solid' : ''}`} aria-pressed={mine.length > 0} disabled={busy} onClick={() => onRun({ action: 'vote', yes: [chosen!.id] })}>Mæti</button>
              <button type="button" className={`b-btn b-btn--small${!mine.length ? ' is-on' : ''}`} aria-pressed={mine.length === 0} disabled={busy} onClick={() => onRun({ action: 'vote', yes: [] })}>Kemst ekki</button>
            </>
          )}
          {night.phase === 'open' && mine.length > 0 && (
            <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => onRun({ action: 'vote', yes: [] })}>Kemst ekki</button>
          )}
          {(night.phase === 'soon' || night.phase === 'live') && mine.length > 0 && (server.life === 'off' || server.life === 'crashed') && (
            <button type="button" className="b-btn b-btn--solid" disabled={busy} onClick={() => onRun({ action: 'start' })}>Kveikja á þjóninum</button>
          )}
          {(night.phase === 'soon' || night.phase === 'live') && isChanging(server.life) && (
            <span className="b-note" role="status">{server.life === 'stopping' ? 'Þjónninn er að slokkna.' : 'Þjónninn er að vakna, komdu inn eftir augnablik.'}</span>
          )}
          <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={onShare}>Deila</button>
          {/* a chosen night goes in the phone's calendar: a calendar file, opened by the calendar app */}
          {night.phase !== 'open' && night.phase !== 'live' && (
            <a href={`/kvold/${night.id}/dagatal.ics`} className="b-btn b-btn--small b-btn--ghost" title="Setja kvöldið í dagatalið"><CalendarIcon className="b-btn__icon" />Í dagatalið</a>
          )}
          {mineIsBy && night.phase !== 'live' && (
            <button type="button" className="b-btn b-btn--small b-btn--ghost" disabled={busy} onClick={() => { if (confirm('Slökkva bálið? Kvöldið fellur niður.')) onRun({ action: 'cancel' }); }}>Slökkva bálið</button>
          )}
        </div>
      )}
      {!me && night.phase !== 'over' && night.phase !== 'live' && <p className="b-note"><Link href="/crew" className="b-link">Skráðu þig inn</Link> til að svara.</p>}
      {err && <p className="b-err" role="alert">{err}</p>}
    </section>
  );
}

/* ─── lighting a fire ─────────────────────────────────────────────────── */

function LightFire({ busy, err, onLight, onCancel }: { busy: boolean; err: string; onLight: (times: string[], note: string) => void; onCancel: () => void }) {
  /* the clock as the form opened; the server checks the times again when the fire is lit */
  const [now] = useState(() => Date.now());
  const today = Math.floor(now / 86_400_000);
  const late = (day: string, time: string) => isLate(day, time, now);
  const first = TIME_CHOICES.some(t => !late(dayValue(today), t)) ? today : today + 1;
  const last = today + LAST_DAY_AHEAD;
  /** the time kept when the day changes, or the first that is still ahead */
  const fit = (day: string, time: string) => (late(day, time) ? TIME_CHOICES.find(t => !late(day, t)) ?? time : time);
  const [rows, setRows] = useState(() => [{ day: dayValue(late(dayValue(today), '20:00') ? today + 1 : today), time: '20:00' }]);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();
  const trigger = (i: number) => `${id}-dagur-${i}`;
  const set = (i: number, key: 'day' | 'time', v: string) => setRows(rs => rs.map((r, k) => (k !== i ? r : key === 'day' ? { day: v, time: fit(v, r.time) } : { ...r, time: v })));
  const pick = (i: number, v: string) => {
    set(i, 'day', v);
    setOpen(null);
    document.getElementById(trigger(i))?.focus();
  };
  const close = useCallback(() => setOpen(null), []);

  return (
    <form className="b-night b-night--light" aria-label="Kveikja bál" onSubmit={e => { e.preventDefault(); onLight(rows.map(r => `${r.day}T${r.time}:00Z`), note); }}>
      <header className="b-night__top">
        <h3 className="b-night__title">Kveikja bál</h3>
        <p className="b-note">Einn til þrír tímar. Hópurinn segir hvaða tímar henta og kvöldið velst þremur tímum fyrir þann fyrsta, nema þú veljir fyrr.</p>
      </header>
      {rows.map((r, i) => (
        <div key={i} className="b-inline b-night__row">
          <button
            type="button"
            id={trigger(i)}
            className={`b-input b-night__day${open === i ? ' is-open' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={open === i}
            aria-label={`Dagur ${i + 1}: ${dayLong(r.day)}`}
            onClick={() => setOpen(o => (o === i ? null : i))}
          >
            <CalendarIcon className="b-night__dayicon" />
            <span className="b-night__daytext">{dayLabel(r.day, new Date(now))}</span>
            <ChevronIcon dir="down" className="b-night__daycaret" />
          </button>
          <select className="b-input b-night__select" aria-label={`Klukkan ${i + 1}`} value={r.time} onChange={e => set(i, 'time', e.target.value)}>
            {TIME_CHOICES.map(t => <option key={t} value={t} disabled={late(r.day, t)}>kl. {t}</option>)}
          </select>
          {rows.length > 1 && <button type="button" className="b-btn b-btn--small b-btn--ghost b-night__drop" aria-label={`Fjarlægja tíma ${i + 1}`} onClick={() => { setOpen(null); setRows(rs => rs.filter((_, k) => k !== i)); }}><CloseIcon className="b-btn__icon" /></button>}
          {open === i && <Calendar value={r.day} today={today} min={first} max={last} triggerId={trigger(i)} onPick={v => pick(i, v)} onClose={close} />}
        </div>
      ))}
      {rows.length < 3 && (
        <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={() => { setOpen(null); setRows(rs => { const r = rs[rs.length - 1]; const day = dayValue(Math.min(last, dayNum(r.day) + 1)); return [...rs, { day, time: fit(day, r.time) }]; }); }}>+ Annar tími</button>
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
