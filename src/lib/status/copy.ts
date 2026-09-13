import type { ServerState } from './types';

export function stateWord(state: ServerState): string {
  switch (state) {
    case 'online':
      return 'Í gangi';
    case 'offline':
      return 'Slökkt';
    case 'starting':
      return 'Ræsir';
    case 'stopping':
      return 'Slekkur';
    case 'unreachable':
      return 'Ekkert svar';
    case 'checking':
      return 'Athuga';
  }
}

/** "stebbias, joenana og AmmaGaur inni", the way you would say it. */
function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}

export function playersLine(state: ServerState, players: string[]): string {
  switch (state) {
    case 'online':
      return players.length === 0 ? 'Enginn inni' : `${joinNames(players)} inni`;
    case 'starting':
      return 'Hægt að koma inn eftir mínútu';
    case 'unreachable':
      return 'Næ ekki í þjóninn, reyni aftur';
    case 'checking':
      return '';
    default:
      return 'Enginn inni';
  }
}
