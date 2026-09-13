import { ROUNDS } from './rules';

interface FuseRulerProps {
  lit: boolean;
}

const MARKS = [0, 5, 10, 15, 20, 25, 30];

/**
 * The fuse drawn as a ruler, one mark every five ticks, so a player can read
 * their own time off it. The burned part and the spark move by transform
 * only, driven by the --burn property the game sets on the stage.
 */
export function FuseRuler({ lit }: FuseRulerProps) {
  return (
    <span className="absolute inset-x-4 bottom-8 block" aria-hidden="true">
      <svg viewBox="0 0 600 24" preserveAspectRatio="none" className="block h-6 w-full">
        {MARKS.map((t, i) => (
          <line key={t} x1={i * 100} y1={i % 2 === 0 ? 2 : 6} x2={i * 100} y2={12} stroke="var(--muted)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" y1="12" x2="600" y2="12" stroke="var(--text)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 600 16" className="absolute inset-x-0 top-6 block h-4 w-full">
        {MARKS.map((t, i) => (
          <text
            key={t}
            x={i * 100}
            y={12}
            textAnchor={i === 0 ? 'start' : i === MARKS.length - 1 ? 'end' : 'middle'}
            fontSize={11}
            letterSpacing={1}
            className="num fill-muted font-label"
          >
            {t}
          </text>
        ))}
      </svg>
      <span className="fuse-burned absolute left-0 top-0 h-6 w-full origin-left bg-bg-2" />
      {[0, 0.02, 0.045].map((lag, i) => (
        <span
          key={lag}
          className="fuse-spark absolute inset-x-0 top-3"
          style={{ ['--lag' as string]: lag, opacity: lit ? 1 - i * 0.35 : 0 }}
        >
          <span className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-accent ${i === 0 ? 'h-4 w-4' : 'h-2 w-2'}`} />
        </span>
      ))}
    </span>
  );
}

export const ROUND_SLOTS = Array.from({ length: ROUNDS }, (_, i) => i);
