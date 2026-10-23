'use client';

// A question for the crew: its answers in a column, each a row that fills
// with the heads of those who chose it, the way a fire grows with everyone
// who can make the night. One answer a member; pressing your own again takes
// it back. The one who asked closes it, and the answer most chose is marked.
import { useState } from 'react';
import type { CrewPoll } from '@/lib/crew-types';
import { sameUser } from '@/lib/crew-types';
import { errorFrom, failure } from '@/lib/crew-upload';
import { plural } from '@/lib/format';
import PlayerHead from '@/components/badlands/PlayerHead';

interface Props {
  username: string;
  entryId:  string;
  poll:     CrewPoll;
  me:       string | null | undefined;
  isOwner:  boolean;
  onChange: (poll: CrewPoll) => void;
}

export default function Poll({ username, entryId, poll, me, isOwner, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = poll.choices.reduce((n, c) => n + c.votes.length, 0);
  const most = Math.max(0, ...poll.choices.map(c => c.votes.length));
  const mineId = me ? poll.choices.find(c => c.votes.some(v => sameUser(v, me)))?.id ?? null : null;
  const canVote = !!me && !poll.closed;

  async function send(body: { choice: string | null } | { closed: boolean }) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/crew/${username}/entries/${entryId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await errorFrom(res));
      onChange((await res.json() as { poll: CrewPoll }).poll);
    } catch (e) { setError(failure(e, 'Ekki tókst að svara.')); }
    finally { setBusy(false); }
  }

  return (
    <div className={`w-poll${poll.closed ? ' is-closed' : ''}`}>
      <ul className="w-poll__list" aria-label="Svarkostir">
        {poll.choices.map(c => {
          const chosen = c.id === mineId;
          const won = poll.closed && most > 0 && c.votes.length === most;
          const share = total ? c.votes.length / total : 0;
          return (
            <li key={c.id}>
              <button type="button" className={`w-poll__choice${chosen ? ' is-mine' : ''}${won ? ' is-won' : ''}`}
                onClick={() => send({ choice: chosen ? null : c.id })} disabled={!canVote || busy} aria-pressed={chosen}
                style={{ '--share': share } as React.CSSProperties}>
                <span className="w-poll__fill" aria-hidden="true" />
                <span className="w-poll__text">{c.text}{won && <span className="w-poll__won">flest völdu</span>}</span>
                <span className="w-poll__heads" aria-hidden="true">{c.votes.map(v => <PlayerHead key={v} name={v} size={16} alt="" />)}</span>
                <span className="w-poll__count">{c.votes.length}<span className="b-visually-hidden"> atkvæði{c.votes.length ? `: ${c.votes.join(', ')}` : ''}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="w-poll__foot">
        <span>{total} {plural(total, 'hefur svarað', 'hafa svarað')}{poll.closed ? ' · lokað fyrir svör' : !me ? ' · skráðu þig inn til að svara' : mineId ? ' · ýttu aftur á þitt til að draga það til baka' : ''}</span>
        {isOwner && <button type="button" className="w-tool" onClick={() => send({ closed: !poll.closed })} disabled={busy}>{poll.closed ? 'opna aftur' : 'loka fyrir svör'}</button>}
      </p>
      {error && <p className="b-err" role="alert">{error}</p>}
    </div>
  );
}
