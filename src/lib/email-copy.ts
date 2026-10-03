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

/** What the letters call the site: in the sender's name, the picture, the foot and the subjects. */
export const BRAND = 'JOÐcraft';

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

/** A verse at the foot of each letter: ferskeytlur, four lines of alternating
    rhyme with their staves (stuðlar and höfuðstafir). Change one here and
    keep it to four lines. */
export const VERSES: Record<MailKind, string[]> = {
  signin: [
    'Lykill þinn er loksins klár,',
    'leyfðu þér að dreyma.',
    'Heimur bíður, hreinn og blár,',
    'hér má lengi sveima.',
  ],
  lit: [
    'Kveikt er bál og creeper eytt,',
    'kallar hópinn saman.',
    'Byggjum hátt og berjumst sveitt,',
    'bros og glens og gaman.',
  ],
  chosen: [
    'Tíminn festur, tryggt er kvöld,',
    'tilhlökkun og kæti.',
    'Svikarinn fær sjálfur gjöld,',
    'sést hans auða sæti.',
  ],
  soon: [
    'Hneggja klárar, hefst nú kvöld,',
    'hnakkinn skaltu taka.',
    'Brýnum sverð og berum skjöld,',
    'bannað er að slaka.',
  ],
  out: [
    'Slokknar bál, en sólin rís,',
    'seinna komum aftur.',
    'Kólnar glóð og kemur ís,',
    'kviknar nýr þá kraftur.',
  ],
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
  /** the verse, a line each */
  verse?:     string[];
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
/* "fimm tæki": a few devices in words, as they are written; more as a number */
const DEVICES = ['', 'eitt', 'tvö', 'þrjú', 'fjögur', 'fimm', 'sex', 'sjö', 'átta', 'níu', 'tíu'];
const devices = (n: number) => `${DEVICES[n] ?? n} tæki`;

/* ─── the sign-in link ────────────────────────────────────────────────────── */

export function signinLetter({ name, url, expiresAt, uses }: { name: string; url: string; expiresAt: string; uses: number }): Letter {
  return {
    kind: 'signin',
    subject: `Lykillinn þinn að ${BRAND}, ${name}`,
    preheader: `Gildir til ${day(expiresAt)} og dugar á ${devices(uses)}.`,
    heading: `Gakktu í bæinn, ${name}`,
    lines: [
      'Hér er innskráningarlykillinn þinn. Ýttu á hnappinn í símanum eða tölvunni til að skrá þig inn. Þú helst innskráð/ur í heilt ár.',
      `Lykillinn gildir til ${day(expiresAt)} og dugar á ${devices(uses)}.`,
    ],
    button: { label: 'Skrá mig inn', url },
    verse: VERSES.signin,
    foot: ['Baðstu ekki um lykil? Hunsaðu þá bréfið; enginn kemst inn án hans.'],
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
    verse: VERSES[kind],
    foot: ['Viltu ekki fleiri bréf um spilakvöld? Breyttu því undir „Nafn og netfang“ á veggnum þínum.'],
    footLink: { label: 'Veggurinn þinn', url: `${site}/crew/${reader.username}` },
  };

  if (kind === 'lit') {
    const times = night.options.map(o => dayTime(o.at));
    return {
      ...base,
      subject: night.note ? `${by} kveikti bál: ${night.note}` : `${by} kveikti bál á ${BRAND}`,
      preheader: chosen ? `${dayTime(chosen.at)}. Kemurðu?` : `${times.length} tímar í boði. Hvenær kemstu?`,
      heading: `${by} kallar saman hópinn`,
      when: chosen ? [dayTime(chosen.at)] : times,
      lines: chosen
        ? ['Kemurðu? Svaraðu á vefnum svo hin viti hvort von sé á þér.']
        : ['Merktu við alla tímana sem þú kemst. Sá tími sem flest komast á verður fyrir valinu.'],
      button: { label: 'Svara kallinu', url },
    };
  }

  if (kind === 'chosen' && chosen) {
    const yes = yesFor(votes, chosen.id);
    return {
      ...base,
      subject: `Kvöldið er ákveðið: ${lower(dayTime(chosen.at))}`,
      preheader: yes.length ? `${yes.length} ${plural(yes.length, 'ætlar', 'ætla')} að mæta. Kemurðu?` : 'Kemurðu?',
      heading: night.chosenBy && night.chosenBy !== 'auto' ? `${who(night.chosenBy)} festi tímann` : 'Flest komast þá',
      when: [dayTime(chosen.at)],
      lines: [...coming(yes.map(who)), 'Sá sem lofar en mætir ekki fær nafnbótina Svikarinn.'],
      button: { label: 'Sjá kvöldið', url },
      links: [{ label: 'Setja í dagatalið', url: `${site}/kvold/${night.id}/dagatal.ics` }],
    };
  }

  if (kind === 'soon' && chosen) {
    const others = yesFor(votes, chosen.id).filter(u => !same(u, reader.username));
    return {
      ...base,
      subject: `Hálftími í bál: kl. ${clock(chosen.at)}`,
      preheader: 'Þú sagðist mæta. Serverinn bíður.',
      heading: `Söðlaðu hestinn, ${who(reader.username)}`,
      when: [dayTime(chosen.at)],
      lines: [
        `Bálið logar kl. ${clock(chosen.at)} og þú sagðist mæta.`,
        ...coming(others.map(who)),
        'Ef serverinn sefur geturðu vakið hann á vefnum.',
      ],
      button: { label: 'Kveikja á servernum', url },
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
      ? `Ekkert verður af kvöldinu á ${lower(dayTime(chosen.at))}. Hvílum hestana, það kemur annað kvöld.`
      : 'Ekkert verður af kvöldinu. Hvílum hestana, það kemur annað kvöld.'],
    button: { label: 'Kveikja nýtt bál', url: `${site}/#hopur` },
  };
}
