import { afterEach, describe, expect, it, vi } from 'vitest';
import { BANNERS, MAIL_KINDS, SERVER, VERSES, crewBut, welcomeLetter, type Letter } from '@/lib/email-copy';
import { DEFAULT_THEMES, THEMES, artHeading, artUrl, figuresOf, iconUrl, postmark, renderLetter, verseUrl } from '@/lib/email-design';
import { MAIL_ICONS, iconRows, iconSvg } from '@/lib/mail-icons';
import { moonPhase } from '@/lib/moon';
import { readThemes, setTheme } from '@/lib/email-settings';
import { sampleLetter } from '@/lib/email-samples';

const SITE = 'https://jod.test';
const NOW = Date.parse('2026-11-19T16:05:00Z');
const letter = (over: Partial<Letter> = {}): Letter => ({
  kind: 'lit', subject: 'Bál <b>í kvöld</b>', preheader: 'Kemur þú?', heading: 'Bál <b>í kvöld</b>',
  quote: 'Byggjum & berjumst', when: ['Laugardag 10. okt. kl. 20:00'], lines: ['Hnakkurinn bíður.'],
  button: { label: 'Svara', url: 'https://jod.test/kvold/a1?x=1&y="2"' },
  links: [{ label: 'Í dagatalið', url: 'https://jod.test/kvold/a1/dagatal.ics' }],
  foot: ['smátt letur'], footLink: { label: 'Veggurinn þinn', url: 'https://jod.test/crew/joenana' },
  ...over,
});

