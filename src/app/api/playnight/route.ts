import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { exarotonStatus, startExaroton } from '@/lib/exaroton';
import { errorMessage } from '@/lib/icelandic';
import {
  MAX_NOTE, START_BEFORE_MS, blocksNewFire, checkTimes, currentNight, decidesAt, optionOf, phaseOf, readNight,
  readVotes, writeNight, writeVote, yesFor, type Night, type Phase,
} from '@/lib/play-night';

/* Næsta spilakvöld (src/lib/play-night.ts). GET is the night as the page
   shows it, for anyone; POST acts on it, for a signed-in crew member:
   { action: 'propose', times, note } | { action: 'vote', yes } |
   { action: 'choose', option } | { action: 'cancel' } | { action: 'start' }. */

export const dynamic = 'force-dynamic';

export interface PublicNight {
  id: string;
  by: string;
  note: string;
  phase: Phase;
  options: { id: string; at: string; yes: string[] }[];
  chosen: string | null;
  chosenBy: string | null;
  /** when an unchosen night is decided on its own */
  decidesAt: string;
  startedBy: string | null;
  /** seen during the evening, or settled the day after */
  came: string[];
}

export interface PlayNightResponse { night: PublicNight | null; me: string | null }

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const NO_REDIS = 'Spilakvöld eru aðeins geymd þegar Redis er tengt (REDIS_URL).';

async function view(me: string | null): Promise<PlayNightResponse> {
  const now = Date.now();
  const cur = await currentNight(now);
  if (!cur) return { night: null, me };
  const { night, votes, seen } = cur;
  return {
    me,
    night: {
      id: night.id, by: night.by, note: night.note, phase: phaseOf(night, now),
      options: night.options.map(o => ({ ...o, yes: yesFor(votes, o.id) })),
      chosen: night.chosen, chosenBy: night.chosenBy,
      decidesAt: new Date(decidesAt(night)).toISOString(),
      startedBy: night.startedBy,
      came: night.outcome?.came ?? seen,
    },
  };
}

export async function GET() {
  if (!process.env.REDIS_URL) return json({ night: null, me: null } satisfies PlayNightResponse);
  const me = (await getCrewSession())?.username ?? null;
  try { return json(await view(me)); }
  catch (e) { return json({ error: errorMessage(e) }, 500); }
}

export async function POST(req: NextRequest) {
  if (!process.env.REDIS_URL) return json({ error: NO_REDIS }, 503);
  const me = (await getCrewSession())?.username ?? null;
  if (!me) return json({ error: 'Skráðu þig inn til að taka þátt.' }, 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = body?.action;
  const now = Date.now();

  try {
    if (action === 'propose') {
      if (blocksNewFire(await readNight(), now)) return json({ error: 'Það logar þegar bál. Eitt kvöld í einu.' }, 409);
      const times = checkTimes(body?.times, now);
      if ('error' in times) return json({ error: times.error }, 400);
      const note = typeof body?.note === 'string' ? body.note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE) : '';
      const night: Night = {
        id: randomUUID(), by: me, createdAt: new Date(now).toISOString(), note,
        options: times.at.map((at, i) => ({ id: String.fromCharCode(97 + i), at })),
        chosen: times.at.length === 1 ? 'a' : null, chosenBy: times.at.length === 1 ? me : null,
        cancelled: false, startedBy: null, outcome: null,
      };
      await writeNight(night);
      /* whoever lights the fire can make every time they offered */
      await writeVote(night.id, me, night.options.map(o => o.id));
      return json(await view(me));
    }

    const cur = await currentNight(now);
    if (!cur) return json({ error: 'Ekkert bál logar.' }, 404);
    const { night, votes } = cur;
    const phase = phaseOf(night, now);

    if (action === 'vote') {
      if (phase === 'live' || phase === 'over') return json({ error: 'Kvöldið er hafið; ekki er lengur hægt að svara.' }, 409);
      const yes = Array.isArray(body?.yes) ? body.yes.filter((v): v is string => typeof v === 'string') : null;
      if (!yes) return json({ error: 'Svar vantar.' }, 400);
      /* once chosen, only the chosen time is answered */
      const allowed = new Set(night.chosen ? [night.chosen] : night.options.map(o => o.id));
      await writeVote(night.id, me, [...new Set(yes)].filter(id => allowed.has(id)));
      return json(await view(me));
    }

    if (action === 'choose' || action === 'cancel') {
      if (night.by !== me) return json({ error: 'Aðeins sá sem kveikti bálið getur þetta.' }, 403);
      if (action === 'choose') {
        if (night.chosen) return json({ error: 'Kvöldið er þegar valið.' }, 409);
        const option = optionOf(night, typeof body?.option === 'string' ? body.option : null);
        if (!option) return json({ error: 'Tíminn fannst ekki.' }, 400);
        await writeNight({ ...night, chosen: option.id, chosenBy: me });
      } else {
        if (phase === 'live' || phase === 'over') return json({ error: 'Kvöldið er hafið.' }, 409);
        await writeNight({ ...night, cancelled: true });
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
      if (!night.startedBy) await writeNight({ ...night, startedBy: me });
      return json(await view(me));
    }

    return json({ error: 'Óþekkt aðgerð.' }, 400);
  } catch (e) {
    return json({ error: errorMessage(e) }, 500);
  }
}
