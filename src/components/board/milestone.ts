import { formatNumber, plural } from '@/lib/format';
import type { MilestoneKind } from '@/lib/milestones';

/* A round number passed, in the board's words: what the member did, with the
   number and its unit set in bold, and for the hours what they come to in
   whole days and nights ("rúmir 20 sólarhringar"; a count ending in one is
   singular, "rúmur 21 sólarhringur"). */
export function milestoneWords(what: MilestoneKind, mark: number): { before: string; bold: string; after: string; sub: string | null } {
  const n = formatNumber(mark);
  switch (what) {
    case 'hours': {
      const days = Math.floor(mark / 24);
      const over = mark % 24 !== 0;
      const sub = days < 1 ? null : `það ${plural(days, 'er', 'eru')} ${over ? `${plural(days, 'rúmur', 'rúmir')} ` : ''}${formatNumber(days)} ${plural(days, 'sólarhringur', 'sólarhringar')}`;
      return { before: 'hefur verið ', bold: `${n} ${plural(mark, 'klukkustund', 'klukkustundir')}`, after: ' í heiminum', sub };
    }
    case 'deaths': return { before: 'dó í ', bold: `${n}. sinn`, after: '', sub: null };
    case 'mobs':   return { before: 'hefur fellt ', bold: `${n} ${plural(mark, 'veru', 'verur')}`, after: '', sub: null };
    case 'km':     return { before: 'hefur farið ', bold: `${n} km`, after: ' á eigin fótum', sub: null };
  }
}
