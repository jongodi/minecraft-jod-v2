import type { ServerState } from './types';

/** The one line under the state word. Written for each state, not templated. */
export function stateWord(state: ServerState): string {
  switch (state) {
    case 'online':
      return 'Í gangi';
    case 'offline':
      return 'Slökkt';
    case 'starting':
      return 'Er að ræsa';
    case 'stopping':
      return 'Er að slökkva';
    case 'unreachable':
      return 'Náði ekki sambandi';
    case 'checking':
      return 'Athuga';
  }
}

export function playersLine(state: ServerState, players: string[]): string {
  if (state === 'unreachable') return 'Reyni aftur eftir smá stund';
  if (state === 'checking') return '';
  if (state === 'starting') return 'Hægt að koma inn eftir mínútu';
  if (state !== 'online' || players.length === 0) return 'Enginn inni';
  return players.length === 1 ? '1 inni' : `${players.length} inni`;
}
