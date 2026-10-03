import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

const { GET } = await import('../../app/api/mail-art/route');

describe('the pictures atop the letters', () => {
  it('draws only the looks and letters there are', async () => {
    for (const q of ['t=sunset&k=nope', 't=nope&k=lit', 'k=lit', '']) {
      expect((await GET(new NextRequest(`https://jod.test/api/mail-art?${q}`))).status).toBe(404);
    }
  });
});
