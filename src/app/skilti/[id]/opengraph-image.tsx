import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { printDataUrl, skinDataUrl } from '@/lib/crew-og';
import { SITE_NAME } from '@/components/badlands/data';
import { findSign } from './page';

export const alt = 'Skilti á vegg JOÐ-félaga';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 300;
/* drawn on a sign's first preview and kept its five minutes; without the list, even an empty one, drawn again for every crawler that asks */
export async function generateStaticParams() {
  return [];
}

/* The sign as a card: its print large on the left when it has one, the
   words on a board of pale oak with its dark rim, the writer's head and name
   under them. Same tokens as tokens.css; Satori cannot read CSS variables. */
const C = { sign: '#C4A77A', rim: '#4D3323', ink: '#1E1611', soft: '#5A4634', night: '#15100D' };
const FONT_DIR = join(process.cwd(), 'node_modules/@fontsource');

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [display, text, sign] = await Promise.all([
    readFile(join(FONT_DIR, 'alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'pixelify-sans/files/pixelify-sans-latin-400-normal.woff')),
    findSign(id),
  ]);
  const photo = sign?.entry.photos[0] ?? null;
  const [print, skin] = await Promise.all([photo ? printDataUrl(photo.filename, 600) : null, sign ? skinDataUrl(sign.profile.username) : null]);
  const words = (sign?.entry.text.trim() || photo?.caption || 'Mynd af JOÐ').slice(0, 220);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.night, padding: 40, fontFamily: 'Pixelify Sans' }}>
        <div style={{ flex: 1, display: 'flex', background: C.sign, border: `10px solid ${C.rim}` }}>
          {print && (
            // eslint-disable-next-line @next/next/no-img-element -- a card drawn by Satori
            <img src={print} alt="" width={560} height={530} style={{ width: 560, height: 530, objectFit: 'cover', margin: 20, border: `8px solid ${C.rim}` }} />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 36, gap: 24 }}>
            <div style={{ fontSize: print ? 40 : 54, lineHeight: 1.25, color: C.ink, display: 'flex' }}>{words}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {skin && (
                // eslint-disable-next-line @next/next/no-img-element -- a card drawn by Satori
                <img src={skin} alt="" width={48} height={48} style={{ width: 48, height: 48 }} />
              )}
              <div style={{ fontFamily: 'Alfa Slab One', fontSize: 36, color: C.ink, display: 'flex' }}>{sign?.profile.username ?? SITE_NAME}</div>
              <div style={{ fontSize: 26, color: C.soft, display: 'flex' }}>{SITE_NAME}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Alfa Slab One', data: display, weight: 400, style: 'normal' }, { name: 'Pixelify Sans', data: text, weight: 400, style: 'normal' }] },
  );
}
