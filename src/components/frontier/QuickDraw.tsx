'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';

/* One game is three draws. Each draw: a random hold, then the call.
   Tapping during the hold is a foul and that draw is lost. */
const ROUNDS     = 3;
const NEXT_DELAY = 1500;
const BEST_KEY   = 'jod-qd-best';

type Phase = 'idle' | 'hold' | 'draw' | 'result' | 'done';
type Shot  = number | null;

function rankOf(ms: number) {
  if (ms < 200) return 'Sheriff';
  if (ms < 300) return 'Deputy';
  if (ms < 450) return 'Ranch hand';
  return 'Greenhorn';
}

function Gunslinger({ x, flip, cls }: { x: number; flip?: boolean; cls: string }) {
  /* Blocky figure, feet on y=400. The outer group carries the SVG placement;
     the inner one takes the CSS transforms for the fall. */
  return (
    <g transform={`translate(${x} 400) scale(${flip ? -1 : 1} 1)`} fill="currentColor">
      <g className={`f-qd__fig ${cls}`}>
        <rect x="-14" y="-60" width="12" height="60" />
        <rect x="2"   y="-60" width="12" height="60" />
        <rect x="-16" y="-124" width="32" height="66" />
        <rect x="-16" y="-156" width="32" height="32" />
        <rect x="-26" y="-160" width="52" height="8" />
        <rect x="-16" y="-176" width="32" height="18" />
        <g className="f-qd__arm">
          <rect x="20" y="-118" width="12" height="58" />
          <rect x="20" y="-70" width="24" height="9" />
        </g>
        <rect x="-28" y="-118" width="12" height="52" />
      </g>
    </g>
  );
}

export default function QuickDraw() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [shots, setShots] = useState<Shot[]>([]);
  const [round, setRound] = useState(0);
  const [best,  setBest]  = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const t0    = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    try { const v = Number(localStorage.getItem(BEST_KEY)); if (v > 0) setBest(v); } catch {}
  }, []);
  useEffect(() => {
    if (best !== null) { try { localStorage.setItem(BEST_KEY, String(best)); } catch {} }
  }, [best]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const startRound = useCallback((r: number) => {
    setRound(r);
    setPhase('hold');
    fired.current = false;
    timer.current = setTimeout(() => {
      setPhase('draw');
      t0.current = performance.now();
    }, 1600 + Math.random() * 2400);
  }, []);

  const begin = useCallback(() => { setShots([]); startRound(0); }, [startRound]);

  const endRound = useCallback((shot: Shot, r: number) => {
    setShots(s => [...s, shot]);
    if (shot !== null) setBest(b => (b === null || shot < b ? shot : b));
    setPhase('result');
    timer.current = setTimeout(() => {
      if (r + 1 >= ROUNDS) setPhase('done');
      else startRound(r + 1);
    }, NEXT_DELAY);
  }, [startRound]);

  const tap = useCallback(() => {
    if (phase === 'idle' || phase === 'done') { begin(); return; }
    if (phase === 'hold') { clearTimeout(timer.current); endRound(null, round); return; }
    if (phase === 'draw' && !fired.current) {
      fired.current = true;
      endRound(Math.round(performance.now() - t0.current), round);
    }
  }, [phase, round, begin, endRound]);

  const valid      = shots.filter((s): s is number => s !== null);
  const gameBest   = valid.length ? Math.min(...valid) : null;
  const gameAvg    = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const last       = shots[shots.length - 1];
  const lastIsHit  = phase === 'result' && typeof last === 'number';
  const lastIsFoul = phase === 'result' && last === null;

  const arenaCls = ['f-qd__arena', `is-${phase}`, lastIsHit ? 'is-hit' : '', lastIsFoul ? 'is-foul' : ''].filter(Boolean).join(' ');

  const call =
    phase === 'idle'   ? { big: 'Ready?',  small: 'Tap here to start. Wait for the call, then tap again.' } :
    phase === 'hold'   ? { big: 'Hold.',   small: 'Not yet.' } :
    phase === 'draw'   ? { big: 'Draw!',   small: '' } :
    phase === 'result' ? (lastIsHit ? { big: `${last} ms`, small: rankOf(last) } : { big: 'Too soon.', small: 'Foul. That draw is gone.' }) :
    gameBest !== null  ? { big: `${gameBest} ms`, small: `${rankOf(gameBest)}. Tap to go again.` } :
                         { big: 'Three fouls.', small: 'Patience. Tap to go again.' };

  return (
    <section id="showdown" className="f-section">
      <div className="f-wrap f-cols">
        <SectionHead
          kicker="Showdown"
          title="Quick draw"
          lede="A reaction test. Three draws a game. Under 200 ms makes you Sheriff, under 300 Deputy, under 450 Ranch hand, slower is a Greenhorn."
        >
          {best !== null && <p className="f-status-line">Your best on this device: <span className="f-num">{best} ms</span></p>}
        </SectionHead>

        <div className="f-qd">
          <div
            className={arenaCls}
            onPointerDown={e => { if (e.pointerType === 'mouse' && e.button !== 0) return; tap(); }}
            role="button"
            tabIndex={0}
            aria-label="Quick draw arena"
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}
          >
            <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <circle cx="400" cy="250" r="60" fill="none" stroke="currentColor" strokeOpacity="0.35" />
              <line x1="0" y1="400" x2="800" y2="400" stroke="currentColor" strokeOpacity="0.5" />
              <line x1="0" y1="430" x2="800" y2="430" stroke="currentColor" strokeOpacity="0.15" />
              <Gunslinger x={150} cls="f-qd__fig--you" />
              <Gunslinger x={650} flip cls="f-qd__fig--foe" />
            </svg>
            <span className="f-qd__corner">Draw {Math.min(round + 1, ROUNDS)} of {ROUNDS}</span>
            <div className="f-qd__call" aria-live="polite">
              <div>
                <div className="f-qd__call-big">{call.big}</div>
                {call.small && <div className="f-qd__call-small">{call.small}</div>}
              </div>
            </div>
          </div>

          <div className="f-qd__panel">
            <div className="f-qd__shots">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const s = shots[i];
                const live = i === round && (phase === 'hold' || phase === 'draw');
                return (
                  <div key={i} className={`f-qd__shot${live ? ' is-live' : ''}${s === null ? ' is-foul' : ''}`}>
                    <div className="f-qd__shot-k">Draw {i + 1}</div>
                    <div className="f-qd__shot-v">{typeof s === 'number' ? `${s} ms` : s === null ? 'Foul' : live ? '…' : '—'}</div>
                  </div>
                );
              })}
            </div>

            <dl className="f-dl">
              <dt>Game average</dt><dd>{gameAvg !== null ? `${gameAvg} ms` : '—'}</dd>
              <dt>Rank</dt><dd>{gameBest !== null ? rankOf(gameBest) : '—'}</dd>
            </dl>

            <button className="f-btn" onClick={tap} disabled={phase === 'result'}>
              {phase === 'idle' ? 'Start' : phase === 'done' ? 'Play again' : phase === 'draw' ? 'Fire' : phase === 'result' ? 'Reloading…' : 'Hold…'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
