import { SERVER } from '@/data/server';
import { PlayerHead } from './PlayerHead';

interface RosterProps {
  online: string[];
  /** Head size in CSS pixels. */
  size?: number;
}

/**
 * Everyone who plays here, in one row. Faces that are in the world right now
 * are full; the rest are dimmed. With nobody on, which is most of the time,
 * the row still says who this place belongs to.
 */
export function Roster({ online, size = 40 }: RosterProps) {
  const on = new Set(online.map((n) => n.toLowerCase()));
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Leikmenn">
      {SERVER.players.map((name) => {
        const isOn = on.has(name.toLowerCase());
        return (
          <li key={name} className={isOn ? '' : 'opacity-30 grayscale'} title={name}>
            <PlayerHead name={name} size={size} />
            <span className="sr-only">{isOn ? `${name}, inni` : name}</span>
          </li>
        );
      })}
    </ul>
  );
}
