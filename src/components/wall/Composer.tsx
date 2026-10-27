'use client';

// The pin slot: where things go up, on a member's own wall and on the board.
// Drop screenshots on it, paste them, pick several, or just write. Each
// picture starts uploading the moment it lands, gets a caption line, and
// the whole lot is pinned with one press. The same slot puts up a call for
// something with its reward (Óskast) or a question with its answers; @name
// in the words calls one of the crew, who gets a letter.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { CrewEntry } from '@/lib/crew-types';
import { LIMITS } from '@/lib/crew-types';
import { fetchStorageInfo, uploadPrint, errorFrom, failure, type StorageInfo, type UploadedPrint } from '@/lib/crew-upload';
import { isPicture } from '@/lib/client-image';
import { formatDate, plural } from '@/lib/format';
import { CloseIcon } from '@/components/badlands/Bits';
import PlayerHead from '@/components/badlands/PlayerHead';
import { CREW } from '@/components/badlands/data';
import type { WallPlace } from './Wall';

interface Draft {
  key:      string;
  file:     File;
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
  /** whether pictures pasted or dropped anywhere on the page come here: not while the board's room is closed */
  active?:  boolean;
  /** on the board: one line until it is used, so the news is the first thing under the filters */
  compact?: boolean;
  /** a call or a question asked for from elsewhere on the board: the slot turns to it and takes the keyboard */
  ask?:     Ask | null;
}

/** A request to put up a call or a question; `n` makes each press a new one. */
export interface Ask { kind: 'call' | 'ask'; n: number }

/** What goes up: a note (with or without prints), a call for something, or a question. */
type Kind = 'note' | 'call' | 'ask';
const KINDS: { id: Kind; label: string; text: string }[] = [
  { id: 'note', label: 'Miði',     text: 'Hvað er að frétta úr heiminum?' },
  { id: 'call', label: 'Óskast',   text: 'Hvað vantar þig? Til dæmis þrjá stakka af járni' },
  { id: 'ask',  label: 'Spurning', text: 'Hvað viltu spyrja hópinn um?' },
];

/** The name being typed after an @ at the caret, if any. */
const typingName = (text: string, caret: number) => /(?:^|[^\p{L}\p{N}_@])@([A-Za-z0-9_]{0,16})$/u.exec(text.slice(0, caret))?.[1] ?? null;

const newKey = () => Math.random().toString(36).slice(2);


