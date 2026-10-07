'use client';

import { CopyIcon, Mark } from './Bits';
import PlayerHead from './PlayerHead';
import { CREW, SERVER_IP } from './data';
import { useAgo, useCopy, type ServerState } from './hooks';
import { sinceAt } from './night';
import type { ServerLife } from '@/lib/server-state';

/* What the line under the row says in each state the server can be in. */
const SAID: Record<ServerLife, { word: string; row: string }> = {
  on:         { word: 'Kveikt á þjóninum',      row: '' },
  off:        { word: 'Slökkt á þjóninum',      row: 'enginn inni' },
  starting:   { word: 'Þjónninn er að vakna',   row: 'tekur eina til tvær mínútur' },
  restarting: { word: 'Þjónninn endurræsist',   row: 'kemur aftur eftir augnablik' },
  stopping:   { word: 'Þjónninn er að slokkna', row: 'slökkt eftir augnablik' },
  crashed:    { word: 'Þjónninn hrundi',        row: 'þarf að kveikja aftur á honum' },
  unknown:    { word: 'Náði ekki sambandi',     row: 'reyni aftur eftir smástund' },
};
/* The moment of the last answer is said only once it is stale: two polls missed. */
const STALE_MS = 120_000;
/* The version as a player picks it in the launcher: the host's build number in brackets is not theirs. */
const launcherVersion = (v: string) => v.replace(/\s*\([^)]*\)\s*$/, '');

/** The connection's bars, as the game draws them beside a server: five, rising. */
function Bars() {
  return (
    <svg className="b-row__bars" viewBox="0 0 10 8" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <rect key={i} className="b-row__bar" x={i * 2} y={7 - (i + 1) * 1.5 + 0.5} width="1" height={(i + 1) * 1.5 - 0.5} fill="currentColor" />)}
    </svg>
  );
}

/** The hero says what it has to say in the shape every player already reads
    before joining: the row from the game's multiplayer screen. The mark as the
    server's icon, the address as its name, the sentence as its message of the
    day, and at the right the player count and the connection's bars. Pressing
    the row copies the address, as the game's row is what you press to join;
    the stamp says it was done. The state in words is a line under the row,
    read and never pressed, with the heads of who is in. */
export default function ServerRow({ server }: { server: ServerState }) {
  const { online, life, players, max, list, version, lastOnline, checkedAt } = server;
  const [copied, copy] = useCopy(SERVER_IP, { toast: false });
  /* '' until the page has hydrated, so the first render matches the markup however old the cached page is */
  const ago = useAgo(checkedAt);
  const stale = ago !== '' && checkedAt !== null && Date.now() - checkedAt >= STALE_MS;
  const said = life ? SAID[life] : null;
  const state = online ? 'is-on' : life === 'starting' || life === 'restarting' || life === 'stopping' ? 'is-kindling' : life ? 'is-off' : '';
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase()));
  /* a dark server says when it last burned, and shows who was in then */
  const last = life === 'off' && lastOnline ? lastOnline : null;
  const heads = online ? inside : (last?.names ?? []);
  return (
    <div className={`b-hero__server${state ? ` ${state}` : ''}`}>
      <div className={`b-row${copied ? ' is-copied' : ''}`}>
        <button type="button" className="b-row__btn" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
          <span className="b-row__icon"><Mark /></span>
          <span className="b-row__text">
            <span className="b-row__name"><CopyIcon />{SERVER_IP}</span>
            <span className="b-row__motd">Minecraft-heimur átta vina, frá sumrinu 2024. Aðgangur með boði.</span>
          </span>
          <span className="b-row__ping" aria-hidden="true">
            {/* the count, as the game writes it, only while the server is on */}
            {online && <span className="b-row__count">{players}/{max}</span>}
            <Bars />
          </span>
          <span className="b-row__stamp" aria-hidden="true">Afritað</span>
        </button>
        <span className="b-visually-hidden" role="status">{copied ? 'Afritað' : ''}</span>
      </div>
      {/* the state in words: read, never pressed. How stale the answer is is told from the clock, which the server read before the browser does */}
      <p className="b-hero__state" role="status" aria-live="polite" suppressHydrationWarning>
        <span className="b-hero__word">{said?.word ?? 'Athuga stöðuna'}</span>
        <span className="b-hero__sep" aria-hidden="true">·</span>
        <span>
          {!said ? 'bíð eftir svari' :
           online ? (players === 0 ? 'enginn inni enn, en það er opið' : <>inni núna:{' '}<span className="b-hero__heads" aria-label={inside.join(', ')}>{heads.map(n => <PlayerHead key={n} name={n} size={16} />)}</span>{players > inside.length && ` og ${players - inside.length} ${players - inside.length === 1 ? 'gestur' : 'gestir'}`}</>) :
           last ? <>síðast kveikt {sinceAt(last.at)}{heads.length > 0 && <>{' '}<span className="b-hero__heads b-hero__heads--then" aria-label={`þá inni: ${heads.join(', ')}`}>{heads.map(n => <PlayerHead key={n} name={n} size={16} />)}</span></>}</> :
           said.row}
          {stale && ago && state !== 'is-kindling' ? `, athugað ${ago}` : ''}
        </span>
        {online && version && <><span className="b-hero__sep" aria-hidden="true">·</span><span>Minecraft {launcherVersion(version)} · Java</span></>}
      </p>
    </div>
  );
}
