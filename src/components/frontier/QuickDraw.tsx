'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Arrow, BulletHole, Star } from './Bits';

/* One game is three draws. Each draw: a random hold, then the call.
   Tapping during the hold is a foul and that draw is lost. */
const ROUNDS     = 3;
const NEXT_DELAY = 1600;
const BEST_KEY   = 'jod-qd-best';
const NUMERAL    = ['I', 'II', 'III'];
const TILT       = [-2, 1.5, -1];

type Phase = 'idle' | 'hold' | 'draw' | 'result' | 'done';
type Shot  = number | null;

function rankOf(ms: number) {
  if (ms < 200) return 'Sheriff';
  if (ms < 300) return 'Deputy';
  if (ms < 450) return 'Ranch hand';
  return 'Greenhorn';
}

function Gunslinger({ x, flip, cls }: { x: number; flip?: boolean; cls: string }) {
  return (
    <g transform={`translate(${x} 400) scale(${flip ? -1 : 1} 1)`} fill="currentColor">
      <g className={`j-fig ${cls}`}>
        <rect x="-14" y="-60" width="12" height="60" />
        <rect x="2"   y="-60" width="12" height="60" />
        <rect x="-16" y="-124" width="32" height="66" />
        <rect x="-16" y="-156" width="32" height="32" />
        <rect x="-30" y="-160" width="60" height="7" />
        <rect x="-16" y="-178" width="32" height="20" />
        <g className="j-arm">
          <rect x="20" y="-118" width="12" height="58" />
          <rect x="20" y="-70" width="24" height="9" />
          <circle className="j-arena__smoke" cx="52" cy="-66" r="10" fill="#f8f1de" />
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
  const [hole,  setHole]  = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const t0    = useRef(0);
  const fired = useRef(false);

  useEffect(() => { try { const v = Number(localStorage.getItem(BEST_KEY)); if (v > 0) setBest(v); } catch {} }, []);
  useEffect(() => { if (best !== null) { try { localStorage.setItem(BEST_KEY, String(best)); } catch {} } }, [best]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const startRound = useCallback((r: number) => {
    setRound(r); setPhase('hold'); setHole(null); fired.current = false;
    timer.current = setTimeout(() => { setPhase('draw'); t0.current = performance.now(); }, 1600 + Math.random() * 2400);
  }, []);
  const begin = useCallback(() => { setShots([]); startRound(0); }, [startRound]);
  const endRound = useCallback((shot: Shot, r: number) => {
    setShots(s => [...s, shot]);
    if (shot !== null) setBest(b => (b === null || shot < b ? shot : b));
    setPhase('result');
    timer.current = setTimeout(() => { if (r + 1 >= ROUNDS) setPhase('done'); else startRound(r + 1); }, NEXT_DELAY);
  }, [startRound]);
  const tap = useCallback((at?: { x: number; y: number }) => {
    if (phase === 'idle' || phase === 'done') { begin(); return; }
    if (phase === 'hold') { clearTimeout(timer.current); endRound(null, round); return; }
    if (phase === 'draw' && !fired.current) {
      fired.current = true;
      if (at) setHole(at);
      endRound(Math.round(performance.now() - t0.current), round);
    }
  }, [phase, round, begin, endRound]);

  const valid      = shots.filter((s): s is number => s !== null);
  const gameBest   = valid.length ? Math.min(...valid) : null;
  const gameAvg    = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const last       = shots[shots.length - 1];
  const lastIsHit  = phase === 'result' && typeof last === 'number';
  const lastIsFoul = phase === 'result' && last === null;
  const arenaCls   = ['j-arena', `is-${phase}`, lastIsHit ? 'is-hit' : '', lastIsFoul ? 'is-foul' : ''].filter(Boolean).join(' ');

  const call =
    phase === 'idle'   ? { big: 'High noon', small: 'tap here to start, wait for the call, then tap again' } :
    phase === 'hold'   ? { big: 'Hold…',     small: 'not yet' } :
    phase === 'draw'   ? { big: 'DRAW',      small: '' } :
    phase === 'result' ? (lastIsHit ? { big: `${last} ms`, small: rankOf(last) } : { big: 'Too soon', small: 'foul, that draw is gone' }) :
    gameBest !== null  ? { big: `${gameBest} ms`, small: `${rankOf(gameBest)}. tap to go again` } :
                         { big: 'Three fouls', small: 'patience, partner. tap to go again' };

  return (
    <section id="showdown" className="j-sec j-noon">
      <span className="j-noon__word" aria-hidden="true">SHOWDOWN</span>
      <div className="j-wrap">
        <div className="j-noon__head">
          <div>
            <p className="j-note j-note--big">Quick draw at high noon</p>
            <p className="j-note">three draws a game, best time stays on this device</p>
          </div>
          <p className="j-note">under 200 ms and you wear the star <Arrow /></p>
        </div>

        <div className="j-noon__grid">
          <div
            className={arenaCls}
            onPointerDown={e => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              const r = e.currentTarget.getBoundingClientRect();
              tap({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            role="button"
            tabIndex={0}
            aria-label="Quick draw arena"
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}
          >
            <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <g className="j-arena__rays" stroke="#e6c979" strokeOpacity="0.18" strokeWidth="14">
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={i} x1="400" y1="250" x2={400 + Math.cos((i * Math.PI) / 6) * 700} y2={250 + Math.sin((i * Math.PI) / 6) * 700} />
                ))}
              </g>
              <circle cx="400" cy="250" r="64" fill="#e6c979" fillOpacity="0.9" />
              <path d="M0 330 L70 330 L110 280 L190 280 L230 330 L350 330 L400 265 L470 265 L515 330 L640 330 L690 295 L760 295 L800 330 L800 450 L0 450 Z" fill="#2a1c13" />
              <path d="M0 372 L800 372 L800 450 L0 450 Z" fill="#1c130d" />
              <path d="M0 400 L800 400 L800 450 L0 450 Z" fill="#15100b" />
              <Gunslinger x={150} cls="j-fig--you" />
              <Gunslinger x={650} flip cls="j-fig--foe" />
            </svg>
            <div className="j-arena__flash" />
            {hole && <BulletHole x={hole.x} y={hole.y} />}
            <span className="j-arena__corner">Draw {NUMERAL[Math.min(round, ROUNDS - 1)]} of {NUMERAL[ROUNDS - 1]}</span>
            {best !== null && <span className="j-arena__corner j-arena__corner--r">Best {best} ms</span>}
            <div className="j-arena__call" aria-live="polite">
              <div>
                <div className="j-arena__big">{call.big}</div>
                {call.small && <div className="j-arena__small">{call.small}</div>}
              </div>
            </div>
          </div>

          <div className="j-noon__side">
            <div className="j-stubs">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const s = shots[i];
                const live = i === round && (phase === 'hold' || phase === 'draw');
                return (
                  <div key={i} className={`j-stub${live ? ' is-live' : ''}${s === null ? ' is-foul' : ''}`} style={{ '--r': `${TILT[i]}deg` } as CSSProperties}>
                    <div className="j-stub__k">Draw {NUMERAL[i]}</div>
                    <div className="j-stub__v">{typeof s === 'number' ? `${s} ms` : s === null ? 'Foul' : live ? '…' : '—'}</div>
                  </div>
                );
              })}
            </div>
            <div className="j-noon__readout">
              <div><div className="j-noon__k">Game average</div><div className="j-noon__v">{gameAvg !== null ? `${gameAvg} ms` : '—'}</div></div>
              <div><div className="j-noon__k">Rank</div><div className="j-noon__v">{gameBest !== null && gameBest < 200 && <Star className="j-star" />}{gameBest !== null ? rankOf(gameBest) : '—'}</div></div>
            </div>
            <button className="j-btn" onClick={() => tap()} disabled={phase === 'result'}>
              {phase === 'idle' ? 'Start the showdown' : phase === 'done' ? 'Play again' : phase === 'draw' ? 'Fire' : phase === 'result' ? 'Reloading…' : 'Hold…'}
            </button>
            <p className="j-noon__rules">Sheriff under 200 ms, Deputy under 300, Ranch hand under 450. Slower and you&rsquo;re a Greenhorn.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
