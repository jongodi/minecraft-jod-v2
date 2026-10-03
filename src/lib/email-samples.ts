// Made-up letters for the admin panel (Póstur): a night stebbias lit to
// build a bridge, answered by a few of the crew, as joenana would get it.
// Server only.
import { nightLetter, signinLetter, type Letter, type MailKind } from '@/lib/email-copy';
import type { Night, Votes } from '@/lib/play-night';

const DAY = 24 * 3600_000;

/** Next Saturday at 20:00 (Iceland keeps UTC), at least a day away. */
function nextSaturday(now: number): number {
  const d = new Date(now + DAY);
  d.setUTCHours(20, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.getTime();
}

export function sampleLetter(kind: MailKind, site: string, now = Date.now()): Letter {
  if (kind === 'signin') {
    return signinLetter({ name: 'joenana', url: `${site}/api/crew/invite?lykill=synishorn-ekki-alvoru`, expiresAt: new Date(now + 7 * DAY).toISOString(), uses: 5 });
  }
  const sat = nextSaturday(now);
  const night: Night = {
    id: 'synishorn', by: 'stebbias', createdAt: new Date(now).toISOString(), note: 'Byggjum brúna yfir gljúfrið',
    options: [{ id: 'a', at: new Date(sat).toISOString() }, { id: 'b', at: new Date(sat + DAY).toISOString() }],
    chosen: kind === 'lit' ? null : 'a', chosenBy: kind === 'lit' ? null : 'auto',
    cancelled: kind === 'out', startedBy: null, outcome: null,
  };
  const votes: Votes = { stebbias: ['a', 'b'], AmmaGaur: ['a'], ingunnbirta: ['a'], joenana: ['a', 'b'] };
  return nightLetter(kind, night, votes, { username: 'joenana', address: '' }, site);
}
