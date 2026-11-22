// Every word the site's letters say, in one place. Server only.
//
// To change what a letter says, change it here: the subject, the line mail
// apps show after it (preheader), the picture at the top (banner) and who
// stands in it, the heading, the paragraphs, the button, the verse on its
// sign and the small print. The welcome (Borgarabréf) is the longest: what
// JOÐ is, the server's address, the steps into the game and what waits on
// the site. How a letter
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
import { andList, plural } from '@/lib/format';
import { CREW_USERNAMES } from '@/lib/crew-types';
import type { MailIcon } from '@/lib/mail-icons';
import type { Names } from '@/lib/crew-email';

/** What the letters call the site: in the sender's name, the picture, the foot and the subjects. */
export const BRAND = 'JOÐcraft';

/** The address the game is played on, as the letters write it. */
export const SERVER = 'play.jodcraft.world';

export type MailKind = 'welcome' | 'signin' | 'lit' | 'chosen' | 'soon' | 'out' | 'mention';
export const MAIL_KINDS: MailKind[] = ['welcome', 'signin', 'lit', 'chosen', 'soon', 'out', 'mention'];

/** What each letter is called in the admin panel, and when it goes. */
export const MAIL_NAMES: Record<MailKind, { name: string; when: string }> = {
  welcome: { name: 'Borgarabréf',          when: 'Þegar stjórnandinn sendir það úr Hópnum, til félaga, nýs eða gamalgróins. Með nýjum innskráningartengli.' },
  signin: { name: 'Innskráningartengill', when: 'Þegar stjórnandinn sendir tengil, eða félagi biður um einn.' },
  lit:    { name: 'Bál kveikt',           when: 'Þegar félagi stingur upp á spilakvöldi. Til allra nema hans.' },
  chosen: { name: 'Kvöldið ákveðið',      when: 'Þegar tími er festur á kvöldi með fleiri en einum tíma.' },
  soon:   { name: 'Hálftími í bál',       when: 'Hálftíma fyrir kvöldið, til þeirra sem ætla að mæta.' },
  out:    { name: 'Bálið slokknaði',      when: 'Þegar kvöldi er aflýst, til þeirra sem ætluðu að mæta.' },
  mention: { name: 'Nefnd/ur á töflunni',  when: 'Þegar félagi skrifar @nafn í miða eða svar. Til þess sem er nefndur.' },
};

/** The picture at the top of each letter: a small tag and a big title, drawn
    in the site's own fonts so they look the same in every mail app. Keep
    them short; the title has room for about 18 letters. */
export const BANNERS: Record<MailKind, { tag: string; title: string }> = {
  welcome: { tag: 'Hópurinn',    title: 'Borgarabréf' },
  signin: { tag: 'Innskráning', title: 'Lykillinn að bænum' },
  lit:    { tag: 'Spilakvöld',  title: 'Bál kveikt' },
  chosen: { tag: 'Spilakvöld',  title: 'Kvöldið er ákveðið' },
  soon:   { tag: 'Spilakvöld',  title: 'Hálftími í bál' },
  out:    { tag: 'Spilakvöld',  title: 'Bálið slokknaði' },
  mention: { tag: 'Taflan',     title: 'Kallað á þig' },
};

/** A verse at the foot of each letter: ferskeytlur, four lines of alternating
    rhyme with their staves (stuðlar and höfuðstafir). Change one here and
    keep it to four lines. */
export const VERSES: Record<MailKind, string[]> = {
  /* the fire's own verse, which says what life in JOÐ is in four lines */
  welcome: [
    'Kveikt er bál og creeper eytt,',
    'kallar hópinn saman.',
    'Byggjum hátt og berjumst sveitt,',
    'bros og glens og gaman.',
  ],
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
  mention: [
    'Nafn þitt stendur neglt á fjöl,',
    'nú skal svara kalli.',
    'Fljúgðu yfir fjall og möl',
    'fram að hæsta stalli.',
  ],
};

