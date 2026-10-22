'use client';

// Óskast: a call for something, nailed to the sign it was put up on. A paper
// notice in the wanted posters' type: what the reward is, who has taken it
// on, and the buttons that move it on. Done, it is stamped in red, as the
// saloon would stamp a bounty paid.
import { useState } from 'react';
import Link from 'next/link';
import type { CrewBounty } from '@/lib/crew-types';
import { bountyState, sameUser } from '@/lib/crew-types';
import { errorFrom, failure } from '@/lib/crew-upload';
import PlayerHead from '@/components/badlands/PlayerHead';

interface Props {
  /** whose wall the call hangs on, who posted it */
  username: string;
  entryId:  string;
  bounty:   CrewBounty;
  me:       string | null | undefined;
  isOwner:  boolean;
  onChange: (bounty: CrewBounty) => void;
}

type Action = 'take' | 'drop' | 'done' | 'reopen';

export default function Call({ username, entryId, bounty, me, isOwner, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const state = bountyState(bounty);
  const mine = !!me && !!bounty.takenBy && sameUser(bounty.takenBy, me);

  async function act(action: Action) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/crew/${username}/entries/${entryId}/bounty`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (!res.ok) throw new Error(await errorFrom(res));
      onChange((await res.json() as { bounty: CrewBounty }).bounty);
    } catch (e) { setError(failure(e, 'Ekki tókst að breyta óskinni.')); }
    finally { setBusy(false); }
  }

  return (
    <div className={`b-paper w-call is-${state}`}>
      <span className="b-paper__nail" aria-hidden="true" />
      {/* the wanted posters' masthead, for what is wanted here */}
      <p className="b-poster__mast w-call__mast">Óskast</p>
      <p className="w-call__reward"><span className="b-poster__reward">Verðlaun</span> <span className="w-call__pay">{bounty.reward}</span></p>
      <p className="w-call__state" aria-live="polite">
        {state === 'open' && 'Enginn kominn á slóðina enn.'}
        {state === 'taken' && <><Link href={`/crew/${bounty.takenBy}`} className="w-call__who"><PlayerHead name={bounty.takenBy!} size={16} alt="" />{bounty.takenBy}</Link> tók þetta að sér.</>}
        {state === 'done' && (bounty.takenBy
          ? <><Link href={`/crew/${bounty.takenBy}`} className="w-call__who"><PlayerHead name={bounty.takenBy} size={16} alt="" />{bounty.takenBy}</Link> sótti verðlaunin.</>
          : 'Lokað án þess að nokkur sækti verðlaunin.')}
      </p>
      {/* the stamp a paid bounty gets, in the strata's red */}
      {state === 'done' && <span className="w-call__stamp" aria-hidden="true">{bounty.takenBy ? 'Í höfn' : 'Lokað'}</span>}
      {me && (
        <div className="w-call__acts">
          {state === 'open' && !isOwner && <button type="button" className="b-btn b-btn--solid b-btn--small" onClick={() => act('take')} disabled={busy}>Ég tek þetta að mér</button>}
          {state === 'taken' && mine && <button type="button" className="b-btn b-btn--small" onClick={() => act('drop')} disabled={busy}>Hætta við</button>}
          {isOwner && state !== 'done' && (
            <button type="button" className={`b-btn b-btn--small${state === 'taken' ? ' b-btn--solid' : ''}`} onClick={() => act('done')} disabled={busy}>
              {state === 'taken' ? 'Komið í höfn' : 'Loka óskinni'}
            </button>
          )}
          {isOwner && state === 'done' && <button type="button" className="b-btn b-btn--small" onClick={() => act('reopen')} disabled={busy}>Opna aftur</button>}
        </div>
      )}
      {error && <p className="b-err" role="alert">{error}</p>}
    </div>
  );
}
