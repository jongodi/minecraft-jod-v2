import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/components/badlands/data';
import { readBoard } from '@/lib/board';
import { isFilter } from '@/lib/board-types';
import { getCrewSession } from '@/lib/crew';
import { hasPassword } from '@/lib/crew-access';
import BoardPage from '@/components/board/BoardPage';

/* The board's own page: the same board that opens over the world (#taflan),
   with the bar and the night around it, for a link to share and for the
   board's door on every other page. Drawn on each request with the board as
   it stands and who is looking, so the slot to put things up is there at
   first paint for a member; the browser asks again behind it. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Taflan',
  description: 'Það sem gerist á JOÐ, nýjast efst: myndir og miðar félaganna, óskir og spurningar, bál og spilakvöld, afrek og það sem bættist við kortið.',
  openGraph: { title: 'Taflan á JOÐ', description: 'Það sem gerist á JOÐ, nýjast efst.', type: 'website', locale: 'is_IS', siteName: SITE_NAME },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Taflan({ searchParams }: Props) {
  const [board, session, query] = await Promise.all([readBoard().catch(() => null), getCrewSession(), searchParams]);
  const seed = { me: session?.username ?? null, hasPassword: session ? await hasPassword(session.username).catch(() => false) : false };
  const syna = typeof query.syna === 'string' ? query.syna : null;
  /* which drawing this is, so Back to it is told from a fresh one (useRestored) */
  return <BoardPage initial={board} session={seed} initialFilter={isFilter(syna) ? syna : 'allt'} drawn={randomUUID()} />;
}
