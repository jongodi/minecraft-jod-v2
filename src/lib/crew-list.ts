// Single source of truth for crew member usernames.
// Import this in both server and client components.
export const CREW_USERNAMES = [
  'stebbias',
  'AmmaGaur',
  'joenana',
  'ingunnbirta',
  'Gamla123',
  'fafnir1994',
  'IMlonely',
  'eikibleiki',
] as const;

export type CrewUsername = (typeof CREW_USERNAMES)[number];
