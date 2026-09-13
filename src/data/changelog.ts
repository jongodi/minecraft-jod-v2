// What changed on the server, newest first. Date plus one line, twelve
// words at most. The section only exists when this list has entries.

export interface Change {
  /** ISO date, e.g. '2026-09-01'. */
  date: string;
  line: string;
}

export const CHANGELOG: readonly Change[] = [];
