/* A player's head for the 3D map. The viewer asks for
   <map-data-root>/maps/<map>/assets/playerheads/<uuid>.png, which points at the
   synced copy, where heads never are, so every player showed as Steve.
   next.config sends those requests here, and the head comes from the same
   services the rest of the site uses, served from this origin because the
   viewer's content policy only allows its own images. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = /^([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.png$/i;

const SOURCES = (uuid: string) => [
  `https://minotar.net/helm/${uuid}/32.png`,
  `https://mc-heads.net/avatar/${uuid}/32`,
];

type Context = { params: Promise<{ file: string }> };

export async function GET(_req: Request, { params }: Context): Promise<Response> {
  const match = FILE.exec((await params).file);
  if (!match) return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const uuid = match[1].replace(/-/g, '').toLowerCase();

  for (const url of SOURCES(uuid)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) {
        return new Response(res.body, {
          headers: {
            'Content-Type': res.headers.get('content-type') ?? 'image/png',
            /* a changed skin shows within the day */
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        });
      }
      /* not waited on: inside a Next route a cancel can wait forever */
      void res.body?.cancel().catch(() => undefined);
    } catch { /* try the next one */ }
  }
  /* the viewer draws Steve when a head doesn't load */
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
}