export default function Composer({ username, places, onPinned, active = true, compact = false, ask = null }: Props) {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [kind, setKind]       = useState<Kind>('note');
  const [reward, setReward]   = useState('');
  /* each answer with an id of its own, so taking one out leaves the others' rows, and their focus, where they were */
  const choiceSeq = useRef(2);
  const [choices, setChoices] = useState(() => [{ id: 1, text: '' }, { id: 2, text: '' }]);
  const freshChoices = () => [{ id: ++choiceSeq.current, text: '' }, { id: ++choiceSeq.current, text: '' }];
  /* An answer taken out gives the keyboard to the one before it (the one
     after, for the first): the rows' remove buttons go with the third
     answer, and the keyboard fell to the top of the page, or stayed on the
     next row's remove, where a second press took another answer out. */
  const dropChoice = (i: number) => {
    const next = choices[i - 1] ?? choices[i + 1];
    setChoices(cs => cs.filter((_, j) => j !== i));
    if (next) requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-choice="${next.id}"]`)?.focus());
  };
  const [text, setText]       = useState('');
  /* who could be meant by the name being typed after an @ */
  const [caret, setCaret]     = useState(0);
  const words = useRef<HTMLTextAreaElement>(null);
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [drafts, setDrafts]   = useState<Draft[]>([]);
  const [over, setOver]       = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError]     = useState('');
  const input = useRef<HTMLInputElement>(null);
  const slot  = useRef<HTMLFormElement>(null);
  /* read by the page's paste and drop listeners as well as the slot's own buttons, so it is a ref beside the state */
  const pinningNow = useRef(false);

  /* How uploads work right now, asked when the slot opens and again when a
     picture is sent again, since the failure may have been the store's. A
     picture that lands before the answer waits for it. */
  const asking = useRef<Promise<StorageInfo> | null>(null);
  const askStorage = useCallback(() => {
    const req: Promise<StorageInfo> = fetchStorageInfo(username).then(info => { if (asking.current === req) setStorage(info); return info; });
    asking.current = req;
    return req;
  }, [username]);
  useEffect(() => { askStorage(); }, [askStorage]);
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

  const send = useCallback((d: Draft, askAgain = false) => {
    const info = askAgain || !asking.current ? askStorage() : asking.current;
    info
      .then(i => uploadPrint(username, d.file, i, pct => patch(d.key, { progress: pct })))
      .then(done => { if (dropped.current.has(d.key)) discard(done); else patch(d.key, { done, progress: 100 }); })
      .catch(e => patch(d.key, { error: failure(e, 'Upphleðsla mistókst.') }));
  }, [askStorage, patch, username, discard]);

  const add = useCallback((files: File[]) => {
    const images = files.filter(isPicture);
    /* what was turned away is said, rather than vanishing: a dropped PDF did nothing at all */
    const others = files.length - images.length;
    const turnedAway = others > 0 ? `${others === 1 ? 'Ein skrá var ekki mynd' : `${others} ${plural(others, 'skrá var ekki mynd', 'skrár voru ekki myndir')}`} og ${plural(others, 'fór', 'fóru')} ekki með.` : '';
    if (images.length === 0) { if (turnedAway) setError(`${turnedAway} Veldu PNG, JPEG eða WebP.`); return; }
    /* the slot holds still while what is in it goes up */
    if (pinningNow.current) { setError('Bíddu andartak, verið er að festa upp það sem er í hólfinu.'); return; }
    /* A store that is not there turns the picture away at the door, rather
       than letting it in to fail at once. It is asked again, so a store that
       was only out of reach a moment ago takes the next try. */
    if (storage?.mode === 'none') {
      askStorage();
      setError(`${storage.error ?? 'Myndageymslan er ekki stillt.'} Myndir komast ekki upp í bili.`);
      return;
    }
    const room = LIMITS.photosPer - drafts.length;
    if (room <= 0) { setError(`Mest ${LIMITS.photosPer} myndir í einu.`); return; }
    const left = images.length - room;
    setError([left > 0 ? `Mest ${LIMITS.photosPer} myndir í einu; ${left} ${plural(left, 'komst', 'komust')} ekki með.` : '', turnedAway].filter(Boolean).join(' '));
    const fresh: Draft[] = images.slice(0, room).map(f => ({ key: newKey(), file: f, name: f.name, preview: URL.createObjectURL(f), caption: '', progress: 0, done: null, error: null }));
    setDrafts(ds => [...ds, ...fresh]);
    fresh.forEach(d => send(d));
  }, [askStorage, drafts.length, send, storage]);

  /* a print whose upload failed stays in the slot, red, until it is sent again or taken out */
  const retry = (d: Draft) => {
    if (pinningNow.current) return;
    patch(d.key, { error: null, progress: 0 });
    send(d, true);
  };

  /* Taken out of the slot: the preview goes, and so does the copy already in the store. */
  const remove = (key: string) => {
    /* not while the pin that carries it is being written: its copy would be deleted from under the entry */
    if (pinningNow.current) return;
    const d = drafts.find(x => x.key === key);
    if (!d) return;
    URL.revokeObjectURL(d.preview);
    if (d.done) discard(d.done);
    else if (!d.error) dropped.current.add(key);
    setDrafts(ds => ds.filter(x => x.key !== key));
  };

  /* Dropped or pasted anywhere on the page, the picture lands in the slot. */
  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(isPicture);
      if (files.length === 0) return;
      /* A copy from a spreadsheet or a document carries a picture of the
         words beside the words themselves; pasted into a field, the words
         are what was meant. */
      const t = e.target;
      const field = t instanceof HTMLElement && (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement);
      if (field && e.clipboardData?.getData('text/plain').trim()) return;
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
  }, [add, active]);

  const uploading = drafts.some(d => !d.done && !d.error);
  /* pinning past a failed print would leave it out and then clear it from the slot without a word */
  const failed = drafts.some(d => d.error);
  const ready = drafts.filter(d => d.done);
  const filled = choices.map(c => c.text.trim()).filter(Boolean);
  const canPin = !pinning && !uploading && !failed && (
    kind === 'call' ? text.trim().length > 0 && reward.trim().length > 0 :
    kind === 'ask' ? text.trim().length > 0 && filled.length >= LIMITS.choicesMin :
    text.trim().length > 0 || ready.length > 0);

  /* asked for from Á döfinni: the slot turns to a call or a question and takes the keyboard */
  useEffect(() => {
    if (!ask) return;
    setKind(ask.kind);
    slot.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    requestAnimationFrame(() => words.current?.focus({ preventScroll: true }));
  }, [ask]);
  /* on the board, untouched, it is one line: the place, the note on how pictures get in and the button come once it is used */
  const quiet = compact && kind === 'note' && !text && drafts.length === 0 && !pinning && !error;

  /* the crew who could be meant by what is typed after an @, the writer left out */
  const typing = typingName(text, caret);
  const named = typing === null ? [] : CREW.filter(n => n.toLowerCase() !== username.toLowerCase() && n.toLowerCase().startsWith(typing.toLowerCase())).slice(0, 4);
  const callBy = (name: string) => {
    const before = text.slice(0, caret).replace(/@[A-Za-z0-9_]*$/, `@${name} `);
    const next = before + text.slice(caret);
    setText(next);
    setCaret(before.length);
    requestAnimationFrame(() => { const el = words.current; if (el) { el.focus(); el.setSelectionRange(before.length, before.length); } });
  };

  async function pin(e: FormEvent) {
    e.preventDefault();
    if (!canPin || pinningNow.current) return;
    pinningNow.current = true;
    setPinning(true);
    setError('');
    /* what goes up with this pin; anything else in the slot stays there */
    const pinned = new Set(ready.map(d => d.key));
    try {
      const res = await fetch(`/api/crew/${username}/entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          placeId,
          photos: ready.map(d => ({ ...d.done!, caption: d.caption })),
          ...(kind === 'call' ? { bounty: { reward } } : kind === 'ask' ? { poll: { choices: filled } } : {}),
        }),
      });
      if (!res.ok) throw new Error(await errorFrom(res));
      const entry = await res.json() as CrewEntry;
      onPinned(entry);
      ready.forEach(d => URL.revokeObjectURL(d.preview));
      setDrafts(ds => ds.filter(d => !pinned.has(d.key)));
      setText(''); setPlaceId(null); setReward(''); setChoices(freshChoices()); setKind('note');
    } catch (err) {
      setError(failure(err, 'Ekki tókst að festa þetta upp.'));
    } finally {
      pinningNow.current = false;
      setPinning(false);
    }
  }


  /* how prints get in: a phone has nothing to drag, so it is told what it can do (wall.css keeps one) */
  const storageNote =
    !storage ? 'athuga geymsluna' :
    storage.mode === 'none' ? (storage.error ?? 'myndageymsla er ekki stillt') :
    storage.error ? storage.error :
    <><span className="w-pin__how w-pin__how--drag">dragðu skjámyndir hingað, límdu þær, eða veldu þær</span><span className="w-pin__how w-pin__how--tap">veldu myndir eða límdu þær</span></>;

  return (
    <form ref={slot} className={`w-pin w-pin--${kind}${compact ? ' w-pin--compact' : ''}${quiet ? ' is-quiet' : ''}${over ? ' is-over' : ''}${drafts.length ? ' has-prints' : ''}`} onSubmit={pin} aria-label="Festa eitthvað upp" aria-busy={pinning}>
      {/* what goes up: a note, a call for something, or a question */}
      <div className="w-pin__kinds" role="group" aria-label="Hvað fer upp">
        {KINDS.map(k => (
          <button key={k.id} type="button" aria-pressed={kind === k.id} className={`w-pin__kind${kind === k.id ? ' is-on' : ''}`} onClick={() => setKind(k.id)} disabled={pinning}>{k.label}</button>
        ))}
      </div>
      {/* While the pin is being written the slot holds still: the words and
          captions read only, so focus stays where it was, and the buttons
          off. A change made then would be left out of the entry and then
          cleared from the slot with it. */}
      <textarea
        ref={words}
        className="w-pin__text"
        value={text}
        readOnly={pinning}
        onChange={e => { setText(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
        onSelect={e => setCaret(e.currentTarget.selectionStart ?? 0)}
        maxLength={LIMITS.text}
        rows={2}
        placeholder={KINDS.find(k => k.id === kind)!.text}
        aria-label={kind === 'call' ? 'Hvað vantar' : kind === 'ask' ? 'Spurningin' : 'Miði'}
      />
      {/* @ and the start of a name: the crew it could be, a tap to finish it */}
      {named.length > 0 && (
        <div className="w-pin__names" aria-label="Nefna félaga">
          {named.map(n => (
            <button key={n} type="button" className="w-pin__name" onClick={() => callBy(n)}><PlayerHead name={n} size={16} alt="" />@{n}</button>
          ))}
        </div>
      )}
      {kind === 'call' && (
        <label className="w-pin__reward">
          <span className="b-poster__reward">Verðlaun</span>
          <input className="b-input" value={reward} readOnly={pinning} onChange={e => setReward(e.target.value)} maxLength={LIMITS.reward} placeholder="til dæmis 10 smaragðar" />
        </label>
      )}
      {kind === 'ask' && (
        <div className="w-pin__choices">
          {choices.map((c, i) => (
            <div key={c.id} className="w-pin__choice">
              <input className="b-input" data-choice={c.id} value={c.text} readOnly={pinning} maxLength={LIMITS.choice} placeholder={`Svar ${i + 1}`} aria-label={`Svarkostur ${i + 1}`}
                onChange={e => setChoices(cs => cs.map(x => (x.id === c.id ? { ...x, text: e.target.value } : x)))} />
              {choices.length > LIMITS.choicesMin && (
                <button type="button" className="w-pin__drop" onClick={() => dropChoice(i)} disabled={pinning} aria-label={`Taka svar ${i + 1} út`}><CloseIcon /></button>
              )}
            </div>
          ))}
          {choices.length < LIMITS.choicesMax && <button type="button" className="w-tool w-pin__more" onClick={() => setChoices(cs => [...cs, { id: ++choiceSeq.current, text: '' }])} disabled={pinning}>bæta við svari</button>}
        </div>
      )}

      {drafts.length > 0 && (
        <ul className="w-pin__prints" aria-label="Myndir sem eru að fara upp">
          {drafts.map(d => (
            <li key={d.key} className={`w-draft${d.error ? ' is-error' : d.done ? ' is-done' : ''}`}>
              <div className="w-draft__pic">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.preview} alt="" />
                {!d.done && !d.error && <span className="w-draft__bar" style={{ '--p': Math.min(1, Math.max(0, d.progress / 100)) } as React.CSSProperties} aria-hidden="true" />}
                <button type="button" className="w-draft__x" onClick={() => remove(d.key)} disabled={pinning} aria-label={`Taka ${d.name} úr`}><CloseIcon /></button>
              </div>
              <input className="w-draft__cap" value={d.caption} readOnly={pinning} onChange={e => patch(d.key, { caption: e.target.value })} maxLength={LIMITS.caption} placeholder="myndatexti" aria-label={`Myndatexti fyrir ${d.name}`} />
              <span className="w-draft__meta">
                {/* a failed upload is said aloud when it fails; the running percentage is not */}
                {d.error ? <span role="alert"><span className="b-visually-hidden">{d.name}: </span>{d.error}</span> : d.done ? (d.done.takenAt ? `tekin ${formatDate(d.done.takenAt)}` : 'tilbúin') : `hleð upp ${Math.round(d.progress)}%`}
                {d.error && <> · <button type="button" className="b-link w-draft__retry" onClick={() => retry(d)} disabled={pinning}>reyna aftur</button></>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="w-pin__row">
        <input ref={input} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="b-btn b-btn--small" onClick={() => input.current?.click()} disabled={pinning || !storage || storage.mode === 'none'}>Velja myndir</button>
        <label className="w-pin__place">
          <span className="b-visually-hidden">Staður</span>
          <select className="w-pin__select" value={placeId ?? ''} disabled={pinning} onChange={e => setPlaceId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Hvar var þetta?</option>
            {places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <span className="w-pin__note">{storageNote}</span>
        <button type="submit" className="b-btn b-btn--solid b-btn--small w-pin__go" disabled={!canPin}>
          {pinning ? 'Festi upp…' : uploading ? 'Hleð upp…' : failed ? 'Mynd mistókst' : 'Festa upp'}
        </button>
      </div>
      {error && <p className="b-err" role="alert">{error}</p>}
    </form>
  );
}
