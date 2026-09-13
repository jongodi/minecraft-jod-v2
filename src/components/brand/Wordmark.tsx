import type { Lamp } from '@/lib/status/types';
import { LAMP_FILL } from './Mark';
import { WORDMARK_GLYPHS, WORDMARK_WIDTH } from './wordmark-glyphs';

interface WordmarkProps {
  lamp: Lamp;
  /** Height in CSS pixels; width follows the letterforms. */
  height?: number;
  title?: string;
}

const VIEW_TOP = 8;
const VIEW_HEIGHT = 76;

/**
 * "JOÐcraft" as outlines. The letters are JODcraft; the crossbar that makes
 * the Ð is drawn here in the accent colour so the name shows whether the
 * server is on.
 */
export function Wordmark({ lamp, height = 28, title }: WordmarkProps) {
  const width = Math.round((height * WORDMARK_WIDTH) / VIEW_HEIGHT);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 ${VIEW_TOP} ${WORDMARK_WIDTH} ${VIEW_HEIGHT}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {WORDMARK_GLYPHS.map((glyph) => (
        <path key={glyph.x} d={glyph.d} className="fill-current" />
      ))}
      <rect x="96.9" y="39.4" width="25.8" height="11.6" className={LAMP_FILL[lamp]} />
    </svg>
  );
}
