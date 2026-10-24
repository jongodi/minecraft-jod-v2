'use client';

// What the crew give a sign: the game's own items (src/lib/reactions.ts),
// counted like the lantern. What has been given hangs in the sign's foot as a
// hotbar, each slot an item and its count written the way the game counts a
// stack, the ones you gave in the frame the game puts round the slot in hand.
// Pressing one gives it too, or takes yours back. The empty slot after them
// opens the inventory: every item, what it says, and who gave it, in the
// game's own violet tooltip. An item given pops into its slot as the game's
// do when picked up, with the game's pop when the sound is on.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import { ITEMS, gaveIt, give, given, giversOf, itemOf, settle, type ItemId, type Reactions } from '@/lib/reactions';
import { errorFrom, failure } from '@/lib/crew-upload';
import { andList } from '@/lib/format';
import { pickupPop } from '@/effects/ambience';
import PlayerHead from '@/components/badlands/PlayerHead';
import '@/app/items.css';

export interface Gifts {
  reactions: Reactions | undefined;
  me:        string | null | undefined;
  /** the inventory: shut, or open and how (from the keyboard, its first slot takes the keyboard) */
  open:      false | 'pointer' | 'keys';
  setOpen:   (open: false | 'pointer' | 'keys') => void;
  /** give the item or take yours back; false when it went nowhere (signed out, or its last press still on its way) */
  toggle:    (id: ItemId) => boolean;
  /** the items whose press is still on its way */
  busy:      ItemId[];
  /** the item just given, and a count so a second giving pops it again */
  pop:       { id: ItemId; n: number } | null;
  popped:    () => void;
}

interface Options {
  username:  string;
  entryId:   string;
  reactions: Reactions | undefined;
  me:        string | null | undefined;
  /** change the sign's reactions as they are now in the page's state */
  update:    (change: (r: Reactions | undefined) => Reactions) => void;
  setError:  (message: string) => void;
}

/** Giving and taking back, at once on the sign and then on the server. Each
    item waits for its own answer before it can be pressed again; an answer
    settles only its own item, and a refusal puts the item back where it hung,
    its givers as they were. */
