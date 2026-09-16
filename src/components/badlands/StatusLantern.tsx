'use client';

import Link from 'next/link';
import { Lantern } from './Bits';
import { useAgo, type ServerState } from './hooks';

/** The server's own lantern. Lit with the player count when the server is
    up, dark and labelled when it is not. It leads to the town, where the
    same people are shown by name. */
export default function StatusLantern({ server }: { server: ServerState }) {
  const { online, players, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const state = online === null ? '' : online ? ' is-on' : ' is-off';
  const word = online === null ? 'Athuga stöðuna' : online ? 'Kveikt á þjóninum' : 'Slökkt á þjóninum';
  return (
    <Link href="#camp" className={`b-status${state}`} aria-label={`${word}. Sjá hver er inni.`}>
      <Lantern lit={!!online} />
      <span>
        <span className="b-status__word" role="status" aria-live="polite">{word}</span>
        <span className="b-status__row">
          {online === null ? 'bíð eftir svari' :
           online ? (players === 0 ? 'enginn inni enn, en það er opið' : <>inni núna: <b>{players}</b></>) :
           'ekki hægt að tengjast í augnablikinu'}
          {checkedAt && ago ? `, ${ago}` : ''}
        </span>
      </span>
    </Link>
  );
}
