import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../hooks';

/* A page with only what copyText reaches for: the clipboard, if any, and the
   hidden textarea's document, whose execCommand says whether it copied. */
function page({ clipboard, execCommand }: { clipboard?: (t: string) => Promise<void>; execCommand: boolean }) {
  const written: string[] = [];
  const ta = { value: '', style: {}, setAttribute: () => {}, select: () => {} };
  vi.stubGlobal('navigator', clipboard ? { clipboard: { writeText: (t: string) => { written.push(t); return clipboard(t); } } } : {});
  vi.stubGlobal('document', {
    createElement: () => ta,
    body: { appendChild: () => {}, removeChild: () => {} },
    execCommand: () => { if (execCommand) written.push(ta.value); return execCommand; },
  });
  return written;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('copying a string', () => {
  it('copies with the clipboard where it answers', async () => {
    const written = page({ clipboard: async () => {}, execCommand: false });
    expect(await copyText('play.jodcraft.world')).toBe(true);
    expect(written).toEqual(['play.jodcraft.world']);
  });
  it('falls back on the textarea where the clipboard refuses', async () => {
    const written = page({ clipboard: () => Promise.reject(new Error('NotAllowedError')), execCommand: true });
    expect(await copyText('-412 71 1288')).toBe(true);
    expect(written).toEqual(['-412 71 1288', '-412 71 1288']);
  });
  it('uses the textarea where there is no clipboard', async () => {
    const written = page({ execCommand: true });
    expect(await copyText('play.jodcraft.world')).toBe(true);
    expect(written).toEqual(['play.jodcraft.world']);
  });
  it('says so when both ways fail, as some in-app browsers make them', async () => {
    page({ clipboard: () => Promise.reject(new Error('NotAllowedError')), execCommand: false });
    expect(await copyText('play.jodcraft.world')).toBe(false);
    page({ execCommand: false });
    expect(await copyText('play.jodcraft.world')).toBe(false);
  });
});
