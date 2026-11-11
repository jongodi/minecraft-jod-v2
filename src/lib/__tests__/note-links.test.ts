import { describe, expect, it } from 'vitest';
import { LABEL_MAX, linkLabel, splitLinks, type NoteLink } from '../note-links';

const links = (text: string) => splitLinks(text).filter((p): p is NoteLink => typeof p !== 'string');

describe('links in a note', () => {
  it('finds an address among the words and leaves the words as they were', () => {
    const parts = splitLinks('Sjáið brúna: https://example.org/bru og segið mér');
    expect(parts[0]).toBe('Sjáið brúna: ');
    expect(parts[1]).toMatchObject({ href: 'https://example.org/bru', label: 'example.org/bru', own: null });
    expect(parts[2]).toBe(' og segið mér');
  });

  it('leaves the full stop, the comma and the bracket that close the sentence with the words', () => {
    expect(splitLinks('Kortið er hér (https://example.org/kort).')).toEqual(['Kortið er hér (', expect.objectContaining({ href: 'https://example.org/kort' }), ').']);
    expect(links('https://example.org/a, https://example.org/b!').map(l => l.href)).toEqual(['https://example.org/a', 'https://example.org/b']);
  });

  it('knows the site\'s own pages, which open here as a path', () => {
    expect(links('https://jodcraft.world/stadur/3?syn=1,2,3#heimur')[0].own).toBe('/stadur/3?syn=1,2,3#heimur');
    expect(links('https://www.jodcraft.world')[0].own).toBe('/');
    expect(links('https://jodcraft.world.evil.example/stadur/3')[0].own).toBeNull();
  });

  it('shows an address without its scheme and cuts a long one short, leading to the whole of it', () => {
    const long = 'https://www.example.org/a/very/long/path/that/goes/on/and/on/and/on?with=a&query=too';
    const [l] = links(long);
    expect(l.href).toBe(long);
    expect(l.label.length).toBe(LABEL_MAX);
    expect(l.label.endsWith('…')).toBe(true);
    expect(l.label.startsWith('example.org/')).toBe(true);
    expect(linkLabel('http://example.org/')).toBe('example.org');
  });

  it('makes a link of nothing else: no other scheme, no bare word, no address carrying a password, none mid-word', () => {
    for (const text of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.org/x', 'example.org', 'https://admin:secret@example.org', 'https://localhost/x', 'sjáhttps://example.org']) {
      expect(links(text), text).toEqual([]);
      expect(splitLinks(text)).toEqual([text]);
    }
  });

  it('is the text unchanged when there is no address in it', () => {
    expect(splitLinks('Brúin er komin!')).toEqual(['Brúin er komin!']);
    expect(splitLinks('')).toEqual([]);
  });
});