/** One letter's words. */
export interface Letter {
  kind:       MailKind;
  subject:    string;
  /** the grey line mail apps show after the subject in the inbox */
  preheader:  string;
  heading:    string;
  /** the crew drawn in the picture, by their Minecraft names, each in their own skin */
  figures?:   string[];
  /** a first paragraph a little larger than the rest */
  lead?:      string;
  /** the night's own line, in quotes */
  quote?:     string;
  /** times, on a ticket of their own */
  when?:      string[];
  /** the times are crossed out (a night called off) */
  struck?:    boolean;
  /** a paragraph each */
  lines:      string[];
  /** labelled lines on a ticket of their own (the server's address) */
  facts?:     { label: string; value: string }[];
  /** numbered steps, under a title of their own */
  steps?:     { title: string; list: { title: string; text: string }[] };
  /** a list with a small picture each, under a title of their own */
  items?:     { title: string; list: { icon: MailIcon; title: string; text: string }[] };
  /** the verse, a line each; it is cut on a sign */
  verse?:     string[];
  /** a line said over the verse */
  verseIntro?: string;
  /** answers straight from the letter, each a button; a quiet one ("Kemst ekki") is a link beside them */
  answers?:   { label: string; url: string; quiet?: boolean }[];
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

export function signinLetter({ name, username, url, expiresAt, uses }: { name: string; username?: string; url: string; expiresAt: string; uses: number }): Letter {
  return {
    kind: 'signin',
    subject: `Lykillinn þinn að ${BRAND}, ${name}`,
    preheader: `Gildir til ${day(expiresAt)} og dugar á ${devices(uses)}.`,
    heading: `Gakktu í bæinn, ${name}`,
    ...(username ? { figures: [username] } : {}),
    lines: [
      'Hér er innskráningarlykillinn þinn. Ýttu á hnappinn í símanum eða tölvunni til að skrá þig inn. Innskráningin gildir í heilt ár.',
      `Lykillinn gildir til ${day(expiresAt)} og dugar á ${devices(uses)}.`,
    ],
    button: { label: 'Skrá mig inn', url },
    verse: VERSES.signin,
    foot: ['Baðstu ekki um lykil? Þá geturðu hent þessu bréfi. Enginn kemst inn án lykilsins.'],
  };
}

/* ─── the welcome ─────────────────────────────────────────────────────────── */

/** A member's citizen's letter, sent by the admin from Hópurinn: what JOÐ is,
    how to get into the game, what is on the site, and a sign-in link of
    their own. It goes to new members and to those who have played for years
    alike, so nothing in it says the reader has only just arrived. `crew` is what the letters call the others, `version` the
    game's version on the server, when it is known. */
export function welcomeLetter({ name, username, url, expiresAt, uses, site, crew, version }: {
  name: string; username: string; url: string; expiresAt: string; uses: number; site: string; crew: string[]; version?: string | null;
}): Letter {
  return {
    kind: 'welcome',
    subject: `Borgarabréfið þitt er komið, ${name}`,
    preheader: 'Heimilisfang þjónsins, lykill að vefnum og allt hitt sem borgari í JOÐ þarf að vita.',
    heading: `Þú ert borgari í JOÐ, ${name}`,
    figures: [username],
    lead: `Hæ ${name}! Þetta bréf staðfestir það sem við vissum öll: þú ert fullgildur borgari í JOÐ, kubbaveröldinni okkar. Réttindin eru engin og skyldan bara ein: að mæta þegar þú segist ætla að mæta.`,
    lines: crew.length ? [`Samborgarar þínir eru ${andList(crew)}. Flest þeirra skila því sem þau fá lánað.`] : [],
    facts: [
      { label: 'Heimilisfang þjónsins', value: SERVER },
      { label: 'Útgáfa', value: version ? `Minecraft Java ${version}` : 'Minecraft Java' },
    ],
    steps: {
      title: 'Svona kemstu inn',
      list: [
        { title: 'Bættu þjóninum við', text: `Opnaðu Minecraft, farðu í Multiplayer og ýttu á Add Server. Í Server Address skrifarðu ${SERVER}.` },
        { title: 'Segðu já við útlitspakkanum', text: 'Ef leikurinn spyr hvort þú viljir útlitspakka þjónsins skaltu segja já. Án hans vantar hálfan heiminn.' },
        { title: 'Skráðu þig inn á vefinn', text: 'Ýttu á hnappinn hér fyrir neðan. Þar áttu þinn eigin vegg, getur fest miða á töfluna og kveikt bál þegar þig langar að spila.' },
      ],
    },
    button: { label: 'Skrá mig inn', url },
    links: [{ label: 'Sjá heiminn í þrívídd', url: `${site}/heimskort` }],
    items: {
      title: 'JOÐ á vefnum',
      list: [
        { icon: 'wall',   title: 'Veggurinn þinn',      text: 'Þinn eigin staður á vefnum. Hengdu upp skjáskot og montaðu þig af því sem þú byggðir.' },
        { icon: 'board',  title: 'Taflan',              text: 'Þar hangir allt sem gerist í JOÐ. Skrifaðu @nafn á miða og viðkomandi fær bréf.' },
        { icon: 'fire',   title: 'Bálin',               text: 'Svona ákveðum við spilakvöld: einhver kveikir bál og stingur upp á tímum, hin merkja við hvenær þau komast. Þjónninn sefur þess á milli, en hálftíma fyrir bál má vekja hann.' },
        { icon: 'wanted', title: 'Eftirlýst',           text: 'Sá sem lofar að mæta en kemur ekki fær nafnbótina Svikarinn. Bara svo þú vitir það.' },
        { icon: 'map',    title: 'Heimurinn í þrívídd', text: 'Allt sem við höfum byggt, á korti sem þú getur flogið yfir í vafranum.' },
      ],
    },
    verseIntro: 'Lífið í JOÐ í fjórum línum',
    verse: VERSES.welcome,
    foot: [
      'Einhverjar spurningar? Svaraðu bara þessu bréfi.',
      `Lykillinn í hnappnum gildir til ${day(expiresAt)} og dugar á ${devices(uses)}. Eftir það geturðu beðið um nýjan undir „Þetta er ég“ á vefnum.`,
      'Þú færð líka bréf þegar bál er kveikt og þegar einhver nefnir þig á töflunni. Því breytirðu undir „Nafn og netfang“ á veggnum þínum.',
    ],
    footLink: { label: 'Veggurinn þinn', url: `${site}/crew/${username}` },
  };
}

/** What the welcome calls the rest of the crew: everyone but `username`, by the names given. */
export const crewBut = (username: string, names: Names = {}) =>
  CREW_USERNAMES.filter(u => u.toLowerCase() !== username.toLowerCase()).map(u => names[u.toLowerCase()] ?? u);

/* ─── a member called by name on the board ────────────────────────────────── */

/** `by` called the reader by name (@nafn) in a note on `owner`'s wall, or in a
    reply under one. `text` is what they wrote, `url` where it hangs. */
export function mentionLetter({ by, byUser, reader, text, url, reply, site }: { by: string; byUser?: string; reader: string; text: string; url: string; reply: boolean; site: string }): Letter {
  const line = text.replace(/\s+/g, ' ').trim();
  const quote = line.length > 160 ? `${line.slice(0, 157).replace(/\s+\S*$/, '')}…` : line;
  return {
    kind: 'mention',
    subject: `${by} nefndi þig á töflunni`,
    preheader: quote,
    heading: `${by} kallar á þig, ${reader}`,
    ...(byUser ? { figures: [byUser] } : {}),
    quote,
    lines: [reply ? `${by} nefndi þig í svari á töflunni á ${BRAND}.` : `${by} nefndi þig í miða á töflunni á ${BRAND}.`],
    button: { label: 'Sjá á töflunni', url },
    verse: VERSES.mention,
    foot: ['Viltu ekki bréf þegar einhver nefnir þig? Breyttu því undir „Nafn og netfang“ á veggnum þínum.'],
    footLink: { label: 'Taflan', url: `${site}/taflan` },
  };
}

/* ─── the play nights ─────────────────────────────────────────────────────── */

export type NightNotice = Exclude<MailKind, 'welcome' | 'signin' | 'mention'>;

/** The most the picture has room for. */
export const FIGURES_MAX = 4;
const figures = (users: string[]) => [...new Set(users)].slice(0, FIGURES_MAX);

/** Who is coming, as one sentence; nothing when nobody is. */
const coming = (names: string[]) => names.length
  ? [`${names.length} ${plural(names.length, 'ætlar', 'ætla')} að mæta: ${andList([...names].sort((a, b) => a.localeCompare(b, 'is')))}.`]
  : [];

/** An answer link for this reader and night (src/lib/night-answer.ts): `svar`
    is an option's id, or 'ekki'. Null when links can't be signed. */
export type AnswerLink = (svar: string) => string | null;

/** The answers a letter offers, or none when the links can't be made. */
function answersOf(choices: { svar: string; label: string; quiet?: boolean }[], answer?: AnswerLink): Letter['answers'] {
  if (!answer) return undefined;
  const made = choices.map(c => ({ ...c, url: answer(c.svar) }));
  return made.every(c => c.url) ? made.map(({ label, url, quiet }) => ({ label, url: url!, ...(quiet ? { quiet } : {}) })) : undefined;
}

export function nightLetter(kind: NightNotice, night: Night, votes: Votes, reader: Reader, site: string, names: Names = {}, answer?: AnswerLink): Letter {
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
  /* "Ég mæti" or "Kemst ekki" from the letter, for a night with its time fixed */
  const comeOrNot = chosen ? answersOf([{ svar: chosen.id, label: 'Ég mæti' }, { svar: 'ekki', label: 'Kemst ekki', quiet: true }], answer) : undefined;

  if (kind === 'lit') {
    const times = night.options.map(o => dayTime(o.at));
    /* one button per time offered: the times are the answers, so they are not listed twice */
    const answers = chosen ? comeOrNot : answersOf([...night.options.map(o => ({ svar: o.id, label: dayTime(o.at) })), { svar: 'ekki', label: 'Kemst ekki', quiet: true }], answer);
    return {
      ...base,
      subject: night.note ? `${by} kveikti bál: ${night.note}` : `${by} kveikti bál á ${BRAND}`,
      preheader: chosen ? `${dayTime(chosen.at)}. Kemurðu?` : `${times.length} tímar í boði. Hvenær kemstu?`,
      heading: `${by} kallar hópinn saman`,
      figures: figures([night.by]),
      ...(chosen || !answers ? { when: chosen ? [dayTime(chosen.at)] : times } : {}),
      lines: answers
        ? [chosen
            ? 'Kemurðu? Veldu svar hér fyrir neðan og staðfestu það á vefnum, svo hin viti hvort von sé á þér.'
            : 'Hvenær kemstu? Veldu einn tíma hér fyrir neðan og merktu við fleiri á vefnum. Sá tími sem flest komast á verður fyrir valinu.']
        : [chosen
            ? 'Kemurðu? Svaraðu á vefnum svo hin viti hvort von sé á þér.'
            : 'Merktu við alla tíma sem henta þér. Sá tími sem flest komast á verður fyrir valinu.'],
      ...(answers ? { answers, links: [{ label: 'Sjá bálið á vefnum', url }] } : { button: { label: 'Svara kallinu', url } }),
    };
  }

  if (kind === 'chosen' && chosen) {
    const yes = yesFor(votes, chosen.id);
    const calendar = { label: 'Setja í dagatalið', url: `${site}/kvold/${night.id}/dagatal.ics` };
    return {
      ...base,
      subject: `Kvöldið er ákveðið: ${lower(dayTime(chosen.at))}`,
      preheader: yes.length ? `${yes.length} ${plural(yes.length, 'ætlar', 'ætla')} að mæta. Kemurðu?` : 'Kemurðu?',
      heading: night.chosenBy && night.chosenBy !== 'auto' ? `${who(night.chosenBy)} festi tímann` : 'Flest komast þá',
      figures: figures(yes),
      when: [dayTime(chosen.at)],
      lines: [...coming(yes.map(who)), 'Sá sem lofar en mætir ekki fær nafnbótina Svikarinn.'],
      ...(comeOrNot
        ? { answers: comeOrNot, links: [{ label: 'Sjá kvöldið', url }, calendar] }
        : { button: { label: 'Sjá kvöldið', url }, links: [calendar] }),
    };
  }

  if (kind === 'soon' && chosen) {
    const others = yesFor(votes, chosen.id).filter(u => !same(u, reader.username));
    return {
      ...base,
      subject: `Hálftími í bál: kl. ${clock(chosen.at)}`,
      preheader: 'Þú sagðist mæta. Þjónninn bíður.',
      heading: `Söðlaðu hestinn, ${who(reader.username)}`,
      figures: figures([reader.username, ...others]),
      when: [dayTime(chosen.at)],
      lines: [
        `Bálið logar kl. ${clock(chosen.at)} og þú sagðist mæta.`,
        ...coming(others.map(who)),
        'Ef þjónninn sefur geturðu vakið hann á vefnum.',
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
      ? `Ekkert verður af kvöldinu á ${lower(dayTime(chosen.at))}. Hvílum hestana, það kemur annað kvöld.`
      : 'Ekkert verður af kvöldinu. Hvílum hestana, það kemur annað kvöld.'],
    button: { label: 'Kveikja nýtt bál', url: `${site}/#hopur` },
  };
}
