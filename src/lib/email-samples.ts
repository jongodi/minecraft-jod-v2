// Made-up letters for the admin panel (Póstur): joenana's welcome, a night
// stebbias lit to build a bridge, answered by a few of the crew, as joenana
// would get it, with the crew called by the names given them. Server only.
import { crewBut, mentionLetter, nightLetter, signinLetter, welcomeLetter, type Letter, type MailKind } from '@/lib/email-copy';
import type { Names } from '@/lib/crew-email';
import type { Night, Votes } from '@/lib/play-night';

const DAY = 24 * 3600_000;

/** Next Saturday at 20:00 (Iceland keeps UTC), at least a day away. */
function nextSaturday(now: number): number {
  const d = new Date(now + DAY);
  d.setUTCHours(20, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.getTime();
}

/** `version` is the game's on the server, for the welcome; a made-up one stands in without it. */
export function sampleLetter(kind: MailKind, site: string, names: Names = {}, now = Date.now(), version: string | null = null): Letter {
  const key = { url: `${site}/api/crew/invite?lykill=synishorn-ekki-alvoru`, expiresAt: new Date(now + 7 * DAY).toISOString(), uses: 5 };
  if (kind === 'welcome') {
    return welcomeLetter({ name: names.joenana ?? 'joenana', username: 'joenana', ...key, site, crew: crewBut('joenana', names), version });
  }
  if (kind === 'signin') {
    return signinLetter({ name: names.joenana ?? 'joenana', username: 'joenana', ...key });
  }
  if (kind === 'mention') {
    return mentionLetter({ by: names.stebbias ?? 'stebbias', byUser: 'stebbias', reader: names.joenana ?? 'joenana', text: '@joenana áttu nokkuð þrjá stafla af járni handa brúnni? Ég borga í smaragðum.', url: `${site}/crew/stebbias`, reply: false, site });
  }
  const sat = nextSaturday(now);
  const night: Night = {
    id: 'synishorn', by: 'stebbias', createdAt: new Date(now).toISOString(), note: 'Byggjum brúna yfir gljúfrið',
    options: [{ id: 'a', at: new Date(sat).toISOString() }, { id: 'b', at: new Date(sat + DAY).toISOString() }],
    chosen: kind === 'lit' ? null : 'a', chosenBy: kind === 'lit' ? null : 'auto',
    cancelled: kind === 'out', startedBy: null, outcome: null,
  };
  const votes: Votes = { stebbias: ['a', 'b'], AmmaGaur: ['a'], ingunnbirta: ['a'], joenana: ['a', 'b'] };
  /* the answer buttons as they look, on links that answer nothing */
  const answer = (svar: string) => `${site}/kvold/synishorn?svar=${svar}&lykill=synishorn#hopur`;
  return nightLetter(kind, night, votes, { username: 'joenana', address: '' }, site, names, answer);
}
