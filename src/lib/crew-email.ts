// A member's email address, and whether they want word of the play nights.
// Server only.
//
// Kept apart from the wall, as the passwords are, because a wall is public
// JSON: Redis in production, a small file beside the profiles in development.
// The member sets it on their own wall, or the admin sets it for them so a
// sign-in link can be mailed to someone who has never been in.
import { promises as fs } from 'fs';
import path from 'path';
import { CREW_USERNAMES, canonicalUsername } from '@/lib/crew-types';
import { closeInvite, createInvite, inviteUrl, type Invite } from '@/lib/crew-access';
import { canSendEmail, cleanEmail, sendEmail, siteUrl } from '@/lib/email';
import { signinLetter } from '@/lib/email-copy';
import { renderLetter } from '@/lib/email-design';
import { readThemes } from '@/lib/email-settings';

const hasKV = () => !!process.env.REDIS_URL;

export interface CrewEmail {
  address: string;
  /** a letter when a fire is lit, when its time is chosen, before it starts and if it is put out */
  nights:  boolean;
}

const key = (name: string) => `crew:email:${name}`;
const emailsFile = () => path.join(process.env.VERCEL && !hasKV() ? '/tmp/jod-profiles' : path.join(process.cwd(), 'src', 'data', 'profiles'), '_emails.json');

async function readEmailFile(): Promise<Record<string, CrewEmail>> {
  try { return JSON.parse(await fs.readFile(emailsFile(), 'utf-8')) as Record<string, CrewEmail>; }
  catch { return {}; }
}

const shaped = (v: unknown): CrewEmail | null => {
  const e = v as Partial<CrewEmail> | null;
  return e && typeof e.address === 'string' && e.address ? { address: e.address, nights: e.nights !== false } : null;
};

export async function getEmail(username: string): Promise<CrewEmail | null> {
  const name = canonicalUsername(username).toLowerCase();
  if (hasKV()) {
    const { rGet } = await import('./redis');
    return shaped(await rGet<CrewEmail>(key(name)));
  }
  return shaped((await readEmailFile())[name]);
}

/** Set or clear (null) a member's address. The address is kept trimmed and in lower case. */
export async function setEmail(username: string, email: CrewEmail | null): Promise<void> {
  const name = canonicalUsername(username).toLowerCase();
  const clean = email ? { address: cleanEmail(email.address), nights: email.nights } : null;
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    if (clean) await getRedis().set(key(name), JSON.stringify(clean));
    else await getRedis().del(key(name));
    return;
  }
  const all = await readEmailFile();
  if (clean) all[name] = clean; else delete all[name];
  await fs.mkdir(path.dirname(emailsFile()), { recursive: true });
  await fs.writeFile(emailsFile(), JSON.stringify(all, null, 2) + '\n', 'utf-8');
}

/** Every member with an address, as the crew list spells them: one read for the lot. */
export async function allEmails(): Promise<Array<{ username: string } & CrewEmail>> {
  let found: (CrewEmail | null)[];
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const raw = await getRedis().mget(...CREW_USERNAMES.map(u => key(u.toLowerCase())));
    found = raw.map(v => { try { return v ? shaped(JSON.parse(v)) : null; } catch { return null; } });
  } else {
    const file = await readEmailFile();
    found = CREW_USERNAMES.map(u => shaped(file[u.toLowerCase()]));
  }
  return CREW_USERNAMES.flatMap((username, i) => { const e = found[i]; return e ? [{ username: username as string, ...e }] : []; });
}

/** Who gets word of the play nights, leaving out anyone named in `except`. */
export async function nightReaders(except: string[] = []): Promise<Array<{ username: string; address: string }>> {
  const skip = new Set(except.map(u => u.toLowerCase()));
  return (await allEmails()).filter(e => e.nights && !skip.has(e.username.toLowerCase()));
}

/* ─── a sign-in link by post ──────────────────────────────────────────────── */

/** A fresh sign-in link, mailed to the member's address. No link is left
    open that nobody was sent: none is made without an address or a mail key,
    and one whose letter did not go is shut at once. */
export async function mailSignInLink(username: string, origin: string): Promise<{ sent: true; invite: Invite; url: string; to: string } | { sent: false; reason: string }> {
  const name = canonicalUsername(username);
  const email = await getEmail(name);
  if (!email) return { sent: false, reason: `${name} er ekki með netfang.` };
  if (!canSendEmail()) return { sent: false, reason: 'Póstur er ekki tengdur (RESEND_API_KEY vantar).' };

  const invite = await createInvite(name);
  const url = inviteUrl(origin, invite.key);
  const site = siteUrl();
  const { subject, html, text } = renderLetter(signinLetter({ name, url, expiresAt: invite.expiresAt, uses: invite.maxUses }), (await readThemes()).signin, site);
  const result = await sendEmail({ to: email.address, subject, html, text });
  /* a link that never left is shut at once */
  if (!result.sent) { await closeInvite(invite.key); return result; }
  return { sent: true, invite, url, to: email.address };
}
