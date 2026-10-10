// A member's email address, whether they want word of the play nights, and
// the name the letters call them by. Server only.
//
// Kept apart from the wall, as the passwords are, because a wall is public
// JSON: Redis in production, small files beside the profiles in development.
// The member sets them on their own wall, or the admin sets them for them so
// a sign-in link can be mailed to someone who has never been in.
import { promises as fs } from 'fs';
import path from 'path';
import { CREW_USERNAMES, NAME_MAX, canonicalUsername } from '@/lib/crew-types';
import { closeInvite, createInvite, inviteUrl, type Invite } from '@/lib/crew-access';
import { canSendEmail, cleanEmail, emailProblem, sendEmail, siteUrl } from '@/lib/email';
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
const dataDir = () => (process.env.VERCEL && !hasKV() ? '/tmp/jod-profiles' : path.join(process.cwd(), 'src', 'data', 'profiles'));
const emailsFile = () => path.join(dataDir(), '_emails.json');

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

/* ─── names ───────────────────────────────────────────────────────────────── */
// What the letters call a member: the name they or the admin gave, or else
// their Minecraft name. Only ever in letters, never on the site.

export { NAME_MAX };
const NAMES_KEY = 'crew:names';
const namesFile = () => path.join(dataDir(), '_names.json');

/** Member → name, keyed by the username in lower case. */
export type Names = Record<string, string>;

/** A name as it is kept: single spaces, nothing around it. */
export const cleanName = (name: string) => name.normalize('NFC').replace(/\s+/g, ' ').trim();

/** What is wrong with a name someone wants to keep, or null if nothing. An empty name clears it. */
export function nameProblem(name: unknown): string | null {
  if (typeof name !== 'string') return 'Nafnið verður að vera texti.';
  const n = cleanName(name);
  if (n.length > NAME_MAX) return `Nafnið má mest vera ${NAME_MAX} stafir.`;
  if (/[<>@\p{Cc}]/u.test(n)) return 'Nafnið má ekki innihalda <, > eða @.';
  return null;
}

async function readNamesFile(): Promise<Names> {
  try { return JSON.parse(await fs.readFile(namesFile(), 'utf-8')) as Names; }
  catch { return {}; }
}

/** Every name given, in one read. */
export async function getNames(): Promise<Names> {
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    return getRedis().hgetall(NAMES_KEY);
  }
  return readNamesFile();
}

export async function getName(username: string): Promise<string | null> {
  return (await getNames())[canonicalUsername(username).toLowerCase()] ?? null;
}

/** Set a member's name, or clear it (null or empty) so the letters use the username again. */
export async function setName(username: string, name: string | null): Promise<void> {
  const user = canonicalUsername(username).toLowerCase();
  const clean = name ? cleanName(name) : '';
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    if (clean) await getRedis().hset(NAMES_KEY, user, clean);
    else await getRedis().hdel(NAMES_KEY, user);
    return;
  }
  const all = await readNamesFile();
  if (clean) all[user] = clean; else delete all[user];
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(namesFile(), JSON.stringify(all, null, 2) + '\n', 'utf-8');
}

/* ─── a change from a form ────────────────────────────────────────────────── */

/** A member's name and address as the wall or the admin panel sends them:
    an empty `email` clears the address (`nights` is kept with it), an empty
    `name` clears the name, and a field left out is left alone. All is checked
    before anything is kept. Returns what is wrong, or null once kept. */
export async function updateContact(username: string, body: { email?: unknown; nights?: unknown; name?: unknown }): Promise<string | null> {
  const hasEmail = 'email' in body, hasName = 'name' in body;
  if (hasEmail && body.email !== null && typeof body.email !== 'string') return 'Netfangið verður að vera texti.';
  const address = typeof body.email === 'string' ? body.email.trim() : '';
  if (address) { const problem = emailProblem(address); if (problem) return problem; }
  if (hasName && body.name !== null) { const problem = nameProblem(body.name); if (problem) return problem; }

  if (hasName) await setName(username, typeof body.name === 'string' ? body.name : null);
  if (hasEmail) await setEmail(username, address ? { address, nights: body.nights !== false } : null);
  return null;
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
  const called = (await getName(name)) ?? name;
  const { subject, html, text } = renderLetter(signinLetter({ name: called, url, expiresAt: invite.expiresAt, uses: invite.maxUses }), (await readThemes()).signin, site);
  const result = await sendEmail({ to: email.address, subject, html, text });
  /* a link that never left is shut at once */
  if (!result.sent) { await closeInvite(invite.key); return result; }
  return { sent: true, invite, url, to: email.address };
}
