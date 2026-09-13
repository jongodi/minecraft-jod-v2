'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FUSE_MS, RESULT_MS, ROUNDS, WAIT_MAX_MS, WAIT_MIN_MS,
  readBest, ticksFor, tickWord, writeBest, type Shot,
} from './rules';
import { FuseRuler, ROUND_SLOTS } from './FuseRuler';

type Phase = 'idle' | 'wait' | 'lit' | 'result' | 'paused' | 'done';

interface Round {
  index: number;
  shots: Shot[];
  /** Why the last round ended, shown during 'result'. */
  note: 'hit' | 'early' | 'boom' | null;
}

const FRESH: Round = { index: 0, shots: [], note: null };

/**
 * Kveikurinn. The fuse lights at a random moment; press before it burns
 * down. Three rounds, scored in ticks. Pointer and keyboard are both first
 * class: the stage is one big button. Timers stop when the stage is off
 * screen or the tab is hidden, and the round is offered again.
 */
export default function Fuse() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<Round>(FRESH);
  const [best, setBest] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  const stage = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const raf = useRef<number>();
  const litAt = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef<Round>(FRESH);
  roundRef.current = round;

  const setP = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const setBurn = (p: number) => {
    stage.current?.style.setProperty('--burn', String(p));
  };

  const stopClocks = useCallback(() => {
    clearTimeout(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = undefined;
  }, []);

  useEffect(() => {
    setBest(readBest());
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return stopClocks;
  }, [stopClocks]);

  const endRound = useCallback((shot: Shot, note: Round['note']) => {
    stopClocks();
    setBurn(0);
    setRound((r) => ({ ...r, shots: [...r.shots, shot], note }));
    if (shot !== null) {
      setBest((b) => {
        if (b !== null && shot >= b) return b;
        writeBest(shot);
        return shot;
      });
    }
    setP('result');
    timer.current = setTimeout(() => {
      const next = roundRef.current.index + 1;
      if (next >= ROUNDS) {
        setP('done');
        return;
      }
      setRound((r) => ({ ...r, index: next, note: null }));
      setP('idle');
    }, RESULT_MS);
  }, [setP, stopClocks]);

  const light = useCallback(() => {
    setP('lit');
    litAt.current = performance.now();
    if (!reduced) {
      const tick = () => {
        const p = Math.min(1, (performance.now() - litAt.current) / FUSE_MS);
        setBurn(p);
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }
    timer.current = setTimeout(() => endRound(null, 'boom'), FUSE_MS);
  }, [endRound, reduced, setP]);

  const startRound = useCallback(() => {
    setBurn(0);
    setP('wait');
    const wait = WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);
    timer.current = setTimeout(light, wait);
  }, [light, setP]);

  /** Pause when the stage cannot be seen: a round you cannot see is not fair. */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const pause = () => {
      const p = phaseRef.current;
      if (p === 'wait' || p === 'lit') {
        stopClocks();
        setBurn(0);
        setP('paused');
      }
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) pause();
    }, { threshold: 0.5 });
    io.observe(el);
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [setP, stopClocks]);

  const press = () => {
    switch (phaseRef.current) {
      case 'idle':
      case 'paused':
        startRound();
        break;
      case 'done':
        setRound(FRESH);
        startRound();
        break;
      case 'wait':
        endRound(null, 'early');
        break;
      case 'lit':
        endRound(ticksFor(performance.now() - litAt.current), 'hit');
        break;
      default:
        break;
    }
  };

  const last = round.shots[round.shots.length - 1];
  const hits = round.shots.filter((s): s is number => s !== null);
  const gameBest = hits.length ? Math.min(...hits) : null;

  const headline = (() => {
    switch (phase) {
      case 'idle': return round.index === 0 ? 'Ýttu til að byrja' : 'Ýttu fyrir næsta';
      case 'wait': return 'Bíddu';
      case 'lit': return 'Núna';
      case 'paused': return 'Hlé, ýttu til að halda áfram';
      case 'result':
        if (round.note === 'early') return 'Of snemmt';
        if (round.note === 'boom') return 'Sprakk';
        return typeof last === 'number' ? tickWord(last) : '';
      case 'done':
        return gameBest === null ? 'Þrjú töpuð' : `Best ${tickWord(gameBest)}`;
    }
  })();

  return (
    <div>
      <button
        ref={stage}
        type="button"
        onPointerDown={(e) => { e.preventDefault(); press(); }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); }
        }}
        aria-live="polite"
        className={`fuse-stage relative block aspect-stage w-full select-none touch-manipulation overflow-hidden border border-line bg-bg-2 text-left sm:aspect-photo ${
          round.note === 'boom' && phase === 'result' ? 'is-boom' : ''
        }`}
      >
        <span className="sr-only">Leiksvið, ýttu eða sláðu á bilstöng. </span>
        <span className="absolute left-4 top-4 font-label text-label uppercase text-muted">
          Umferð {Math.min(round.index + 1, ROUNDS)} / {ROUNDS}
        </span>
        {best !== null && (
          <span className="num absolute right-4 top-4 font-label text-label uppercase text-muted">
            Best {tickWord(best)}
          </span>
        )}
        <span className="absolute inset-x-4 top-1/2 -translate-y-1/2 font-display text-h2 uppercase leading-none">
          {headline}
        </span>
        <FuseRuler lit={phase === 'lit'} />
      </button>
      <ol className="num mt-4 grid grid-cols-3 gap-4 font-label text-label uppercase text-muted">
        {ROUND_SLOTS.map((i) => {
          const s = round.shots[i];
          return (
            <li key={i} className="border-t border-line pt-2">
              {typeof s === 'number' ? tickWord(s) : s === null ? 'Tapað' : i === round.index && phase !== 'done' ? 'Þessi' : ''}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
