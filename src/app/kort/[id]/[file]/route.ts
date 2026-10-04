import { baseNamed, uploadedBases } from '@/lib/bluemap-bases';
import { mainCopy, type Copy } from '@/lib/bluemap-snapshot';
import viewer from '@/lib/bluemap-viewer.json';
import settings from '../../../../../public/bluemap/settings.json';
import { MAIN_MAP, baseViewer, heaviness, openingView, startTileBytes } from '../../../../../scripts/bluemap-brand.mjs';

/* A base map's own viewer: /kort/<id>/index.html and its settings.json, the
   main viewer (public/bluemap) made over for that one map. Built with the
   site, as static files, so opening one never runs a function: the page and
   its settings change only when the base's copy is uploaded again
   (npm run map:bases -- --upload <id>) or the main viewer changes. BlueMap's
   own scripts, styles and translations are the main viewer's (next.config
   sends /kort/<id>/assets and /kort/<id>/lang there), the map itself comes
   from the base's copy through /bluemap-data, and players and the places'
   lanterns come live through /bluemap, as on the main map. Only bases whose
   copy has been uploaded have a viewer; any other address is a 404. */

export const dynamic = 'force-static';
export const dynamicParams = false;

const FILES = {
  'index.html': 'text/html; charset=utf-8',
  'settings.json': 'application/json; charset=utf-8',
} as const;
type File = keyof typeof FILES;

export function generateStaticParams(): { id: string; file: File }[] {
  return uploadedBases().flatMap((b) => (Object.keys(FILES) as File[]).map((file) => ({ id: b.id, file })));
}

type Context = { params: Promise<{ id: string; file: string }> };

const sizeIn = (copy: Copy) => (path: string) => copy.packedAt(path)?.length ?? 0;

/* The main map's first detailed tiles, around where it opens: what a base
   map's are weighed against (heaviness in scripts/bluemap-brand.mjs). */
const [, mainX, , mainZ] = String(settings.startLocation ?? '').split(':').map(Number);
const mainTile = startTileBytes(mainCopy.files, sizeIn(mainCopy), MAIN_MAP, mainX, mainZ);

export async function GET(_req: Request, { params }: Context): Promise<Response> {
  const { id, file } = await params;
  const base = baseNamed(id);
  if (!base || !uploadedBases().includes(base) || !(file in FILES)) return new Response(null, { status: 404 });
  /* weighed where it opens, as that is what a phone loads first */
  const open = openingView(base, settings);
  const weight = heaviness(startTileBytes(base.copy.files, sizeIn(base.copy), base.id, open.x, open.z), mainTile);
  const page = baseViewer(viewer.shell, settings, base, base.copy, weight);
  const body = file === 'index.html' ? page.html : JSON.stringify(page.settings);
  return new Response(body, {
    headers: {
      'Content-Type': FILES[file as File],
      /* the map's own files are versioned; these two change with a deployment */
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
