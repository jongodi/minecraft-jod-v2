import { describe, expect, it } from 'vitest';
import { bountyCounts, bountyState, mentionsIn, normalizeEntry, normalizeProfile, splitMentions } from '@/lib/crew-types';

const at = '2026-10-20T20:00:00.000Z';

describe('a call for something (Óskast)', () => {
  it('keeps the reward, who took it and when it was done', () => {
    const e = normalizeEntry({ id: 'b', text: 'Vantar 3 stakka af járni', photos: [], createdAt: at, bounty: { reward: ' 10 smaragðar ', takenBy: 'STEBBIAS', doneAt: at } });
    expect(e?.bounty).toEqual({ reward: '10 smaragðar', takenBy: 'stebbias', doneAt: at });
    expect(bountyState(e!.bounty!)).toBe('done');
  });

  it('is a plain note without a reward or without words, and a stranger cannot take it', () => {
    expect(normalizeEntry({ id: 'b', text: 'x', photos: [], createdAt: at, bounty: { reward: '  ' } })).not.toHaveProperty('bounty');
    const pic = { id: 'p', filename: '/screenshots/a.webp', caption: '', uploadedAt: at };
    expect(normalizeEntry({ id: 'b', text: '', photos: [pic], createdAt: at, bounty: { reward: '5' } })).not.toHaveProperty('bounty');
    expect(normalizeEntry({ id: 'b', text: 'x', photos: [], createdAt: at, bounty: { reward: '5', takenBy: 'notch' } })?.bounty?.takenBy).toBeNull();
  });

  it('says where it stands', () => {
    expect(bountyState({ reward: '1', takenBy: null, doneAt: null })).toBe('open');
    expect(bountyState({ reward: '1', takenBy: 'joenana', doneAt: null })).toBe('taken');
  });

  it('counts the calls each member brought home, and only those', () => {
    const wall = (username: string, entries: unknown[]) => normalizeProfile({ username, entries }, username);
    const call = (id: string, takenBy: string | null, doneAt: string | null) => ({ id, text: 'call', photos: [], createdAt: at, bounty: { reward: '1', takenBy, doneAt } });
    const counts = bountyCounts([
      wall('stebbias', [call('a', 'joenana', at), call('b', 'joenana', null), call('c', null, at)]),
      wall('AmmaGaur', [call('d', 'joenana', at), call('e', 'stebbias', at)]),
    ]);
    expect(counts).toEqual({ joenana: 2, stebbias: 1 });
  });
});

describe('a question for the crew', () => {
  const poll = (choices: unknown, closed?: unknown) => normalizeEntry({ id: 'q', text: 'Hvert förum við?', photos: [], createdAt: at, poll: { choices, closed } })?.poll;

  it('keeps two to four answers and one vote a member', () => {
    const p = poll([
      { id: 'a', text: 'Endinn', votes: ['stebbias', 'joenana'] },
      { id: 'b', text: 'Netherinn', votes: ['STEBBIAS', 'AmmaGaur', 'notch'] },
      { id: 'c', text: '  ', votes: [] },
    ], true);
    expect(p).toEqual({ closed: true, choices: [
      { id: 'a', text: 'Endinn', votes: ['stebbias', 'joenana'] },
      { id: 'b', text: 'Netherinn', votes: ['AmmaGaur'] },
    ] });
  });

  it('is no poll with fewer than two answers, or two by the same id', () => {
    expect(poll([{ id: 'a', text: 'Já', votes: [] }])).toBeUndefined();
    expect(poll([{ id: 'a', text: 'Já', votes: [] }, { id: 'a', text: 'Nei', votes: [] }])).toBeUndefined();
  });

  it('never rides with a call: a question wins', () => {
    const e = normalizeEntry({ id: 'q', text: 'x', photos: [], createdAt: at, bounty: { reward: '1' }, poll: { choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] } });
    expect(e?.poll?.choices).toHaveLength(2);
    expect(e).not.toHaveProperty('bounty');
  });

  it('leaves a plain note as it was stored', () => {
    expect(normalizeEntry({ id: 'n', text: 'hæ', photos: [], placeId: null, createdAt: at, lanterns: [], replies: [] }))
      .toEqual({ id: 'n', text: 'hæ', photos: [], placeId: null, createdAt: at, lanterns: [], replies: [] });
  });
});

describe('@nafn', () => {
  it('finds the members called by name, as the crew list spells them, once each', () => {
    expect(mentionsIn('@STEBBIAS og @joenana, sjáið þetta @stebbias!')).toEqual(['stebbias', 'joenana']);
  });

  it('leaves alone an email address, an unknown name and an @ in a word', () => {
    expect(mentionsIn('skrifaðu á hallo@jodcraft.world eða @notch, a@joenana')).toEqual([]);
  });

  it('cuts a text where it names someone, keeping the rest as it was', () => {
    expect(splitMentions('Hæ @ammagaur, komdu')).toEqual(['Hæ ', { name: 'AmmaGaur', raw: '@ammagaur' }, ', komdu']);
    expect(splitMentions('@joenana')).toEqual([{ name: 'joenana', raw: '@joenana' }]);
    expect(splitMentions('ekkert hér')).toEqual(['ekkert hér']);
  });
});
