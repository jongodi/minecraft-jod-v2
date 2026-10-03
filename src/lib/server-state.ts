/* The server's state as the site tells it, read from Exaroton's status
   codes. Shared by the status API, the lantern in the hero, the crew's
   room and the fire a play night is started from. No server imports. */

/** On and off, and the moments between them. */
export type ServerLife = 'on' | 'off' | 'starting' | 'stopping' | 'restarting' | 'crashed' | 'unknown';

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
