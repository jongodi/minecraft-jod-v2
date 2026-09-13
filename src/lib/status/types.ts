/** How the Ð crossbar is lit. Derived from ServerState, never set by hand. */
export type Lamp = 'on' | 'dim' | 'off';

export type ServerState =
  | 'online'
  | 'offline'
  | 'starting'
  | 'stopping'
  | 'unreachable'
  | 'checking';

export interface ServerStatus {
  state: ServerState;
  /** Usernames currently in the world. Empty unless online. */
  players: string[];
  /** ISO timestamp of the check this status came from. */
  checkedAt: string;
}

export function lampFor(state: ServerState): Lamp {
  switch (state) {
    case 'online':
      return 'on';
    case 'starting':
    case 'stopping':
      return 'dim';
    default:
      return 'off';
  }
}
