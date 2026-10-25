/* Where the admin goes after signing in: only a path on this site. The proxy
   sets `next` to the page that sent the admin to the sign-in, but anyone can
   write a link with their own: a javascript: value would run with the
   admin's fresh session, and an https:// or //host value would leave the
   site with it. The value is read as the browser will read it, since the
   browser drops tabs and line breaks from an address first: "/\t/host"
   passed a check of the string and went to //host. */
const HERE = 'https://jodcraft.invalid';

export function safeNext(v: string | null | undefined, fallback = '/admin'): string {
  if (!v || !v.startsWith('/')) return fallback;
  try {
    const url = new URL(v, HERE);
    return url.origin === HERE ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
