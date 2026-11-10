/* Afrek unnið: which of a member's own advancements a device has yet to show
   them, and what the game's toast says for each. Pure, so the rule is tested
   without a browser (AdvancementToasts.tsx shows them). */

export interface OwnAdvancement { id: string; title: string; frame: 'task' | 'goal' | 'challenge'; seen: string }

/** The toast's headline, as the game words its three: "Advancement Made!",
    "Goal Reached!", "Challenge Complete!". */
export const HEADLINE: Record<OwnAdvancement['frame'], string> = {
  task: 'Afrek unnið!',
  goal: 'Markmiði náð!',
  challenge: 'Áskorun lokið!',
};

/** How many toasts one visit shows at most: more than that is a queue to sit through. */
export const MOST_TOASTS = 3;

export interface Shown {
  /** the toasts to show, in order: a headline and what it is for */
  toasts: { title: string; data: string }[];
  /** what the device remembers from now: the latest it has been shown */
  marker: string;
}

/** What to show a member, given what this device last showed them (`marker`,
    an ISO moment, or null for a device that has shown nothing yet).
    A device's first visit shows nothing and starts remembering from now: it
    would otherwise greet a member with two weeks of old news. After that,
    everything that reached the site since the marker, oldest first; with more
    than three, the two newest and a count of the rest, so the queue is three
    at most. The marker moves to the latest shown and never back. */
export function toShow(list: readonly OwnAdvancement[], marker: string | null, now: string): Shown {
  if (marker === null) return { toasts: [], marker: now };
  const fresh = list.filter(a => a.seen > marker).sort((a, b) => a.seen.localeCompare(b.seen));
  if (fresh.length === 0) return { toasts: [], marker };
  const one = (a: OwnAdvancement) => ({ title: HEADLINE[a.frame], data: a.title });
  const latest = fresh[fresh.length - 1].seen;
  if (fresh.length <= MOST_TOASTS) return { toasts: fresh.map(one), marker: latest };
  const rest = fresh.length - (MOST_TOASTS - 1);
  return { toasts: [...fresh.slice(-(MOST_TOASTS - 1)).map(one), { title: `Og ${rest} afrek til viðbótar`, data: 'á veggnum þínum' }], marker: latest };
}

export const markerKey = (username: string) => `jod-afrek-seen:${username.toLowerCase()}`;
