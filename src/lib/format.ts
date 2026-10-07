/** Icelandic number agreement: a count ending in 1 takes the singular
    (1, 21, 101 færsla), except the teens (11, 111 færslur). */
export function plural(n: number, one: string, many: string): string {
  return n % 10 === 1 && n % 100 !== 11 ? one : many;
}

/** A number as it is written in Iceland: a period between the thousands, a
    comma before the decimals, "1.234,5". Written out rather than left to the
    browser's locale data, which falls back to "1,234.5" wherever it carries
    no Icelandic, so a figure in pixel type reads the same on every device.
    `max` is how many decimals are kept (trailing zeros dropped), `min` how
    many are always shown. */
export function formatNumber(v: number, { max = 3, min = 0 }: { max?: number; min?: number } = {}): string {
  if (!Number.isFinite(v)) return '0';
  const [whole, frac = ''] = Math.abs(v).toFixed(max).split('.');
  const kept = frac.replace(/0+$/, '').padEnd(min, '0');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const negative = v < 0 && Number(`${whole}.${kept || '0'}`) !== 0;
  return `${negative ? '-' : ''}${grouped}${kept ? `,${kept}` : ''}`;
}

/** The months, short, as Icelandic print abbreviates them. Shared with the
    play nights (src/components/badlands/night.ts). */
export const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];

/** An ISO date as it is written in Iceland: "1. jan. 2025". Written out, like
    the numbers above, rather than left to the browser's locale data: a
    browser without Icelandic (and a headless one) wrote "Jan 1, 2025" on the
    wall. Read in UTC, which is Iceland's clock the year round, so the server
    and the browser write the same day. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** How long ago an ISO moment was: "fyrir 3 dögum", "fyrir 2 klst.", "rétt í þessu". */
export function formatAge(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0) return `fyrir ${days} ${plural(days, 'degi', 'dögum')}`;
  if (hours > 0) return `fyrir ${hours} klst.`;
  if (mins  > 0) return `fyrir ${mins} mín.`;
  return 'rétt í þessu';
}
