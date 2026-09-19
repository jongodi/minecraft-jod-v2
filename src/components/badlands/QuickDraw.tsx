'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { BulletHole, Star } from './Bits';

/* One game is three draws. Each draw: a random hold, then the call.
   Tapping during the hold is a foul and that draw is lost. */
const ROUNDS     = 3;
const NEXT_DELAY = 1600;
const BEST_KEY   = 'jod-qd-best';
const NUMERAL    = ['I', 'II', 'III'];

type Phase = 'idle' | 'hold' | 'draw' | 'result' | 'done';
type Shot  = number | null;

function rankOf(ms: number) {
  if (ms < 200) return 'Sýslumaður';
  if (ms < 300) return 'Aðstoðarsýslumaður';
  if (ms < 450) return 'Kúreki';
  return 'Nýliði';
}

/* The night scene: a pixel moon, a few stars and two mesas. */
const MOON: Array<[number, number, number]> = [[606, 40, 24], [600, 46, 36], [594, 52, 48], [594, 58, 48], [594, 64, 48], [594, 70, 48], [600, 76, 36], [606, 82, 24]];
const STARS: Array<[number, number]> = [[60, 40], [140, 90], [220, 30], [330, 70], [420, 120], [500, 50], [700, 110], [760, 30], [90, 150], [660, 160]];
const MESA_FAR  = 'M0 330 H70 V280 H110 V300 H190 V260 H230 V330 H350 V265 H470 V300 H515 V330 H640 V295 H760 V330 H800 V450 H0 Z';
const MESA_NEAR = 'M0 372 H120 V340 H200 V372 H460 V350 H540 V372 H800 V450 H0 Z';

function Gunslinger({ x, flip, cls }: { x: number; flip?: boolean; cls: string }) {
  return (
    <g transform={`translate(${x} 400) scale(${flip ? -1 : 1} 1)`} fill="currentColor">
      <g className={`b-fig ${cls}`}>
        <rect x="-14" y="-60" width="12" height="60" />
        <rect x="2"   y="-60" width="12" height="60" />
        <rect x="-16" y="-124" width="32" height="66" />
        <rect x="-16" y="-156" width="32" height="32" />
        <rect x="-30" y="-160" width="60" height="7" />
        <rect x="-16" y="-178" width="32" height="20" />
        <g className="b-arm">
          <rect x="20" y="-118" width="12" height="58" />
          <rect x="20" y="-70" width="24" height="9" />
          <rect className="b-arena__smoke" x="44" y="-74" width="16" height="16" fill="var(--paper)" />
        </g>
        <rect x="-28" y="-118" width="12" height="52" />
      </g>
    </g>
  );
}

