/* Whether the page has a flight down into the world, and no more: the page
   lays out the flight's runway from its first paint, while the flight itself
   and the cameras of its forty stills (map-flight.json, some 17 kB) arrive
   with the flight's own code, once the page is live. scripts/map-flight.mjs
   writes this beside the flight, and a test holds the two to each other. */
import meta from './map-flight-meta.json';

/** A flight was taken and is whole: the runway is laid and the flight is flown. */
export const FLIGHT_ON: boolean = meta.flown === true;
