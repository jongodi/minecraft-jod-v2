import type { Lamp } from '@/lib/status/types';

interface MarkProps {
  /** Which way the crossbar is lit: the mark doubles as the status lamp. */
  lamp: Lamp;
  size?: number;
  /** Draw the basalt tile behind the letter (favicon, social image). */
  framed?: boolean;
  title?: string;
}

export const LAMP_FILL: Record<Lamp, string> = {
  on: 'fill-accent',
  dim: 'fill-accent opacity-50',
  off: 'fill-muted',
};

/**
 * The JOÐcraft mark: the D of the wordmark, Archivo Condensed Black, with the
 * crossbar that makes it an Icelandic Ð drawn separately as the lamp.
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
      {framed && <rect width="32" height="32" className="fill-bg" />}
      <path
        className="fill-text"
        d="M8.57 28V4H15.9Q18.76 4 20.4 5.27Q22.03 6.55 22.73 9.16Q23.43 11.78 23.43 15.93Q23.43 20.05 22.72 22.72Q22 25.38 20.33 26.69Q18.65 28 15.76 28ZM13.91 23.4H15.37Q16.1 23.4 16.63 23.13Q17.15 22.87 17.45 22.24Q17.74 21.62 17.88 20.57Q18.02 19.52 18.02 17.95V14.53Q18.02 12.93 17.88 11.81Q17.74 10.7 17.45 9.98Q17.15 9.27 16.63 8.94Q16.1 8.6 15.37 8.6H13.91Z"
      />
      <rect x="6" y="13.8" width="10" height="4.1" className={LAMP_FILL[lamp]} />
    </svg>
  );
}