export function useGifts({ username, entryId, reactions, me, update, setError }: Options): Gifts {
  const [open, setOpen] = useState<Gifts['open']>(false);
  const [pop, setPop] = useState<Gifts['pop']>(null);
  const [busy, setBusy] = useState<ItemId[]>([]);
  /* the same, read at once: a second press can come before the first has drawn */
  const sending = useRef(new Set<ItemId>());

  /* signed out on another tab, the inventory shuts, and does not open again by itself at the next sign-in */
  useEffect(() => { if (!me) setOpen(false); }, [me]);

  function toggle(id: ItemId): boolean {
    if (!me || sending.current.has(id)) return false;
    const on = !gaveIt(reactions, id, me);
    const before = reactions ?? {};
    sending.current.add(id);
    setBusy(b => [...b, id]);
    setError('');
    update(r => give(r, id, me, on));
    if (on) { setPop(p => ({ id, n: (p?.n ?? 0) + 1 })); pickupPop(); }
    void (async () => {
      try {
        const res = await fetch(`/api/crew/${username}/entries/${entryId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: id, given: on }) });
        if (!res.ok) throw new Error(await errorFrom(res));
        const answer = (await res.json() as { reactions: Reactions }).reactions;
        update(r => settle(r, id, answer));
      } catch (e) {
        update(r => settle(r, id, before));
        /* a slot gone before its pop ended would pop again when someone else's gift brings it back */
        if (on) setPop(p => (p?.id === id ? null : p));
        setError(failure(e, on ? 'Ekki tókst að gefa hlutinn.' : 'Ekki tókst að taka hlutinn aftur.'));
      } finally {
        sending.current.delete(id);
        setBusy(b => b.filter(x => x !== id));
      }
    })();
    return true;
  }

  return { reactions, me, open, setOpen, toggle, busy, pop, popped: () => setPop(null) };
}

/* A slot's tag stands centred over it, wrapping at a width, and moved in as
   far as it must be to stay on the screen: a slot can be anywhere along a
   sign's foot, and a list of names is long. Read when it is about to show. */
function keepTag(el: HTMLElement) {
  const w = parseFloat(getComputedStyle(el, '::after').width) || 0;
  const r = el.getBoundingClientRect();
  const left = r.left + r.width / 2 - w / 2;
  const edge = 8;
  const shift = Math.max(edge - left, Math.min(0, window.innerWidth - edge - (left + w)));
  el.style.setProperty('--tip-x', shift ? `calc(-50% + ${Math.round(shift)}px)` : '-50%');
}

/** One of the game's slots with an item in it, its count when there is more than one. */
function Slot({ id, count, popping, popKey, onPopped }: { id: ItemId; count: number; popping?: boolean; popKey?: number; onPopped?: () => void }) {
  return (
    <>
      <span key={popping ? popKey : 0} className={`w-item w-item--${id}${popping ? ' is-popping' : ''}`} aria-hidden="true" onAnimationEnd={popping ? onPopped : undefined} />
      {count > 1 && <span className="w-slot__count" aria-hidden="true">{count}</span>}
    </>
  );
}

/** What has been given, in the sign's foot, and the slot that opens the inventory. */
export function Hotbar({ gifts, panelId, plusRef }: { gifts: Gifts; panelId: string; plusRef: RefObject<HTMLButtonElement | null> }) {
  const list = given(gifts.reactions);
  if (!list.length && !gifts.me) return null;
  const openIt = (e: MouseEvent<HTMLButtonElement>) => gifts.setOpen(gifts.open ? false : e.detail === 0 ? 'keys' : 'pointer');
  return (
    <div className="w-items" role="group" aria-label="Gjafir">
      {list.map(({ id, who }) => {
        const item = itemOf(id);
        const mine = gaveIt(gifts.reactions, id, gifts.me);
        const label = `${item.name}: ${andList(who)}`;
        const busy = gifts.busy.includes(id);
        /* taking back the last of an item takes its slot away; the keyboard goes on to the plus rather than to the top of the page */
        const press = (e: MouseEvent<HTMLButtonElement>) => {
          const focused = document.activeElement === e.currentTarget;
          if (gifts.toggle(id) && mine && who.length === 1 && focused) plusRef.current?.focus();
        };
        return (
          <button key={id} type="button" className={`w-slot b-tip${mine ? ' is-mine' : ''}`} onClick={press} disabled={!gifts.me}
            aria-pressed={mine} aria-busy={busy || undefined} aria-label={label} data-tip={mine ? `${label}. Taka þinn aftur` : label}
            onMouseEnter={e => keepTag(e.currentTarget)} onFocus={e => keepTag(e.currentTarget)}>
            <Slot id={id} count={who.length} popping={gifts.pop?.id === id} popKey={gifts.pop?.n} onPopped={gifts.popped} />
          </button>
        );
      })}
      {gifts.me && (
        <button ref={plusRef} type="button" className={`w-slot w-slot--add b-tip${gifts.open ? ' is-open' : ''}`} onClick={openIt}
          aria-expanded={!!gifts.open} aria-controls={gifts.open ? panelId : undefined} aria-label="Gefa hlut" data-tip={gifts.open ? 'Loka' : 'Gefa hlut'}>
          <span className="w-slot__plus" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** The inventory: every item in a slot, the arrow keys walking them, and the
    game's tooltip for the one pointed at or with the keyboard. With none, it
    says who gave what, which is what a phone sees, with nothing to point. */
export function Inventory({ gifts, id, onClose }: { gifts: Gifts; id: string; onClose: () => void }) {
  const slots = useRef<(HTMLButtonElement | null)[]>([]);
  const grid = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [hover, setHover] = useState<ItemId | null>(null);
  const [focus, setFocus] = useState<ItemId | null>(null);
  const shown = hover ?? focus;
  const list = given(gifts.reactions);

  /* opened from the keyboard, the keyboard goes on into it; a tap leaves it where it was */
  const fromKeys = gifts.open === 'keys';
  useEffect(() => { if (fromKeys) slots.current[0]?.focus(); }, [fromKeys]);

  function walk(e: KeyboardEvent<HTMLDivElement>) {
    const cols = grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : ITEMS.length;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = at;
    if (e.key in step) next = Math.min(ITEMS.length - 1, Math.max(0, at + step[e.key]));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ITEMS.length - 1;
    else return;
    e.preventDefault();
    setAt(next);
    slots.current[next]?.focus();
  }

  return (
    <div className="w-inv" id={id} role="group" aria-label="Gefa hlut" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="w-inv__head">
        <span className="w-inv__title" aria-hidden="true">Gefðu hlut</span>
        <button type="button" className="w-tool" onClick={onClose}>loka</button>
      </div>
      <div className="w-inv__body">
        <div ref={grid} className="w-inv__slots" role="toolbar" aria-label="Hlutir" onKeyDown={walk} onMouseLeave={() => setHover(null)}>
          {ITEMS.map((item, i) => {
            const who = giversOf(gifts.reactions, item.id);
            const mine = gaveIt(gifts.reactions, item.id, gifts.me);
            return (
              <button key={item.id} ref={b => { slots.current[i] = b; }} type="button" className={`w-slot${mine ? ' is-mine' : ''}`} tabIndex={i === at ? 0 : -1}
                aria-pressed={mine} aria-busy={gifts.busy.includes(item.id) || undefined} aria-label={`${item.name}, „${item.says}“${who.length ? `. Gefið af ${andList(who)}` : ''}`}
                onClick={() => gifts.toggle(item.id)} onMouseEnter={() => setHover(item.id)}
                onFocus={() => { setAt(i); setFocus(item.id); }} onBlur={() => setFocus(f => (f === item.id ? null : f))}>
                <Slot id={item.id} count={who.length} />
              </button>
            );
          })}
        </div>
        {/* for the eye: each slot says all of this to a screen reader itself */}
        <div className="w-inv__tip" aria-hidden={shown ? true : undefined}>
          {shown ? (
            <>
              <b className="w-inv__name">{itemOf(shown).name}</b>
              <span className="w-inv__says">„{itemOf(shown).says}“</span>
              <Givers who={giversOf(gifts.reactions, shown)} />
            </>
          ) : list.length ? (
            <ul className="w-inv__given" aria-label="Gefið">
              {list.map(g => (
                <li key={g.id}>
                  <span className={`w-item w-item--${g.id}`} role="img" aria-label={itemOf(g.id).name} />
                  <span>{andList(g.who)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <b className="w-inv__name">Ekkert gefið enn</b>
              <span className="w-inv__says">Veldu hlut til að gefa hann.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Givers({ who }: { who: string[] }) {
  if (!who.length) return <span className="w-inv__who">Enginn hefur gefið þetta enn</span>;
  return (
    <span className="w-inv__who">
      {who.map(n => <PlayerHead key={n} name={n} size={16} alt="" />)}
      <span>{andList(who)}</span>
    </span>
  );
}
