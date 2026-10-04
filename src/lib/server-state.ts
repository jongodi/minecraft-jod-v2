/* The server's state as the site tells it, read from Exaroton's status
   codes. Shared by the status API, the lantern in the hero, the crew's
   room and the fire a play night is started from. No server imports
   (types only). */
import type { LastOnline, StatusResponse } from '@/lib/server-status';

/** On and off, and the moments between them. */
export type ServerLife = 'on' | 'off' | 'starting' | 'stopping' | 'restarting' | 'crashed' | 'unknown';

/** The status as the page holds it, on the server and in the browser alike. */
export interface ServerState {
  online:    boolean | null;   // null while nothing has answered yet
  /** on, off, or on its way between; null while nothing has answered yet */
  life:      ServerLife | null;
  players:   number;
  max:       number;
  list:      string[];
  version:   string | null;
  /** when the server last burned and who was in, while it is dark and the store remembers */
  lastOnline: LastOnline | null;
  checkedAt: number | null;
}

export const NO_STATUS: ServerState = { online: null, life: null, players: 0, max: 20, list: [], version: null, lastOnline: null, checkedAt: null };

/** A status answer as the page holds it. */
export function toServerState(data: StatusResponse, checkedAt = Date.now()): ServerState {
  return {
    online:     data.online ?? false,
    life:       data.life ?? (data.online ? 'on' : 'off'),
    players:    data.players?.online ?? 0,
    max:        data.players?.max ?? 20,
    list:       (data.players?.list ?? []).map(p => p.name),
    version:    data.version ?? null,
    lastOnline: data.lastOnline ?? null,
    checkedAt,
  };
}

/* Exaroton: 0 offline, 1 online, 2 starting, 3 stopping, 4 restarting,
   5 saving, 6 loading, 7 crashed, 8 pending, 10 preparing */
export function lifeOf(code: number): ServerLife {
  switch (code) {
    case 1: return 'on';
    case 0: return 'off';
    case 2: case 6: case 8: case 10: return 'starting';
    case 3: case 5: return 'stopping';
    case 4: return 'restarting';
    case 7: return 'crashed';
    default: return 'unknown';
  }
}

/** Between two states: the status is asked for more often, and kept for less. */
export const isChanging = (life: ServerLife | null | undefined): boolean =>
  life === 'starting' || life === 'stopping' || life === 'restarting';

/** The longest a server takes to come up. After the site asked for a start,
    the lantern is held at kindling this long at most, until the status says. */
export const STARTING_MS = 3 * 60_000;
