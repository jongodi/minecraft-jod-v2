import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { canSendEmail } from '@/lib/email';
import { exarotonStatus, startExaroton } from '@/lib/exaroton';
import { forgetStatus } from '@/lib/server-status';
import { errorMessage } from '@/lib/icelandic';
import { jsonObject } from '@/lib/http';
import {
  MAX_NOTE, MAX_PLANNED, START_BEFORE_MS, checkTimes, clashOf, currentNights, isPlanned, optionOf, phaseOf,
  writeNight, writeVote, yesFor, type Night,
} from '@/lib/play-night';
import { NO_NIGHTS, viewNights, type PlayNightResponse } from '@/lib/play-night-view';

/* Spilakvöld (src/lib/play-night.ts). GET is the nights as the page shows
   them (src/lib/play-night-view.ts), for anyone; POST acts on one, for a
   signed-in crew member:
   { action: 'propose', times, note } | { action: 'vote', night, yes } |
   { action: 'choose', night, option } | { action: 'cancel', night } |
   { action: 'start', night }. */

export const dynamic = 'force-dynamic';

export type { PublicNight, PlayNightResponse } from '@/lib/play-night-view';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/* Word by post of a fire lit, chosen or put out (src/lib/night-mail.ts), sent
   once the answer has gone so nobody waits on the mail service. */
function mailAfter(send: (mail: typeof import('@/lib/night-mail')) => Promise<unknown>) {
  if (!canSendEmail()) return;
  after(async () => {
    try { await send(await import('@/lib/night-mail')); }
    catch (e) { console.error('[playnight] the letters did not go:', e instanceof Error ? e.message : e); }
  });
}
const NO_REDIS = 'Spilakvöld eru aðeins geymd þegar Redis er tengt (REDIS_URL).';

const view = (me: string | null): Promise<PlayNightResponse> => viewNights(me);

export async function GET() {
  if (!process.env.REDIS_URL) return json(NO_NIGHTS);
  const me = (await getCrewSession())?.username ?? null;
  try { return json(await view(me)); }
  catch (e) { return json({ error: errorMessage(e) }, 500); }
}

const ACTIONS = new Set(['propose', 'vote', 'choose', 'cancel', 'start']);

export async function POST(req: NextRequest) {
  if (!process.env.REDIS_URL) return json({ error: NO_REDIS }, 503);
  const me = (await getCrewSession())?.username ?? null;
  if (!me) return json({ error: 'Skráðu þig inn til að taka þátt.' }, 401);
  const body = await jsonObject(req);
  if (!body) return json({ error: 'Ógilt JSON.' }, 400);
  const action = body.action;
  /* an unknown action is the request's fault, whichever night it names */
  if (typeof action !== 'string' || !ACTIONS.has(action)) return json({ error: 'Óþekkt aðgerð.' }, 400);
  const now = Date.now();

  try {
    const { all, shown } = await currentNights(now);

    if (action === 'propose') {
      if (all.filter(n => isPlanned(n, now)).length >= MAX_PLANNED) {
        return json({ error: `Það eru þegar ${MAX_PLANNED} kvöld á dagskrá. Bíddu þar til eitt er liðið eða slökktu á einu.` }, 409);
      }
      const times = checkTimes(body.times, now);
      if ('error' in times) return json({ error: times.error }, 400);
      if (clashOf(all, times.at, now)) return json({ error: 'Annað bál logar þegar sama kvöld. Veldu annan tíma.' }, 409);
      const note = typeof body.note === 'string' ? body.note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE) : '';
      const night: Night = {
        id: randomUUID().slice(0, 8), by: me, createdAt: new Date(now).toISOString(), note,
        options: times.at.map((at, i) => ({ id: String.fromCharCode(97 + i), at })),
        chosen: times.at.length === 1 ? 'a' : null, chosenBy: times.at.length === 1 ? me : null,
        cancelled: false, startedBy: null, outcome: null,
      };
      await writeNight(night);
      /* whoever lights the fire can make every time they offered */
      await writeVote(night, me, night.options.map(o => o.id), now);
      mailAfter(m => m.mailNights());
      return json(await view(me));
    }

    const cur = shown.find(s => s.night.id === body.night);
    if (!cur) return json({ error: 'Kvöldið fannst ekki; það gæti hafa verið fellt niður.' }, 404);
    const { night, votes } = cur;
    const phase = phaseOf(night, now);

    if (action === 'vote') {
      if (phase === 'live' || phase === 'over') return json({ error: 'Kvöldið er hafið; ekki er lengur hægt að svara.' }, 409);
      const yes = Array.isArray(body.yes) ? body.yes.filter((v): v is string => typeof v === 'string') : null;
      if (!yes) return json({ error: 'Svar vantar.' }, 400);
      /* once chosen, only the chosen time is answered */
      const allowed = new Set(night.chosen ? [night.chosen] : night.options.map(o => o.id));
      await writeVote(night, me, [...new Set(yes)].filter(id => allowed.has(id)), now);
      return json(await view(me));
    }

    if (action === 'choose' || action === 'cancel') {
      if (night.by !== me) return json({ error: 'Aðeins sá sem kveikti bálið getur þetta.' }, 403);
      if (action === 'choose') {
        if (night.chosen) return json({ error: 'Kvöldið er þegar valið.' }, 409);
        const option = optionOf(night, typeof body.option === 'string' ? body.option : null);
        if (!option) return json({ error: 'Tíminn fannst ekki.' }, 400);
        await writeNight({ ...night, chosen: option.id, chosenBy: me });
        mailAfter(m => m.mailNights());
      } else {
        if (phase === 'live' || phase === 'over') return json({ error: 'Kvöldið er hafið.' }, 409);
        await writeNight({ ...night, cancelled: true });
        mailAfter(m => m.mailNightOut(night, votes));
      }
      return json(await view(me));
    }

    if (action === 'start') {
      const chosen = optionOf(night, night.chosen);
      if (!chosen || (phase !== 'soon' && phase !== 'live')) {
        return json({ error: `Hægt er að kveikja á þjóninum frá ${START_BEFORE_MS / 60_000} mínútum fyrir kvöldið.` }, 409);
      }
      if (!yesFor(votes, chosen.id).includes(me)) return json({ error: 'Aðeins þau sem sögðust mæta geta kveikt á þjóninum.' }, 403);
      const token = process.env.EXAROTON_API_KEY;
      if (!token) return json({ error: 'EXAROTON_API_KEY hefur ekki verið stilltur.' }, 503);
      const status = await exarotonStatus(token);
      if (status !== 0 && status !== 7) return json({ error: status === 1 ? 'Þjónninn er þegar í gangi.' : 'Þjónninn er að ræsa eða stöðvast; bíddu smá.' }, 409);
      await startExaroton(token);
      /* the status is asked for afresh, so the lantern sees the server on its way up */
      forgetStatus();
      if (!night.startedBy) await writeNight({ ...night, startedBy: me });
      return json(await view(me));
    }

    return json({ error: 'Óþekkt aðgerð.' }, 400);
  } catch (e) {
    return json({ error: errorMessage(e) }, 500);
  }
}
