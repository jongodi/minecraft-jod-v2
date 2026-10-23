'use client';

import '@/app/badlands.css';
import type { BoardFilter, BoardResponse } from '@/lib/board-types';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import NightSky from '@/components/badlands/NightSky';
import { PAGE_LINKS } from '@/components/badlands/data';
import { seedSession, type CrewSessionSeed } from '@/components/badlands/hooks';
import Board from './Board';

/** The board on its own page, an hour on into the night like the walls:
    the bar with the board's door lit, the night sky, and the campfire at the foot. */
export default function BoardPage({ initial, session, initialFilter }: { initial: BoardResponse | null; session: CrewSessionSeed; initialFilter: BoardFilter }) {
  /* who the server found looking, so a member's slot is in the markup */
  seedSession(session);
  return (
    <div className="b">
      <AddressBar links={PAGE_LINKS} activeId="taflan" always />
      <NightSky />
      <main id="efni" className="b-wrap b-page t-page">
        <div className="b-page__head t-page__head">
          <div>
            {/* named as the door that leads here */}
            <h1 className="b-title">Taflan</h1>
            <p className="b-lede">Það sem gerist á JOÐ, nýjast efst: myndir og miðar hópsins, óskir og spurningar, bálin og kvöldin, afrekin og það sem bættist við kortið.</p>
          </div>
        </div>
        <Board initial={initial} initialFilter={initialFilter} session={session} />
      </main>
      <Footer />
    </div>
  );
}
