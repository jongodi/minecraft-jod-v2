/* The scheduled jobs in vercel.json are called by Vercel with CRON_SECRET as
   a bearer token; anything else is turned away. */

/** Compared without an early exit, as the admin token is. */
export function cronAuthorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}
