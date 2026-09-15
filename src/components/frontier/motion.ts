import type { Transition } from 'framer-motion';

/* One house style for motion. Critically damped unless a gesture with
   momentum came first; then a little overshoot reads as physical. */
export const SPRING:        Transition = { type: 'spring', bounce: 0,   duration: 0.4 };
export const SPRING_SNAPPY: Transition = { type: 'spring', bounce: 0,   duration: 0.3 };
export const SPRING_THROW:  Transition = { type: 'spring', bounce: 0.2, duration: 0.4 };

/** Where a flick at `velocity` px/s would come to rest (exponential decay, like scroll). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistance past a boundary: the further past, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
