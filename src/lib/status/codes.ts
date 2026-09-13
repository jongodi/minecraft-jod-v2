import type { ServerState } from './types';

/** Exaroton status codes, from their API docs, mapped to the site's states. */
export function stateFromCode(code: number): ServerState {
  switch (code) {
    case 1: // online
    case 5: // saving
      return 'online';
    case 0: // offline
    case 7: // crashed
      return 'offline';
    case 3: // stopping
      return 'stopping';
    default: // starting, restarting, loading, pending, preparing
      return 'starting';
  }
}
