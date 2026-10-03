// Every word the site's letters say, in one place. Server only.
//
// To change what a letter says, change it here: the subject, the line mail
// apps show after it (preheader), the picture at the top (banner), the
// heading, the paragraphs, the button and the small print. How a letter
// looks (Sólsetur or Varðeldur) is chosen per letter in the admin panel,
// under Póstur, and drawn in src/lib/email-design.ts.
//
// The voice is the site's: a saloon town in the badlands, fires lit for
// play nights, a wanted board for those who promise and don't come.
//
// Members are called by the name they or the admin gave ("Nafn og netfang"
// on their wall, Hópurinn in the admin panel), or else by their Minecraft name.
import { optionOf, yesFor, type Night, type Votes } from '@/lib/play-night';
import { dayTime } from '@/lib/night-share';
import { plural } from '@/lib/format';
import type { Names } from '@/lib/crew-email';

export type MailKind = 'signin' | 'lit' | 'chosen' | 'soon' | 'out';
export const MAIL_KINDS: MailKind[] = ['signin', 'lit', 'chosen', 'soon', 'out'];

/** What each letter is called in the admin panel, and when it goes. */
export const MAIL_NAMES: Record<MailKind, { name: string; when: string }> = {
  signin: { name: 'Innskráningartengill', when: 'Þegar stjórnandinn sendir tengil, eða félagi biður um einn.' },
  lit:    { name: 'Bál kveikt',           when: 'Þegar félagi stingur upp á spilakvöldi. Til allra nema hans.' },
  chosen: { name: 'Kvöldið ákveðið',      when: 'Þegar tími er festur á kvöldi með fleiri en einum tíma.' },
  soon:   { name: 'Hálftími í bál',       when: 'Hálftíma fyrir kvöldið, til þeirra sem ætla að mæta.' },
  out:    { name: 'Bálið slokknaði',      when: 'Þegar kvöldi er aflýst, til þeirra sem ætluðu að mæta.' },
};

/** The picture at the top of each letter: a small tag and a big title, drawn
    in the site's own fonts so they look the same in every mail app. Keep
    them short; the title has room for about 18 letters. */
export const BANNERS: Record<MailKind, { tag: string; title: string }> = {
  signin: { tag: 'Innskráning', title: 'Lykillinn að bænum' },
  lit:    { tag: 'Spilakvöld',  title: 'Bál kveikt' },
  chosen: { tag: 'Spilakvöld',  title: 'Kvöldið er ákveðið' },
  soon:   { tag: 'Spilakvöld',  title: 'Hálftími í bál' },
  out:    { tag: 'Spilakvöld',  title: 'Bálið slokknaði' },
};

/** One letter's words. */
export interface Letter {
  kind:       MailKind;
  subject:    string;
  /** the grey line mail apps show after the subject in the inbox */
  preheader:  string;
  heading:    string;
  /** the night's own line, in quotes */
  quote?:     string;
  /** times, on a ticket of their own */
  when?:      string[];
  /** the times are crossed out (a night called off) */
  struck?:    boolean;
  /** a paragraph each */
  lines:      string[];
  button?:    { label: string; url: string };
  /** smaller links under the button */
  links?:     { label: string; url: string }[];
  /** small print at the foot */
  foot:       string[];
  footLink?:  { label: string; url: string };
}

export interface Reader { username: string; address: string }

