'use client';

import { Lantern } from './Bits';
import PlayerHead from './PlayerHead';
import { CREW } from './data';
import { useAgo, type ServerState } from './hooks';
import { sinceAt } from './night';
import type { ServerLife } from '@/lib/server-state';

/* What the lantern says in each state the server can be in: the word in
   the pixel face, a line under it, and how the lantern burns. A server on
   its way up or down is kindling: a small unsteady flame behind the glass. */
const SAID: Record<ServerLife, { word: string; row: string; burn: 'lit' | 'kindling' | 'dark' }> = {
  on:         { word: 'Kveikt á þjóninum',      row: '',                               burn: 'lit' },
  off:        { word: 'Slökkt á þjóninum',      row: 'enginn inni',                    burn: 'dark' },
  starting:   { word: 'Þjónninn er að vakna',   row: 'tekur eina til tvær mínútur',    burn: 'kindling' },
  restarting: { word: 'Þjónninn endurræsist',   row: 'kemur aftur eftir augnablik',    burn: 'kindling' },
  stopping:   { word: 'Þjónninn er að slokkna', row: 'slökkt eftir augnablik',         burn: 'kindling' },
  crashed:    { word: 'Þjónninn hrundi',        row: 'þarf að kveikja aftur á honum',  burn: 'dark' },
  unknown:    { word: 'Náði ekki sambandi',     row: 'reyni aftur eftir smástund',     burn: 'dark' },
};

/** The server's own lantern. Lit with the player count and the heads of who is
    in when the server is up, kindling while it is on its way up or down, dark
    and labelled when it is not. It carries the version too, and opens the
    crew's room, where the same people are shown by name. A plain anchor: the
    hash is what opens the room, so it works before the page's script has run
    and from any other page as /#hopur. */
export default function StatusLantern({ server }: { server: ServerState }) {
  const { online, life, players, list, version, lastOnline, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const said = life ? SAID[life] : null;
  const word = said?.word ?? 'Athuga stöðuna';
  const burn = said?.burn ?? null;
  const state = burn === 'lit' ? ' is-on' : burn === 'kindling' ? ' is-kindling' : burn === 'dark' ? ' is-off' : '';
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase()));
  /* a dark lantern says when it last burned, and shows who was in then */
  const last = life === 'off' && lastOnline ? lastOnline : null;
  const heads = online ? inside : (last?.names ?? []);
  /* The link is named by what it shows, word for word, and by where it leads:
     a label written beside the text drifted from it (the moment it was
     checked was on the screen but not in the name). */
  return (
    <a href="#hopur" className={`b-status${state}`}>
      <Lantern lit={burn === 'lit'} className={burn === 'kindling' ? 'is-kindling' : undefined} />
      <span className="b-status__text">
        <span className="b-status__word" role="status" aria-live="polite">{word}</span>
        {/* "athugað rétt í þessu" is told from the clock, which the server read before the browser does */}
        <span className="b-status__row" suppressHydrationWarning>
          {!said ? 'bíð eftir svari' :
           online ? (players === 0 ? 'enginn inni enn, en það er opið' : <>inni núna: <b>{players}</b></>) :
           last ? `síðast kveikt ${sinceAt(last.at)}` :
           said.row}
          {checkedAt && ago && burn !== 'kindling' ? `, ${online ? '' : 'athugað '}${ago}` : ''}
        </span>
        {(version || heads.length > 0) && (
          <span className="b-status__row b-status__meta">
            {heads.length > 0 && (
              <span className={`b-status__heads b-tip${online ? '' : ' b-status__heads--then'}`} data-tip={`${online ? 'inni' : 'síðast inni'}: ${heads.join(', ')}`} aria-hidden="true">
                {heads.map(n => <PlayerHead key={n} name={n} size={16} />)}
              </span>
            )}
            {version && <span>Minecraft {version} · Java</span>}
          </span>
        )}
        <span className="b-visually-hidden">. Sjá hver er inni og eftirlýsingaspjöldin.</span>
      </span>
    </a>
  );
}
