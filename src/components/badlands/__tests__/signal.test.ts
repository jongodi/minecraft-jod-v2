import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { PlayNightResponse, PublicNight } from '@/app/api/playnight/route';
import { signalOf, signalSpot, type Plateau } from '../signal';
import { useSignal } from '../night';

const night = (phase: PublicNight['phase'], at: string, chosen: string | null = 'o1'): PublicNight => ({
  id: 'n1', by: 'stebbias', note: '', phase, options: [{ id: 'o1', at, yes: ['stebbias'] }], answered: ['stebbias'],
  chosen, chosenBy: chosen ? 'stebbias' : null, decidesAt: at, startedBy: null, came: [], numbers: null,
});

describe('signalOf', () => {
  const now = Date.parse('2026-11-07T10:00:00Z');

  it('stands on the day a fire is chosen for, in Iceland, which is UTC', () => {
    expect(signalOf([night('chosen', '2026-11-07T20:00:00Z')], now)).toBe(true);
    expect(signalOf([night('chosen', '2026-11-07T23:30:00Z')], now)).toBe(true);
  });

  it('waits for the day itself', () => {
    expect(signalOf([night('chosen', '2026-11-08T00:30:00Z')], now)).toBe(false);
    expect(signalOf([night('chosen', '2026-11-09T20:00:00Z')], now)).toBe(false);
  });

  it('stands while the fire is about to be lit and through an evening that runs past midnight', () => {
    expect(signalOf([night('soon', '2026-11-07T20:00:00Z')], Date.parse('2026-11-07T19:45:00Z'))).toBe(true);
    expect(signalOf([night('live', '2026-11-06T23:00:00Z')], Date.parse('2026-11-07T01:00:00Z'))).toBe(true);
  });

  it('is gone once the evening is over, and for a night not yet decided', () => {
    expect(signalOf([night('over', '2026-11-07T08:00:00Z')], now)).toBe(false);
    expect(signalOf([night('open', '2026-11-07T20:00:00Z', null)], now)).toBe(false);
    expect(signalOf([], now)).toBe(false);
  });

  it('looks past an evening that is over to the next', () => {
    expect(signalOf([night('over', '2026-11-06T20:00:00Z'), { ...night('chosen', '2026-11-07T21:00:00Z'), id: 'n2' }], now)).toBe(true);
  });
});

describe('the signal as the page was drawn', () => {
  /* a fire chosen for 8 November; the page drawn at ten the evening before,
     and opened by the first visitor of the fire's day */
  const nights: PlayNightResponse = { nights: [night('chosen', '2026-11-08T20:00:00Z')], me: null, max: 5 };
  const drawnAt = Date.parse('2026-11-07T22:00:00Z');
  const openedAt = Date.parse('2026-11-08T09:00:00Z');
  function Probe({ drawn }: { drawn: boolean }) {
    return createElement('i', null, useSignal(nights, drawn) ? 'fire' : 'none');
  }
  afterEach(() => { vi.useRealTimers(); });

  it("is the same for the server and the browser's first drawing over its markup, whatever the browser's clock says", () => {
    const drawn = signalOf(nights.nights, drawnAt);
    vi.useFakeTimers();
    vi.setSystemTime(drawnAt);
    const server = renderToString(createElement(Probe, { drawn }));
    /* the browser's clock alone would stand the fire, which the markup has not got */
    vi.setSystemTime(openedAt);
    expect(signalOf(nights.nights)).toBe(true);
    /* hydration draws with the same server snapshot renderToString takes, so this is the browser's first drawing */
    const first = renderToString(createElement(Probe, { drawn }));
    expect(server).toBe('<i>none</i>');
    expect(first).toBe(server);
  });

  it("carries the page's answer either way, a fire drawn on its day as much as none", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse('2026-11-09T09:00:00Z'));
    expect(renderToString(createElement(Probe, { drawn: true }))).toBe('<i>fire</i>');
  });
});

describe('signalSpot', () => {
  /* a far ridge of four plateaus, 120 units each, the second the tallest */
  const far: Plateau[] = [[120, 40], [120, 60], [120, 30], [120, 50]];

  it('stands the fire whole on the plateau under the middle of the clear stretch', () => {
    /* 960 by 240: two pixels to a unit, the drawing exactly the box */
    const spot = signalSpot({ far, front: [], width: 960, height: 240, clear: 200, fire: 8 });
    expect(spot).toEqual({ x: 50, h: 40 });
  });

  it('keeps the fire on its plateau rather than over an edge', () => {
    /* the middle of the clear stretch, 250 px, is just past the first plateau's end at 240 px */
    const spot = signalSpot({ far, front: [], width: 960, height: 240, clear: 500, fire: 8 });
    expect(spot?.h).toBe(60);
    expect(spot!.x - 4).toBeGreaterThanOrEqual(120);
  });

  it('never stands the fire past the name or off the screen', () => {
    /* a narrow clear stretch: the fire's eight units are sixteen pixels */
    const spot = signalSpot({ far, front: [], width: 960, height: 240, clear: 20, fire: 8 });
    expect(spot).not.toBeNull();
    expect((spot!.x - 4) * 2).toBeGreaterThanOrEqual(0);
    expect((spot!.x + 4) * 2).toBeLessThanOrEqual(20);
    expect(signalSpot({ far, front: [], width: 960, height: 240, clear: 12, fire: 8 })).toBeNull();
  });

  it('reads the drawing as the screen crops it, centred, on a tall box', () => {
    /* 240 by 240: two pixels to a unit by the height, so only units 180 to 300 show */
    const spot = signalSpot({ far, front: [], width: 240, height: 240, clear: 40, fire: 4 });
    expect(spot).toEqual({ x: 190, h: 60 });
  });

  it('will not stand where a nearer ridge hides its foot', () => {
    const front: Plateau[][] = [[[120, 45]]];
    expect(signalSpot({ far, front, width: 960, height: 240, clear: 200, fire: 8 })).toBeNull();
    expect(signalSpot({ far, front: [[[120, 20]]], width: 960, height: 240, clear: 200, fire: 8 })).toEqual({ x: 50, h: 40 });
  });
});
