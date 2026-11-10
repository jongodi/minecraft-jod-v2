import { describe, expect, it } from 'vitest';
import meta from '../map-flight-meta.json';
import { FLIGHT_ON } from '../flight-meta';
import { FLIGHT } from '../map-flight';
import { bearing, headingOf } from '../compass';
import * as flight from '../map-flight';

/* The page lays out the runway from the meta at its first paint and reads the
   flight itself only when its code arrives; the two must say the same. */
describe('the flight\'s few bytes for the first paint', () => {
  it('says a flight is flown exactly when the flight file holds a whole one', () => {
    expect(FLIGHT_ON).toBe(FLIGHT !== null);
  });

  it('names the same recording as the flight file', () => {
    expect(meta.version).toBe(FLIGHT?.version ?? meta.version);
    expect(meta.frames).toBe(FLIGHT?.frames ?? meta.frames);
  });

  it('keeps the compass where the flight\'s callers found it', () => {
    expect(flight.headingOf).toBe(headingOf);
    expect(flight.bearing).toBe(bearing);
  });
});
