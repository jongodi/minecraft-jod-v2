import { describe, expect, it } from 'vitest';
import { STAT_TABS } from '@/components/badlands/data';

/* A roll-call poster on a 320 px phone holds ten letters of an alias on a
   line, its quotes and all (board.css lets it break only at a soft hyphen).
   Fastagesturinn had none, and its last letters were cut off the paper. */
describe('the aliases the board gives', () => {
  it('break at a soft hyphen into runs a narrow poster holds', () => {
    for (const { nick } of STAT_TABS) {
      const runs = nick.split('­');
      for (const run of runs) expect(run.length, nick).toBeLessThanOrEqual(10);
      /* a hyphen only at the join of a compound, never leaving a letter or two alone */
      if (runs.length > 1) for (const run of runs) expect(run.length, nick).toBeGreaterThanOrEqual(4);
    }
  });

  it('read as the plain word wherever they are set whole', () => {
    expect(STAT_TABS.find(t => t.id === 'attended')!.nick.replace(/­/g, '')).toBe('Fastagesturinn');
  });
});
