import { describe, expect, it } from 'vitest';
import { isPicture, prepareImage } from '@/lib/client-image';

/* A phone's HEIC often reaches the browser with no type at all (Windows,
   Linux, Firefox). The pin slot lets it through by its name; the picture
   step has to take it too, and either redraw it or say plainly that it
   cannot, rather than call a picture "not a picture". */
describe('a picture with no type', () => {
  const heic = new File([new Uint8Array([0, 1, 2])], 'IMG_1234.HEIC', { type: '' });
  const notes = new File(['hæ'], 'minnispunktar.txt', { type: '' });

  it('is a picture by its name', () => {
    expect(isPicture(heic)).toBe(true);
    expect(isPicture(notes)).toBe(false);
    expect(isPicture(new File([''], 'x', { type: 'image/heic' }))).toBe(true);
  });

  it('is told it could not be read, not that it is no picture', async () => {
    await expect(prepareImage(heic)).rejects.toThrow('Prófaðu PNG eða JPEG');
    await expect(prepareImage(notes)).rejects.toThrow('Aðeins er hægt að hlaða upp myndum.');
  });
});
