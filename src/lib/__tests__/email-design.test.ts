import { afterEach, describe, expect, it, vi } from 'vitest';
import { BANNERS, MAIL_KINDS, type Letter } from '@/lib/email-copy';
import { DEFAULT_THEMES, THEMES, artHeading, artUrl, renderLetter } from '@/lib/email-design';
import { readThemes, setTheme } from '@/lib/email-settings';
import { sampleLetter } from '@/lib/email-samples';

const SITE = 'https://jod.test';
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

  it('carries its picture, the fonts and the line the inbox shows', () => {
    const { html } = renderLetter(letter(), 'campfire', SITE);
    expect(html).toContain(`src="${artUrl(SITE, 'campfire', 'lit').replace(/&/g, '&amp;')}"`);
    expect(html).toContain(`url(${SITE}/email-fonts/alfa-slab-one.woff2)`);
    expect(html).toContain('Kemur þú?');
    expect(html).toContain('content="dark only"');
    expect(renderLetter(letter(), 'sunset', SITE).html).toContain('content="light only"');
  });

  it('is one card on the mail app\'s own ground, the button\'s address in the small print and its links beside it', () => {
    const { html } = renderLetter(letter(), 'sunset', SITE);
    expect(html).toMatch(/<body style="margin:0;padding:0">/);
    expect(html).toContain('Virkar hnappurinn ekki? Opnaðu <a href="https://jod.test/kvold/a1?x=1&amp;y=&quot;2&quot;"');
    expect(html).toMatch(/<td class="jod-stack"[^>]*><a href="https:\/\/jod.test\/kvold\/a1\/dagatal.ics"/);
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
      expect(html.length).toBeLessThan(60_000);
      expect(text).toContain('JOÐ · play.jodcraft.world');
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
});

describe('the chosen looks', () => {
  it('are the defaults until one is chosen, and then that one', async () => {
    expect(await readThemes()).toEqual(DEFAULT_THEMES);
    await setTheme('lit', 'campfire');
    expect((await readThemes()).lit).toBe('campfire');
    expect((await readThemes()).signin).toBe('sunset');
  });
});
