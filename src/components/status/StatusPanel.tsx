import type { ServerStatus } from '@/lib/status/types';
import { playersLine, stateWord } from '@/lib/status/copy';
import { CopyAddress } from './CopyAddress';

interface StatusPanelProps {
  status: ServerStatus;
  address: string;
  version: string;
}

/**
 * Answers the first two questions: is it on, who is in, how do I join.
 * The state word is set in the display face because it is the headline of
 * the visit; everything else in the panel is quiet.
 */
export function StatusPanel({ status, address, version }: StatusPanelProps) {
  const line = playersLine(status.state, status.players);
  return (
    <div className="rounded border border-line bg-surface p-6 sm:p-8">
      <p className="font-display text-h2" aria-live="polite">
        {stateWord(status.state)}
      </p>
      {line && <p className="mt-1 text-lead text-muted">{line}</p>}
      {status.state === 'online' && status.players.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-meta">
          {status.players.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-label text-muted">Vistfang</p>
        <CopyAddress address={address} />
        <p className="mt-3 text-meta text-muted">
          Java Edition, {version}
        </p>
      </div>
    </div>
  );
}
