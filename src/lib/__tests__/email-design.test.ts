import { describe, expect, it } from 'vitest';
import { BANNERS, MAIL_KINDS, type Letter } from '@/lib/email-copy';
import { DEFAULT_THEMES, THEMES, artUrl, renderLetter } from '@/lib/email-design';
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

describe('the chosen looks', () => {
  it('are the defaults until one is chosen, and then that one', async () => {
    expect(await readThemes()).toEqual(DEFAULT_THEMES);
    await setTheme('lit', 'campfire');
    expect((await readThemes()).lit).toBe('campfire');
    expect((await readThemes()).signin).toBe('sunset');
  });
});
