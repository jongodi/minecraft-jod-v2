'use client';

import { Lantern } from './Bits';
import PlayerHead from './PlayerHead';
import { CREW } from './data';
import { useAgo, type ServerState } from './hooks';

/** The server's own lantern. Lit with the player count and the heads of who is
    in when the server is up, dark and labelled when it is not. It carries the
    version too, and opens the crew's room, where the same people are shown by
    name. A plain anchor: the hash is what opens the room, so it works before
    the page's script has run and from any other page as /#hopur. */
export default function StatusLantern({ server }: { server: ServerState }) {
  const { online, players, list, version, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const state = online === null ? '' : online ? ' is-on' : ' is-off';
  const word = online === null ? 'Athuga stöðuna' : online ? 'Kveikt á þjóninum' : 'Slökkt á þjóninum';
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase()));
  return (
    <a href="#hopur" className={`b-status${state}`} aria-label={`${word}. Sjá hver er inni og eftirlýsingaspjöldin.`}>
      <Lantern lit={!!online} />
      <span className="b-status__text">
        <span className="b-status__word" role="status" aria-live="polite">{word}</span>
        <span className="b-status__row">
          {online === null ? 'bíð eftir svari' :
           online ? (players === 0 ? 'enginn inni enn, en það er opið' : <>inni núna: <b>{players}</b></>) :
           'ekki hægt að tengjast'}
          {checkedAt && ago ? `, ${online ? '' : 'athugað '}${ago}` : ''}
        </span>
        {(version || inside.length > 0) && (
          <span className="b-status__row b-status__meta">
            {inside.length > 0 && <span className="b-status__heads" aria-hidden="true">{inside.map(n => <PlayerHead key={n} name={n} size={16} />)}</span>}
            {version && <span>Minecraft {version} · Java</span>}
          </span>
        )}
      </span>
    </a>
  );
}
