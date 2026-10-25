import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safe-next';

describe('safeNext', () => {
  it('keeps a path on this site, with its query and hash', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/admin/x?flipi=pakkar#efst')).toBe('/admin/x?flipi=pakkar#efst');
  });

  it.each([
    ['nothing', null],
    ['another site', 'https://evil.example/'],
    ['a protocol-relative address', '//evil.example'],
    ['a backslash the browser reads as a slash', '/\\evil.example'],
    ['a tab the browser drops', '/\t/evil.example'],
    ['a line break the browser drops', '/\n/evil.example'],
    ['script', 'javascript:alert(1)'],
  ])('sends %s to the panel instead', (_what, v) => {
    expect(safeNext(v)).toBe('/admin');
  });
});
