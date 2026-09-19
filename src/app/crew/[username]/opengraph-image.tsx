import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readProfile, isCrewUsername, coverPhoto } from '@/lib/crew';
import { skinDataUrl, printDataUrl, playTimeHours } from '@/lib/crew-og';
import { SERVER_IP } from '@/components/badlands/data';

export const alt = 'Eftirlýsingaspjald JOÐ-félaga';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

/* The member's link card: their wanted poster. The print they chose stands
   faded behind the paper, the skin in its frame, the name in the slab, the
   bounty in pixel type. Same tokens as tokens.css; Satori cannot read CSS variables. */
const C = { paper: '#E8DCC4', paper2: '#DCCDB0', ink: '#1E1611', inkSoft: '#5A4634', inkFaint: '#6E5A45', red: '#8F3D2E', brown: '#4D3323', wood: '#4D3323', woodLight: '#6B4A2E', night: '#15100D', lantern: '#F2A63B' };
const FONT_DIR = join(process.cwd(), 'node_modules/@fontsource');

const hours = (h: number) => `${h.toLocaleString('is-IS')} klst.`;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [display, data, text] = await Promise.all([
    readFile(join(FONT_DIR, 'alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'silkscreen/files/silkscreen-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'pixelify-sans/files/pixelify-sans-latin-400-normal.woff')),
  ]);

  const known = isCrewUsername(username);
  const profile = known ? await readProfile(username) : null;
  const cover = profile ? coverPhoto(profile) : null;
  const [skin, backdrop, playtime] = await Promise.all([
    profile ? skinDataUrl(profile.username) : null,
    cover ? printDataUrl(cover.filename) : null,
    profile ? playTimeHours(profile.username) : null,
  ]);
  const name = profile?.username ?? 'Fannst ekki';
  const bio = profile?.bio ? profile.bio.slice(0, 140) : profile ? 'JOÐ-félagi frá sumrinu 2024' : '';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.night, fontFamily: 'Alfa Slab One' }}>
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, objectFit: 'cover', opacity: 0.9 }} />
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex', background: 'linear-gradient(180deg, rgba(21,16,13,0.25) 0%, rgba(21,16,13,0.6) 100%)' }} />

        {/* the poster: paper on a nail */}
        <div style={{ position: 'absolute', left: 90, top: 60, width: 1020, height: 510, display: 'flex', background: C.paper, border: `4px solid ${C.brown}` }}>
          <div style={{ position: 'absolute', left: 504, top: 14, width: 10, height: 10, background: C.ink, display: 'flex' }} />

          {/* the skin in its wooden frame */}
          <div style={{ position: 'absolute', left: 50, top: 60, width: 200, height: 400, display: 'flex', background: C.wood, border: `4px solid ${C.woodLight}` }}>
            <div style={{ position: 'absolute', left: 4, top: 4, width: 184, height: 384, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: C.paper2 }}>
              {skin
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={skin} alt="" width={160} height={320} style={{ width: 160, height: 320, imageRendering: 'pixelated' }} />
                : <div style={{ width: 120, height: 280, background: C.brown, display: 'flex' }} />}
            </div>
          </div>

          <div style={{ position: 'absolute', left: 300, top: 56, width: 660, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Silkscreen', fontSize: 22, letterSpacing: 2, color: C.inkFaint, display: 'flex' }}>EFTIRLÝST · JOÐ-FÉLAGI</div>
            <div style={{ fontSize: name.length > 11 ? 78 : 104, lineHeight: 1, color: C.ink, marginTop: 10, display: 'flex' }}>{name}</div>
            {playtime !== null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 20 }}>
                <span style={{ fontFamily: 'Silkscreen', fontSize: 20, letterSpacing: 2, color: C.inkFaint }}>VERÐLAUN</span>
                <span style={{ fontFamily: 'Silkscreen', fontSize: 40, color: C.red }}>{hours(playtime)}</span>
              </div>
            )}
            {bio && <div style={{ fontFamily: 'Pixelify Sans', fontSize: 30, lineHeight: 1.35, color: C.inkSoft, marginTop: 22, display: 'flex' }}>{bio}</div>}
          </div>

          <div style={{ position: 'absolute', left: 300, bottom: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ padding: '10px 18px', border: `4px solid ${C.red}`, color: C.red, fontFamily: 'Silkscreen', fontSize: 26, display: 'flex' }}>{SERVER_IP}</div>
            <div style={{ fontFamily: 'Silkscreen', fontSize: 18, letterSpacing: 2, color: C.inkFaint, display: 'flex' }}>VEGGURINN Á JOÐ</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Alfa Slab One', data: display, weight: 400, style: 'normal' },
        { name: 'Silkscreen', data, weight: 400, style: 'normal' },
        { name: 'Pixelify Sans', data: text, weight: 400, style: 'normal' },
      ],
    },
  );
}
