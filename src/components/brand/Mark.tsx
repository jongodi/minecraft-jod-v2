import type { Lamp } from '@/lib/status/types';

interface MarkProps {
  /** Which way the crossbar is lit: the mark doubles as the status lamp. */
  lamp: Lamp;
  /** Rendered size in CSS pixels. The mark is drawn on a 32 unit grid. */
  size?: number;
  /** Draw the night-blue tile behind the letter (favicon, social image). */
  framed?: boolean;
  title?: string;
}

/**
 * The JOÐcraft mark: a heavy D whose crossbar, the stroke that makes it an
 * Icelandic Ð, is the one lit thing. The crossbar carries the server state.
 */
export function Mark({ lamp, size = 32, framed = false, title }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {framed && <rect width="32" height="32" rx="6" className="fill-bg" />}
      <path
        className="fill-text"
        fillRule="evenodd"
        d="M9 4h8c7.2 0 12 5.4 12 12s-4.8 12-12 12H9zm5 5v14h3c4 0 6.5-3 6.5-7S21 9 17 9z"
      />
      <rect x="4" y="14.5" width="13" height="3" className={LAMP_FILL[lamp]} />
    </svg>
  );
}

export const LAMP_FILL: Record<Lamp, string> = {
  on: 'fill-accent',
  dim: 'fill-accent opacity-45',
  off: 'fill-muted',
};