const clock = (iso: string) => { const d = new Date(iso); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const lower = (s: string) => s.charAt(0).toLocaleLowerCase('is-IS') + s.slice(1);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const day = (iso: string) => new Date(iso).toLocaleDateString('is-IS', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/* ─── the sign-in link ────────────────────────────────────────────────────── */

export function signinLetter({ name, url, expiresAt, uses }: { name: string; url: string; expiresAt: string; uses: number }): Letter {
  return {
    kind: 'signin',
    subject: `Lykillinn þinn að JOÐ, ${name}`,
    preheader: `Gildir til ${day(expiresAt)} og opnar ${uses} tæki.`,
    heading: `Gakktu í bæinn, ${name}`,
    lines: [
      'Hér er lykillinn þinn. Opnaðu hann í símanum eða tölvunni sem þú vilt nota, og tækið man eftir þér í heilt ár.',
      `Hann gildir til ${day(expiresAt)} og opnar ${uses} tæki. Veldu þér svo lykilorð á veggnum þínum; þá þarftu engan lykil næst.`,
    ],
    button: { label: 'Skrá mig inn', url },
    foot: ['Baðst þú ekki um þennan lykil? Þá má fleygja bréfinu; enginn kemst inn án hans.'],
  };
}

/* ─── the play nights ─────────────────────────────────────────────────────── */

export type NightNotice = Exclude<MailKind, 'signin'>;

/** Who is coming, as one sentence; nothing when nobody is. */
const coming = (names: string[]) => names.length
  ? [`${names.length} ${plural(names.length, 'ætlar', 'ætla')} að mæta: ${[...names].sort((a, b) => a.localeCompare(b, 'is')).join(', ')}.`]
  : [];

export function nightLetter(kind: NightNotice, night: Night, votes: Votes, reader: Reader, site: string, names: Names = {}): Letter {
  /* a member by name, or by username when no name is given */
  const who = (username: string) => names[username.toLowerCase()] ?? username;
  const by = who(night.by);
  const url = `${site}/kvold/${night.id}#hopur`;
  const chosen = optionOf(night, night.chosen);
  const quote = night.note || undefined;
  const base = {
    kind, quote,
    foot: ['Þú færð þessi bréf af því að netfangið þitt er skráð á JOÐ. Viltu frið? Undir „Nafn og netfang“ á veggnum þínum má afþakka bréf um spilakvöld, eða breyta nafninu sem þau kalla þig.'],
    footLink: { label: 'Veggurinn þinn', url: `${site}/crew/${reader.username}` },
  };

  if (kind === 'lit') {
    const times = night.options.map(o => dayTime(o.at));
    return {
      ...base,
      subject: night.note ? `${by} kveikti bál: ${night.note}` : `${by} kveikti bál á JOÐ`,
      preheader: chosen ? `${dayTime(chosen.at)}. Kemur þú?` : `${times.length} tímar í boði. Hvenær kemst þú?`,
      heading: `${by} kallar saman hópinn`,
      when: chosen ? [dayTime(chosen.at)] : times,
      lines: chosen
        ? ['Hnakkurinn bíður. Segðu hinum hvort þú mætir, svo enginn standi einn við eldinn.']
        : [`Merktu við alla tímana sem þú kemst. Sá tími sem flest komast á verður fyrir valinu þremur tímum fyrir þann fyrsta, nema ${by} velji fyrr.`],
      button: { label: 'Svara kallinu', url },
    };
  }

  if (kind === 'chosen' && chosen) {
    const yes = yesFor(votes, chosen.id);
    return {
      ...base,
      subject: `Kvöldið er ákveðið: ${dayTime(chosen.at)}`,
      preheader: yes.length ? `${yes.length} ${plural(yes.length, 'ætlar', 'ætla')} að mæta. Kemur þú?` : 'Kemur þú?',
      heading: night.chosenBy && night.chosenBy !== 'auto' ? `${who(night.chosenBy)} festi tímann` : 'Flest komast þá',
      when: [dayTime(chosen.at)],
      lines: [...coming(yes.map(who)), 'Kemur þú? Láttu vita. Þau sem lofa að mæta og mæta ekki lenda á eftirlýsingatöflunni.'],
      button: { label: 'Sjá kvöldið', url },
      links: [{ label: 'Setja í dagatalið', url: `${site}/kvold/${night.id}/dagatal.ics` }],
    };
  }

  if (kind === 'soon' && chosen) {
    const others = yesFor(votes, chosen.id).filter(u => !same(u, reader.username));
    return {
      ...base,
      subject: `Hálftími í bál: kl. ${clock(chosen.at)}`,
      preheader: 'Þú sagðist mæta. Þjónninn bíður.',
      heading: `Söðlaðu hestinn, ${who(reader.username)}`,
      when: [dayTime(chosen.at)],
      lines: [
        `Bálið logar kl. ${clock(chosen.at)} og þú sagðist mæta.`,
        ...coming(others.map(who)),
        'Sofi þjónninn getur þú vakið hann á vefnum. Vistfangið er play.jodcraft.world.',
      ],
      button: { label: 'Kveikja á þjóninum', url },
    };
  }

  /* out, or a letter asked for a night that has no chosen time */
  return {
    ...base,
    subject: night.note ? `Bálið slokknaði: ${night.note}` : 'Bálið slokknaði',
    preheader: `${by} aflýsti kvöldinu.`,
    heading: `${by} slökkti bálið`,
    when: chosen ? [dayTime(chosen.at)] : night.options.map(o => dayTime(o.at)),
    struck: true,
    lines: [chosen
      ? `Ekkert verður af kvöldinu á ${lower(dayTime(chosen.at))}. Hesturinn fær að hvílast, og næsta bál kemur.`
      : 'Ekkert verður af kvöldinu. Hesturinn fær að hvílast, og næsta bál kemur.'],
    button: { label: 'Kveikja nýtt bál', url: `${site}/#hopur` },
  };
}