function QuickDraw({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [shots, setShots] = useState<Shot[]>([]);
  const [round, setRound] = useState(0);
  const [best,  setBest]  = useState<number | null>(null);
  const [hole,  setHole]  = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const t0    = useRef(0);
  const fired = useRef(false);

  const reduce = useReducedMotion();
  const kick = useAnimation();

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
  const arenaCls   = ['b-arena', `is-${phase}`, lastIsHit ? 'is-hit' : '', lastIsFoul ? 'is-foul' : ''].filter(Boolean).join(' ');

  useEffect(() => {
    if (lastIsHit && !reduce) kick.start({ x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0], transition: { type: 'spring', bounce: 0.35, duration: 0.45 } });
    // fire once per hit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastIsHit, shots.length]);

  const call =
    phase === 'idle'   ? { big: 'Tilbúin?', small: 'smelltu til að byrja, bíddu eftir ljósinu og smelltu aftur' } :
    phase === 'hold'   ? { big: 'Bíddu…',     small: 'ekki strax' } :
    phase === 'draw'   ? { big: 'SKJÓTTU',      small: '' } :
    phase === 'result' ? (lastIsHit ? { big: `${last} ms`, small: rankOf(last) } : { big: 'Of snemma', small: 'þessi umferð er fallin' }) :
    gameBest !== null  ? { big: `${gameBest} ms`, small: `${rankOf(gameBest)}. Smelltu til að reyna aftur` } :
                         { big: 'Þrjár fallnar umferðir', small: 'rólegur á gikknum! Smelltu til að reyna aftur' };

  return (
    <div className="b-duelpanel">
        <div className="b-head">
          <div>
            <h2 id="showdown-title" className="b-title b-title--small">Einvígi</h2>
            <p className="b-lede">Hver er fljótastur á gikknum? Þrjár umferðir í leik; besti tíminn vistast í þessu tæki.</p>
          </div>
          <button type="button" className="b-btn b-btn--small" onClick={onClose}>Loka</button>
        </div>

        <div className="b-duel">
          <motion.div
            className={arenaCls}
            animate={kick}
            onPointerDown={e => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              const r = e.currentTarget.getBoundingClientRect();
              tap({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            role="button"
            tabIndex={0}
            aria-label="Einvígi: prófaðu viðbragðstímann"
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}
          >
            <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              {MOON.map(([x, y, w]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height="6" fill="var(--sun)" />)}
              {STARS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="var(--star)" />)}
              <path d={MESA_FAR} fill="var(--tc-red)" />
              <path d={MESA_NEAR} fill="var(--tc-brown)" />
              <rect x="0" y="372" width="800" height="78" fill="var(--dusk-2)" />
              <rect x="0" y="400" width="800" height="50" fill="var(--night)" />
              <Gunslinger x={150} cls="b-fig--you" />
              <Gunslinger x={650} flip cls="b-fig--foe" />
            </svg>
            <div className="b-arena__flash" />
            {hole && <BulletHole x={hole.x} y={hole.y} />}
            <span className="b-arena__corner">Umferð {NUMERAL[Math.min(round, ROUNDS - 1)]} af {NUMERAL[ROUNDS - 1]}</span>
            {best !== null && <span className="b-arena__corner b-arena__corner--r">Best: {best} ms</span>}
            <div className="b-arena__call" aria-live="polite">
              <div>
                <div className="b-arena__big">{call.big}</div>
                {call.small && <div className="b-arena__small">{call.small}</div>}
              </div>
            </div>
          </motion.div>

          <div className="b-duel__side">
            <div className="b-stubs">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const s = shots[i];
                const live = i === round && (phase === 'hold' || phase === 'draw');
                return (
                  <div key={i} className={`b-stub b-paper${live ? ' is-live' : ''}${s === null ? ' is-foul' : ''}`}>
                    <div className="b-stub__k">Umferð {NUMERAL[i]}</div>
                    <div className="b-stub__v">{typeof s === 'number' ? `${s} ms` : s === null ? 'Fallið' : live ? '…' : '·'}</div>
                  </div>
                );
              })}
            </div>
            <div className="b-duel__readout">
              <div><div className="b-duel__k">Meðaltal leiks</div><div className="b-duel__v">{gameAvg !== null ? `${gameAvg} ms` : '·'}</div></div>
              <div><div className="b-duel__k">Staða</div><div className="b-duel__v">{gameBest !== null && gameBest < 200 && <Star className="b-star" />}{gameBest !== null ? rankOf(gameBest) : '·'}</div></div>
            </div>
            <button type="button" className="b-btn b-btn--solid" onClick={() => tap()} disabled={phase === 'result'}>
              {phase === 'idle' ? 'Hefja einvígi' : phase === 'done' ? 'Spila aftur' : phase === 'draw' ? 'Skjóttu' : phase === 'result' ? 'Hleð aftur…' : 'Bíddu…'}
            </button>
            <p className="b-duel__rules">Sýslumaður undir 200 ms, aðstoðarsýslumaður undir 300 og kúreki undir 450. Annars ertu nýliði.</p>
          </div>
        </div>
    </div>
  );
}

/* Behind the fire in the footer: three draws, best time kept in the browser. */
export default memo(QuickDraw);
