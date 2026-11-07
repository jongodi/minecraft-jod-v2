import { describe, expect, it } from 'vitest';
import { beyond, type OnRidge } from '../roster';

const at = (name: string, phase: OnRidge['phase'] = 'here'): OnRidge => ({ name, phase });

describe('beyond', () => {
  it('counts who is in past the figures drawn', () => {
    expect(beyond(5, [at('stebbias'), at('joenana'), at('eikibleiki')])).toBe(2);
    expect(beyond(3, [at('stebbias')])).toBe(2);
  });

  it('takes one on their way in as drawn', () => {
    expect(beyond(4, [at('stebbias'), at('joenana', 'coming'), at('eikibleiki')])).toBe(1);
  });

  it('counts no one fewer for a figure on its way out', () => {
    /* two are in; a third, gone, is still walking off */
    expect(beyond(2, [at('AmmaGaur', 'going')])).toBe(2);
  });

  it('is nothing when everyone in is drawn', () => {
    expect(beyond(2, [at('stebbias'), at('joenana')])).toBe(0);
    expect(beyond(0, [])).toBe(0);
  });
});
