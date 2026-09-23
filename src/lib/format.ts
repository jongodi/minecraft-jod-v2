/** Icelandic number agreement: a count ending in 1 takes the singular
    (1, 21, 101 færsla), except the teens (11, 111 færslur). */
export function plural(n: number, one: string, many: string): string {
  return n % 10 === 1 && n % 100 !== 11 ? one : many;
}

/** Format an ISO date string as "1 Jan 2025". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('is-IS', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Format an ISO timestamp as a human-readable age ("3d ago", "2h ago", "rétt í þessu"). */
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
