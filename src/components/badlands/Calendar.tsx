'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from './Bits';
import { MONTHS_FULL, WEEKDAYS_SHORT, dayLong, dayNum, dayValue } from './night';

/* A month on paper, to pick the day a fire is lit for. It opens under the
   day it sets, in the form's own flow rather than floating over it, so a
   phone never has to find room for it; past days and days more than a year
   off are there but can't be picked. Days are counted in Iceland, which
   keeps UTC all year, the same as every time the fire shows. The arrow keys
   walk the days, Page Up and Down turn the month, Escape puts it away. */

const DAY = 86_400_000;
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
/** a month as one number, twelve to a year */
const monthOf = (n: number) => { const d = new Date(n * DAY); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const firstOf = (month: number) => Date.UTC(Math.floor(month / 12), month % 12, 1) / DAY;
/** the same date a number of months on, or the month's last day if it has fewer */
function monthsOn(n: number, k: number): number {
  const d = new Date(n * DAY);
  const month = monthOf(n) + k;
  return Math.min(firstOf(month) + d.getUTCDate() - 1, firstOf(month + 1) - 1);
}

export default function Calendar({ value, today, min, max, triggerId, onPick, onClose }: {
  /** the day now set, "2026-12-18" */
  value: string;
  /** today, and the first and last days that can be picked, as days since 1970 */
  today: number; min: number; max: number;
  /** the button that opened it: a press there is its own, not a press outside */
  triggerId: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const [focus, setFocus] = useState(() => clamp(dayNum(value)));
  const [month, setMonth] = useState(() => monthOf(clamp(dayNum(value))));
  const root = useRef<HTMLDivElement>(null);
  /* the day with focus moves it only when the keys moved it, or on opening */
  const moved = useRef(true);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    root.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (root.current?.contains(t) || document.getElementById(triggerId)?.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [triggerId, onClose]);

  const first = firstOf(month);
  const length = firstOf(month + 1) - first;
  const lead = (new Date(first * DAY).getUTCDay() + 6) % 7;
  /* always six weeks, so turning the month never moves the form under it */
  const cells = Array.from({ length: 42 }, (_, i) => (i >= lead && i < lead + length ? first + i - lead : null));
  /* the one day the Tab key lands on: the focused day, or this month's first that can be picked */
  const tabDay = focus >= first && focus < first + length ? focus : clamp(first);
  const canBack = month > monthOf(min);
  const canOn = month < monthOf(max);

  const go = (n: number) => { const f = clamp(n); moved.current = true; setFocus(f); setMonth(monthOf(f)); };
  const turn = (k: number) => { setMonth(month + k); setFocus(clamp(monthsOn(tabDay, k))); };

  const onKey = (e: React.KeyboardEvent) => {
    const at = tabDay;
    const weekday = (new Date(at * DAY).getUTCDay() + 6) % 7;
    const to: Record<string, number> = {
      ArrowLeft: at - 1, ArrowRight: at + 1, ArrowUp: at - 7, ArrowDown: at + 7,
      Home: at - weekday, End: at + 6 - weekday,
      PageUp: monthsOn(at, e.shiftKey ? -12 : -1), PageDown: monthsOn(at, e.shiftKey ? 12 : 1),
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    go(to[e.key]);
  };

  return (
    <div
      ref={root}
      className="b-cal"
      role="dialog"
      aria-label="Veldu dag"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); document.getElementById(triggerId)?.focus(); } }}
    >
      <div className="b-cal__head">
        <button type="button" className="b-cal__turn" aria-label="Fyrri mánuður" disabled={!canBack} onClick={() => turn(-1)}>
          <ChevronIcon dir="left" />
        </button>
        <span className="b-cal__month" aria-live="polite">{cap(MONTHS_FULL[month % 12])} {Math.floor(month / 12)}</span>
        <button type="button" className="b-cal__turn" aria-label="Næsti mánuður" disabled={!canOn} onClick={() => turn(1)}>
          <ChevronIcon dir="right" />
        </button>
      </div>
      <div className="b-cal__grid" onKeyDown={onKey}>
        {WEEKDAYS_SHORT.map((w, i) => <span key={i} className="b-cal__wd" aria-hidden="true">{w}</span>)}
        {cells.map((n, i) => {
          if (n === null) return <span key={i} className="b-cal__blank" />;
          const v = dayValue(n);
          const out = n < min || n > max;
          const on = v === value;
          return (
            <button
              key={i}
              type="button"
              data-day={n}
              className={`b-cal__day${on ? ' is-on' : ''}${n === today ? ' is-today' : ''}`}
              tabIndex={n === tabDay ? 0 : -1}
              disabled={out}
              aria-pressed={on}
              aria-current={n === today ? 'date' : undefined}
              aria-label={dayLong(v)}
              onClick={() => onPick(v)}
            >
              {new Date(n * DAY).getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
