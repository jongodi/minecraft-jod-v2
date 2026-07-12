// Fetch the resource pack configured on the Minecraft server and stream it to the
// RP editor. The server's pack URL lives in server.properties (`resource-pack=…`),
// which we read via the Exaroton file API. The pack is proxied server-side so the
// Exaroton token stays secret and the (often CORS-less) upstream host is reachable.
//
// server.properties can hold secrets (rcon password, seed): we parse it server-side
// and only ever use the resource-pack URL — the file itself is never returned.
import { NextResponse } from 'next/server';
import { getExarotonServerId, getServerHost } from '@/lib/exaroton';
import { readProperty } from './props';

export const dynamic = 'force-dynamic';

// A Minecraft resource pack the client will refuse anyway past this; also our cap.
const MAX_BYTES = 512 * 1024 * 1024;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return fail('Fetching the server pack isn’t available here — no Exaroton API key is configured.', 503);
  }

  // 1) Read the pack URL out of the server's server.properties.
  let packUrl: string | null;
  try {
    const id = await getExarotonServerId(token);
    const res = await fetch(
      `https://api.exaroton.com/v1/servers/${id}/files/data/server.properties`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`server.properties read failed (${res.status})`);
    packUrl = readProperty(await res.text(), 'resource-pack');
  } catch (err) {
    console.error('server-pack: config read failed:', err instanceof Error ? err.message : err);
    return fail('Couldn’t read the server configuration from Exaroton — is the server reachable?', 502);
  }

  packUrl = (packUrl ?? '').trim();
  if (!packUrl) {
    return fail('No resource pack is set on the server (server.properties has an empty resource-pack).', 404);
  }

  // 2) Validate the URL (only http/https — the value is admin-set, but be safe).
  let parsed: URL;
  try { parsed = new URL(packUrl); } catch { return fail('The server’s resource-pack URL is malformed.', 502); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return fail('The server’s resource-pack URL isn’t an http(s) link.', 502);
  }

  // 3) Proxy the download.
  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'JODcraft-RP-Editor', Accept: 'application/zip,application/octet-stream,*/*' },
      redirect: 'follow', cache: 'no-store',
    });
  } catch (err) {
    console.error('server-pack: download failed:', err instanceof Error ? err.message : err);
    return fail('The server’s resource-pack URL could not be reached.', 502);
  }
  if (!upstream.ok || !upstream.body) {
    return fail(`The resource-pack download failed (${upstream.status}).`, 502);
  }
  const ctype = upstream.headers.get('content-type') ?? '';
  if (/text\/html/i.test(ctype)) {
    return fail('The resource-pack URL returned a web page, not a .zip — the host may need a direct-download link.', 502);
  }
  const len = Number(upstream.headers.get('content-length') ?? 0);
  if (len && len > MAX_BYTES) {
    return fail('The server’s resource pack is unexpectedly large (over 512 MB).', 502);
  }

  // 4) Name it from the URL, falling back to the server host.
  const urlBase = decodeURIComponent(parsed.pathname.split('/').pop() || '').trim();
  const rawName = /\.zip$/i.test(urlBase) ? urlBase : `${getServerHost().split('.')[0] || 'server'}-resource-pack.zip`;
  const name = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');

  const headers: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${name}"`,
    'X-Pack-Filename': name,
    // Small per-user cache so a couple of clicks / reloads don't re-hit upstream.
    'Cache-Control': 'private, max-age=60',
  };
  if (len) headers['Content-Length'] = String(len);

  return new Response(upstream.body, { status: 200, headers });
}
