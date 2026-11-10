import { plural } from '@/lib/format';

/** What the crease on a phone's poster says is folded behind it: "1 ákæra og
    12 afrek". With neither counted (no numbers from the game and none earned
    yet, while the list of what is left still stands behind the fold) it still
    says what the press does: it was a blank dashed button. */
export function creaseLabel(charges: number | null, earned: number): string {
  const parts = [
    charges !== null && `${charges} ${plural(charges, 'ákæra', 'ákærur')}`,
    earned > 0 && `${earned} afrek`,
  ].filter(Boolean);
  return parts.length ? parts.join(' og ') : 'Brjóta sundur';
}
