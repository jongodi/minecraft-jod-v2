import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register } from '../../instrumentation';

describe('instrumentation: the url.parse() deprecation', () => {
  const original = process.emitWarning;
  const sent = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    process.emitWarning = sent as unknown as typeof process.emitWarning;
    register();
  });

  afterEach(() => {
    process.emitWarning = original;
    vi.unstubAllEnvs();
    sent.mockReset();
  });

  it('drops DEP0169, however it is emitted', () => {
    process.emitWarning('`url.parse()` behavior is not standardized', 'DeprecationWarning', 'DEP0169');
    process.emitWarning('`url.parse()` behavior is not standardized', { type: 'DeprecationWarning', code: 'DEP0169' });
    const err = Object.assign(new Error('`url.parse()`'), { name: 'DeprecationWarning', code: 'DEP0169' });
    process.emitWarning(err);
    expect(sent).not.toHaveBeenCalled();
  });

  it('lets every other warning through as it was', () => {
    process.emitWarning('Buffer() is deprecated', 'DeprecationWarning', 'DEP0005');
    process.emitWarning('something odd');
    expect(sent).toHaveBeenCalledTimes(2);
    expect(sent).toHaveBeenNthCalledWith(1, 'Buffer() is deprecated', 'DeprecationWarning', 'DEP0005');
    expect(sent).toHaveBeenNthCalledWith(2, 'something odd');
  });
});