describe('a letter in its dress', () => {
  it('escapes what it is given and says the same in plain text', () => {
    const { subject, html, text } = renderLetter(letter(), 'sunset', SITE);
    expect(subject).toBe('Bál <b>í kvöld</b>');
    expect(html).toContain('Bál &lt;b&gt;í kvöld&lt;/b&gt;');
    expect(html).toContain('„Byggjum &amp; berjumst“');
    expect(html).toContain('href="https://jod.test/kvold/a1?x=1&amp;y=&quot;2&quot;"');
    expect(html).not.toContain('<b>');
    expect(text).toContain('BÁL <B>Í KVÖLD</B>');
    expect(text).toContain('Svara: https://jod.test/kvold/a1?x=1&y="2"');
    expect(text).toContain('Í dagatalið: https://jod.test/kvold/a1/dagatal.ics');
    expect(text).toContain('Veggurinn þinn: https://jod.test/crew/joenana');
  });

  it('carries its picture, with tonight\'s moon over the fire, the fonts and the line the inbox shows', () => {
    const { html } = renderLetter(letter(), 'campfire', SITE, { now: NOW });
    expect(html).toContain(`src="${artUrl(SITE, 'campfire', 'lit', undefined, { moon: moonPhase(new Date(NOW)) }).replace(/&/g, '&amp;')}"`);
    expect(html).toContain(`&amp;m=${moonPhase(new Date(NOW))}`);
    /* the sun has no moon */
    expect(renderLetter(letter(), 'sunset', SITE, { now: NOW }).html).not.toMatch(/mail-art\?t=sunset[^"]*&amp;m=/);
    expect(html).toContain(`url(${SITE}/email-fonts/alfa-slab-one.woff2)`);
    expect(html).toContain('Kemur þú?');
    expect(html).toContain('content="dark only"');
    expect(renderLetter(letter(), 'sunset', SITE).html).toContain('content="light only"');
  });

  it('is one card on the mail app\'s own ground, the button\'s address in the small print and its links under it', () => {
    const { html } = renderLetter(letter(), 'sunset', SITE);
    expect(html).toMatch(/<body style="margin:0;padding:0;word-spacing:normal">/);
    expect(html).toContain('Virkar hnappurinn ekki? Opnaðu <a href="https://jod.test/kvold/a1?x=1&amp;y=&quot;2&quot;"');
    expect(html.indexOf('>Svara</a>')).toBeLessThan(html.indexOf('href="https://jod.test/kvold/a1/dagatal.ics"'));
    /* read as a letter, in Icelandic, by a screen reader */
    expect(html).toContain('role="article" aria-roledescription="email"');
    expect(html).toMatch(/<div role="article"[^>]* lang="is"/);
  });

  it('keeps what Gmail cannot read apart from what it can, and the phone\'s rules in a block of their own', () => {
    const { html } = renderLetter(letter(), 'sunset', SITE);
    const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('@font-face');
    expect(blocks[0]).toContain('x-apple-data-detectors');
    expect(blocks[1]).not.toContain('@font-face');
    expect(blocks[1]).not.toContain('[');
    expect(blocks[1]).toContain('@media (max-width:700px)');
    /* times and addresses are not made links of on the phone */
    expect(html).toContain('<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">');
    expect(renderLetter(letter(), 'sunset', SITE, { webFonts: false }).html).not.toContain('@font-face');
  });

  it('carries a postmark of its own minute, so Gmail does not fold the foot away in a thread', () => {
    expect(postmark(NOW)).toBe('19. nóvember 2026 kl. 16:05');
    const a = renderLetter(letter(), 'sunset', SITE, { now: NOW }).html;
    const b = renderLetter(letter(), 'sunset', SITE, { now: NOW + 60_000 }).html;
    expect(a).toContain('Stimplað í JOÐ 19. nóvember 2026 kl. 16:05');
    expect(b).toContain('kl. 16:06');
  });

  it('writes the server\'s address so no mail app makes a link of it, and copies as it reads', () => {
    const { html, text } = renderLetter(letter({ lines: [`Tengstu ${SERVER} í kvöld.`] }), 'sunset', SITE);
    expect(html).toContain('Tengstu play<span style="color:inherit">.</span>jodcraft<span style="color:inherit">.</span>world í kvöld.');
    expect(html).not.toMatch(/>[^<]*play\.jodcraft\.world/);
    expect(text).toContain(`Tengstu ${SERVER} í kvöld.`);
  });

  it('crosses out the times of a night called off', () => {
    expect(renderLetter(letter({ struck: true }), 'sunset', SITE).html).toContain('text-decoration:line-through');
    expect(renderLetter(letter(), 'sunset', SITE).html).not.toContain('line-through');
  });

  it('gives each picture its own address, which changes with its look', () => {
    const urls = new Set(THEMES.flatMap(t => MAIL_KINDS.map(k => artUrl(SITE, t, k))));
    expect(urls.size).toBe(THEMES.length * MAIL_KINDS.length);
    for (const k of MAIL_KINDS) expect(BANNERS[k].title.length).toBeLessThanOrEqual(20);
  });

  it('draws every made-up letter in both looks', () => {
    for (const k of MAIL_KINDS) for (const t of THEMES) {
      const { subject, html, text } = renderLetter(sampleLetter(k, SITE), t, SITE);
      expect(subject.length).toBeGreaterThan(0);
      expect(html).toContain(`/api/mail-art?t=${t}&amp;k=${k}`);
      /* Gmail cuts a letter off at about 100 kB */
      expect(html.length).toBeLessThan(60_000);
      expect(text).toContain('JOÐcraft · play.jodcraft.world');
      /* every letter ends on its four-line verse, cut on a sign, its words said where the picture is not shown, and in the plain text */
      expect(VERSES[k]).toHaveLength(4);
      expect(html).toContain(`src="${verseUrl(SITE, t, k).replace(/&/g, '&amp;')}"`);
      expect(html).toContain(`alt="${VERSES[k].join(' / ')}"`);
      expect(text).toContain(VERSES[k].join('\n'));
    }
  });
});

describe('the crew in the picture', () => {
  it('stands up only the crew, as the list spells them, none twice and four at most', () => {
    expect(figuresOf(['JOENANA', 'joenana', 'nobody', 'stebbias'])).toEqual(['joenana', 'stebbias']);
    expect(figuresOf('stebbias,AmmaGaur,ingunnbirta,joenana,Gamla123')).toHaveLength(4);
    expect(figuresOf('<script>,../x')).toEqual([]);
    expect(figuresOf(null)).toEqual([]);
  });

  it('carries who each letter is about', () => {
    const src = (k: typeof MAIL_KINDS[number]) => renderLetter(sampleLetter(k, SITE), DEFAULT_THEMES[k], SITE).html.match(/<img src="([^"]+)"/)![1].replace(/&amp;/g, '&');
    expect(new URL(src('welcome')).searchParams.get('f')).toBe('joenana');
    expect(new URL(src('signin')).searchParams.get('f')).toBe('joenana');
    expect(new URL(src('mention')).searchParams.get('f')).toBe('stebbias');
    expect(new URL(src('lit')).searchParams.get('f')).toBe('stebbias');
    /* the half hour: the reader first, then the others coming */
    expect(new URL(src('soon')).searchParams.get('f')?.split(',')[0]).toBe('joenana');
    /* a fire put out has nobody by it */
    expect(new URL(src('out')).searchParams.get('f')).toBeNull();
  });
});

describe('the welcome', () => {
  const welcome = (over: Partial<Parameters<typeof welcomeLetter>[0]> = {}) => welcomeLetter({
    name: 'Jóna', username: 'joenana', url: 'https://jod.test/api/crew/invite?lykill=k1', expiresAt: '2026-11-26T12:00:00Z', uses: 5,
    site: SITE, crew: crewBut('joenana', { stebbias: 'Stefán' }), version: '26.5', ...over,
  });

  it('greets the member by name and names the rest of the crew, not them', () => {
    const l = welcome();
    expect(l.subject).toBe('Borgarabréfið þitt er komið, Jóna');
    expect(l.heading).toBe('Þú ert borgari í JOÐ, Jóna');
    expect(l.lead).toMatch(/^Hæ Jóna! /);
    expect(l.lines[0]).toMatch(/^Samborgarar þínir eru Stefán, AmmaGaur, .* og eikibleiki\. /);
    /* it goes to those already playing too, so it never says the reader has just come */
    expect(`${l.heading} ${l.lead} ${l.lines.join(' ')} ${l.preheader}`).not.toMatch(/nú þú|Gaman að fá|til að byrja/);
    expect(l.lines[0]).not.toContain('joenana');
  });

  it('says where the game is played, on which version, and how to get in', () => {
    const { html, text } = renderLetter(welcome(), 'sunset', SITE);
    expect(text).toContain(`Heimilisfang þjónsins: ${SERVER}`);
    expect(text).toContain('Útgáfa: Minecraft Java 26.5');
    expect(text).toContain('SVONA KEMSTU INN');
    expect(text).toContain('1. Bættu þjóninum við');
    expect(text).toContain('Skrá mig inn: https://jod.test/api/crew/invite?lykill=k1');
    expect(text).toContain('Lykillinn í hnappnum gildir til 26. nóvember og dugar á fimm tæki.');
    expect(text).toContain('Borgaravísan:');
    expect(text).toContain('Veggurinn þinn: https://jod.test/crew/joenana');
    expect(html).toContain('>Skrá mig inn</a>');
    /* without a version known, no number is guessed */
    expect(renderLetter(welcome({ version: null }), 'sunset', SITE).text).toContain('Útgáfa: Minecraft Java\n');
  });

  it('shows what waits on the site, each with its small picture', () => {
    const { html, text } = renderLetter(welcome(), 'campfire', SITE);
    for (const icon of ['wall', 'board', 'fire', 'wanted'] as const) expect(html).toContain(`src="${iconUrl(SITE, icon).replace(/&/g, '&amp;')}"`);
    expect(text).toContain('JOÐ Á VEFNUM');
    /* the long letter is wider, its parts side by side; a short one keeps its width */
    expect(html).toContain('max-width:680px');
    expect(html.match(/class="jod-col"/g)).toHaveLength(2 + 3 + 4);
    expect(renderLetter(letter(), 'sunset', SITE).html).not.toMatch(/max-width:680px|class="jod-col"/);
    expect(text).toContain('* Eftirlýst: Sá sem lofar að mæta en kemur ekki fær nafnbótina Svikarinn. Bara svo þú vitir það.');
  });
});

describe('the small pictures', () => {
  it('are each sixteen by sixteen, every pixel a colour they have', () => {
    for (const icon of MAIL_ICONS) {
      const { rows, palette } = iconRows(icon);
      expect(rows, icon).toHaveLength(16);
      for (const row of rows) {
        expect(row, `${icon}: ${row}`).toHaveLength(16);
        for (const ch of row) if (ch !== '.') expect(palette[ch], `${icon}: ${ch}`).toBeTruthy();
      }
      expect(iconSvg(icon)).toMatch(/^<svg [^>]*viewBox="0 0 16 16"/);
    }
  });
});

describe('the heading in the picture', () => {
  afterEach(() => vi.unstubAllEnvs());
  const parts = (url: string) => new URL(url).searchParams;

  it('is drawn in the picture, signed, when the site has a key', () => {
    vi.stubEnv('CRON_SECRET', 'a-long-secret-for-the-cron-job');
    const { html } = renderLetter(letter({ heading: 'Söðlaðu hestinn, Jóna' }), 'campfire', SITE);
    const src = html.match(/<img src="([^"]+)"/)![1].replace(/&amp;/g, '&');
    const q = parts(src);
    expect(artHeading('campfire', 'lit', q.get('h'), q.get('s'))).toBe('Söðlaðu hestinn, Jóna');
    /* the picture says it, so the paper does not say it again; the picture's alt text does */
    expect(html).not.toContain('<h1');
    expect(html).toContain('alt="Söðlaðu hestinn, Jóna"');
  });

  it('is never drawn from words the site did not sign', () => {
    vi.stubEnv('CRON_SECRET', 'a-long-secret-for-the-cron-job');
    const q = parts(artUrl(SITE, 'sunset', 'lit', 'Bál í kvöld'));
    const forged = Buffer.from('Ókeypis gull hér').toString('base64url');
    expect(artHeading('sunset', 'lit', forged, q.get('s'))).toBeNull();
    expect(artHeading('sunset', 'out', q.get('h'), q.get('s'))).toBeNull();
    expect(artHeading('campfire', 'lit', q.get('h'), q.get('s'))).toBeNull();
    expect(artHeading('sunset', 'lit', q.get('h'), 'x')).toBeNull();
    expect(artHeading('sunset', 'lit', null, null)).toBeNull();
    vi.stubEnv('CRON_SECRET', 'another-secret-after-a-change');
    expect(artHeading('sunset', 'lit', q.get('h'), q.get('s'))).toBeNull();
  });

  it('stays on the paper when there is no key to sign it with', () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('ADMIN_TOKEN', '');
    vi.stubEnv('MAIL_ART_SECRET', '');
    const { html } = renderLetter(letter({ heading: 'Bál í kvöld' }), 'sunset', SITE);
    expect(html).toContain('>Bál í kvöld</h1>');
    expect(html).not.toContain('&amp;h=');
  });

  it('never signs with the admin password, which every letter would carry signatures over', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('MAIL_ART_SECRET', '');
    vi.stubEnv('ADMIN_TOKEN', 'the-admin-password');
    const { html } = renderLetter(letter({ heading: 'Bál í kvöld' }), 'sunset', SITE);
    expect(html).not.toContain('&amp;h=');
    const { canAnswerByLink } = await import('@/lib/night-answer');
    expect(canAnswerByLink()).toBe(false);
  });
});

describe('the chosen looks', () => {
  it('are the defaults until one is chosen, and then that one', async () => {
    expect(await readThemes()).toEqual(DEFAULT_THEMES);
    await setTheme('lit', 'campfire');
    expect((await readThemes()).lit).toBe('campfire');
    expect((await readThemes()).signin).toBe('sunset');
  });
});
