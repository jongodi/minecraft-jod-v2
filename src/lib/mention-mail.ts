// A letter to each member called by name (@nafn) in a new note or reply on
// the board, if they keep an address and have not turned it off. The words
// are in src/lib/email-copy.ts (mentionLetter), the look is chosen in the
// admin panel like every letter's. Only a note or a reply as it is first put
// up is told: an edit that adds a name sends nothing, so rewriting a note
// never mails anyone twice. Server only.
import { mentionsIn, sameUser } from '@/lib/crew-types';
import { getNames, mentionReaders } from '@/lib/crew-email';
import { mentionLetter } from '@/lib/email-copy';
import { renderLetter } from '@/lib/email-design';
import { readThemes } from '@/lib/email-settings';
import { canSendEmail, sendEmails, siteUrl } from '@/lib/email';

/** Who a new text calls by name, leaving out its writer. */
export const calledIn = (text: string, by: string) => mentionsIn(text).filter(n => !sameUser(n, by));

/** Mails those `text` calls by name. `owner` is whose wall it hangs on, `entryId` the note it is or is under. */
export async function mailMentions({ by, owner, entryId, text, reply }: { by: string; owner: string; entryId: string; text: string; reply: boolean }): Promise<number> {
  const called = calledIn(text, by);
  if (called.length === 0 || !canSendEmail()) return 0;
  const readers = await mentionReaders(called);
  if (readers.length === 0) return 0;
  const [names, themes] = await Promise.all([getNames(), readThemes()]);
  const site = siteUrl();
  const who = (u: string) => names[u.toLowerCase()] ?? u;
  const url = `${site}/crew/${owner}#${entryId}`;
  const res = await sendEmails(readers.map(r => {
    const { subject, html, text: plain } = renderLetter(mentionLetter({ by: who(by), reader: who(r.username), text, url, reply, site }), themes.mention, site);
    return { to: r.address, subject, html, text: plain };
  }));
  if (!res.sent) { console.error(`[mention-mail] did not go: ${res.reason}`); return 0; }
  return readers.length;
}
