import { describe, expect, it } from 'vitest';
import { bearing, cameraAt, cameraMatrix, cardShot, CLOUD_BANDS, CLOUD_CELL, CLOUD_GONE, CLOUD_THIN, CLOUD_Y, cloudAt, cloudDeck, clouded, cloudThinned, cover, crossing, deckHomography, depthScale, easeFlight, facing, fetchOrder, FLIGHT, flightProgress, flightShape, follow, frameFor, heading, headingOf, horizonPoint, lensOf, planeHomography, project, projectPoint, warp, type CloudDeck, type Flight, type FlightShot } from '../map-flight';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/* w = z, as a camera at the origin looking down +z would give */
const DEPTH = (() => { const m = [...IDENTITY]; m[15] = 0; m[11] = 1; return m; })();

describe('project', () => {
  it('pins a place on its lantern: the middle of the block, a block up', () => {
    /* identity: the screen is the world's x and y, -1 to 1 across the frame */
    expect(project(IDENTITY, { x: -1, y: -1, z: 0 })).toEqual({ x: 0.25, y: 0.5 });
  });

  it('divides by depth', () => {
    const p = projectPoint(DEPTH, [3.5, 2, 7.5]);
    expect(p!.x).toBeCloseTo((3.5 / 7.5 + 1) / 2);
    expect(p!.y).toBeCloseTo((1 - 2 / 7.5) / 2);
  });

  it('leaves out a place behind the camera', () => {
    expect(project(DEPTH, { x: 0, y: 0, z: -10 })).toBeNull();
  });
});

describe('the camera between stills', () => {
  const shot = (d: number, look: [number, number, number]): FlightShot => ({ m: DEPTH, eye: [look[0], look[1] + d, look[2]], look, d });

  it('closes the distance evenly in proportion, and moves its point evenly', () => {
    const c = cameraAt(shot(400, [0, 64, 0]), shot(100, [40, 64, 0]), 0.5);
    expect(c.d).toBeCloseTo(200);
    expect(c.look).toEqual([20, 64, 0]);
  });

  it('grows a still by how much nearer the camera stands, about the point it now looks at', () => {
    /* in DEPTH the point (0, 0, 10) is the middle of the still */
    const w = warp(shot(300, [0, 0, 10]), [0, 0, 10], 100, 1280, 720);
    expect(w.scale).toBeCloseTo(3);
    expect(w.from).toEqual({ x: 640, y: 360 });
  });

  it('leaves a still as it is at its own camera', () => {
    const s = shot(250, [0, 0, 10]);
    const w = warp(s, s.look, s.d, 1280, 720);
    expect(w.scale).toBe(1);
    expect(w.from).toEqual({ x: 640, y: 360 });
  });
});

describe('the flight', () => {
  it('fetches the overview first, then the landing, then ever finer between', () => {
    const order = fetchOrder(40);
    expect(order.slice(0, 3)).toEqual([0, 39, 32]);
    expect(new Set(order).size).toBe(40);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(40).keys()]);
  });

  it('holds a moment at the overview and settles on landing', () => {
    expect(easeFlight(0)).toBe(0);
    expect(easeFlight(1)).toBe(1);
    expect(easeFlight(0.5)).toBe(0.5);
    expect(easeFlight(0.05)).toBeLessThan(0.05);
    expect(easeFlight(0.95)).toBeGreaterThan(0.95);
  });

  it('sets off while the frame rises and lands where the stay begins', () => {
    /* the world at 900, held 56 from the top, setting off 400 early, landing 800 after it is held */
    expect(flightProgress(444, 900, 56, 400, 800)).toBe(0);
    expect(flightProgress(0, 900, 56, 400, 800)).toBe(0);
    expect(flightProgress(844, 900, 56, 400, 800)).toBeCloseTo(400 / 1200);
    expect(flightProgress(1644, 900, 56, 400, 800)).toBe(1);
    /* the stay past the landing is still landed */
    expect(flightProgress(2000, 900, 56, 400, 800)).toBe(1);
    expect(flightProgress(500, 900, 56, 0, 0)).toBe(1);
  });

  it('glides the camera after the scroll and arrives exactly', () => {
    const one = follow(0, 1, 16);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(0.2);
    /* most of the way in a few tenths of a second, the same however the frames fall */
    let a = 0; for (let i = 0; i < 30; i++) a = follow(a, 1, 10);
    let b = 0; for (let i = 0; i < 10; i++) b = follow(b, 1, 30);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeGreaterThan(0.85);
    let c = 0; for (let i = 0; i < 200 && c !== 1; i++) c = follow(c, 1, 16);
    expect(c).toBe(1);
    expect(follow(0.4, 0.2, 16)).toBeLessThan(0.4);
    expect(follow(0.3, 0.3, 16)).toBe(0.3);
  });

  it('reads the way the camera faces by the game\'s compass', () => {
    expect(facing([0, 100, 0], [0, 64, -50])).toBe('north');
    expect(facing([0, 100, 0], [0, 64, 50])).toBe('south');
    expect(facing([0, 100, 0], [50, 64, 10])).toBe('east');
    expect(facing([0, 100, 0], [-50, 64, -10])).toBe('west');
  });
});

describe('the cloud deck', () => {
  const flight = FLIGHT!;
  /* points round what a still looks at, near enough to be in front of the camera from the overview to the landing */
  const around = (s: FlightShot) => [s.look, [s.look[0] - 30, s.look[1] + 20, s.look[2] + 25], [s.look[0] + 40, s.look[1] - 10, s.look[2] - 30], [s.look[0] + 25, s.look[1] + 30, s.look[2] + 10]];

  it('is laid on a flight that has been taken', () => {
    expect(flight).not.toBeNull();
  });

  it('rebuilds the camera of every still from where it stood and looked, and its lens', () => {
    for (const set of [flight.wide, flight.tall!]) {
      const lens = lensOf(set.shots[0].m);
      for (const k of [0, 14, 22, set.shots.length - 1]) {
        const s = set.shots[k];
        const m = cameraMatrix(s.eye, s.look, lens);
        for (const point of around(s)) {
          const a = projectPoint(s.m, point)!, b = projectPoint(m, point)!;
          /* within a pixel or so of a 1280 still: the file keeps where the camera stood to a tenth of a block */
          expect(Math.abs(a.x - b.x)).toBeLessThan(2e-3);
          expect(Math.abs(a.y - b.y)).toBeLessThan(2e-3);
        }
      }
    }
  });

  it('takes a point of the level plane where projectPoint takes it', () => {
    const s = flight.wide.shots[10];
    const h = planeHomography(s.m, CLOUD_Y);
    for (const [x, z] of [[-7000, -8900], [-6950, -9000], [-6800, -8850]]) {
      const X = h[0] * x + h[1] * z + h[2], Y = h[3] * x + h[4] * z + h[5], W = h[6] * x + h[7] * z + h[8];
      const p = projectPoint(s.m, [x, CLOUD_Y, z])!;
      expect((X / W + 1) / 2).toBeCloseTo(p.x, 9);
      expect((1 - Y / W) / 2).toBeCloseTo(p.y, 9);
    }
  });

  it("sets the deck's picture on the frame where the camera sees the cells", () => {
    const deck: CloudDeck = { x: -7000, z: -9000, size: 40, cells: new Uint8Array(1600) };
    const s = flight.wide.shots[6];
    const still = flight.wide;
    const rect = cover(1440, 844, still.width, still.height);
    const h = deckHomography(s.m, deck, still, rect);
    for (const [u, v] of [[0, 0], [12, 30], [40, 40], [25.5, 3]]) {
      const w = h[6] * u + h[7] * v + h[8];
      expect(w).toBeGreaterThan(0);
      const p = projectPoint(s.m, [deck.x + u * CLOUD_CELL, CLOUD_Y, deck.z + v * CLOUD_CELL])!;
      expect((h[0] * u + h[1] * v + h[2]) / w).toBeCloseTo(rect.x + p.x * rect.width, 6);
      expect((h[3] * u + h[4] * v + h[5]) / w).toBeCloseTo(rect.y + p.y * rect.height, 6);
    }
  });

  it('keeps the depth of what is in front of the camera above nought, however it is scaled', () => {
    /* the camera just over the plane, the deck's corner behind it */
    const eye = [-7040, 200, -8948], look = [-6905, 57, -8915];
    const m = cameraMatrix(eye, look, lensOf(flight.wide.shots[0].m));
    const deck: CloudDeck = { x: -7454, z: -9438, size: 88, cells: new Uint8Array(88 * 88) };
    const h = deckHomography(m, deck, flight.wide, cover(1440, 844, 1280, 720));
    const depth = (x: number, z: number) => { const u = (x - deck.x) / CLOUD_CELL, v = (z - deck.z) / CLOUD_CELL; return h[6] * u + h[7] * v + h[8]; };
    expect(depth(-6900, -8940)).toBeGreaterThan(0);
    expect(depth(-7400, -8940)).toBeLessThan(0);
  });

  it('covers about a quarter of the world, the same every time, and none of its edge', () => {
    const deck = cloudDeck(flight);
    expect(deck.size).toBeGreaterThan(40);
    const all = deck.cells.reduce((n, c) => n + (c > 0 ? 1 : 0), 0);
    expect(all / deck.cells.length).toBeGreaterThan(0.2);
    expect(all / deck.cells.length).toBeLessThanOrEqual(0.3);
    expect(cloudDeck(flight).cells).toEqual(deck.cells);
    for (let i = 0; i < deck.size; i++) {
      for (const [a, b] of [[i, 0], [i, deck.size - 1], [0, i], [deck.size - 1, i]]) expect(deck.cells[b * deck.size + a]).toBe(0);
    }
  });

  it('thins a cloud from its edges: every band holds a share of the cells', () => {
    const deck = cloudDeck(flight);
    const count = (b: number) => deck.cells.reduce((n, c) => n + (c === b ? 1 : 0), 0);
    const filled = deck.cells.reduce((n, c) => n + (c > 0 ? 1 : 0), 0);
    for (let b = 1; b <= CLOUD_BANDS; b++) {
      expect(count(b) / filled).toBeGreaterThan(0.15);
      expect(count(b) / filled).toBeLessThan(0.35);
    }
  });

  it('never hangs a cell between either camera and the town it lands on', () => {
    const deck = cloudDeck(flight);
    for (const set of [flight.wide, flight.tall!]) {
      const last = set.shots.length - 1;
      const town = set.shots[last].look;
      /* finer than the deck was cleared at, and out across the town the landing takes in */
      for (let at = 0; at <= last; at += 0.1) {
        const k = Math.min(last, Math.floor(at));
        const { eye } = cameraAt(set.shots[k], set.shots[Math.min(last, k + 1)], at - k);
        for (const [dx, dz] of [[0, 0], [8, 8], [-8, 6], [45, -20], [-30, 40], [0, -55]]) expect(clouded(deck, eye, [town[0] + dx, town[1], town[2] + dz], 0)).toBe(false);
      }
    }
  });

  it('finds where the line from the camera crosses the plane', () => {
    expect(crossing([0, 292, 0], [100, 92, 50])).toEqual([50, 25]);
    /* under the deck, or looking up at something over it, there is no crossing */
    expect(crossing([0, 150, 0], [100, 60, 0])).toBeNull();
    expect(crossing([0, 300, 0], [100, 250, 0])).toBeNull();
  });

  it('reads the cell over a point of the plane, and clear sky off the deck', () => {
    const cells = new Uint8Array(4);
    cells[3] = 2;
    const deck: CloudDeck = { x: 0, z: 0, size: 2, cells };
    expect(cloudAt(deck, 13, 13)).toBe(2);
    expect(cloudAt(deck, 11.9, 13)).toBe(0);
    expect(cloudAt(deck, -1, 13)).toBe(0);
    expect(cloudAt(deck, 25, 13)).toBe(0);
    /* a lantern under that cell is hidden, until its band is gone */
    expect(clouded(deck, [0, 292, 0], [12, 92, 0], 0)).toBe(false);
    expect(clouded(deck, [12, 292, 12], [14, 92, 14], 0)).toBe(true);
    expect(clouded(deck, [12, 292, 12], [14, 92, 14], 2)).toBe(false);
  });

  it('thins in whole steps over the last stretch above it, and is gone before the camera reaches it', () => {
    expect(cloudThinned(400)).toBe(0);
    expect(cloudThinned(CLOUD_THIN)).toBe(0);
    expect(cloudThinned(CLOUD_THIN - 0.5)).toBe(1);
    expect(cloudThinned(CLOUD_GONE)).toBe(CLOUD_BANDS);
    expect(cloudThinned(CLOUD_Y)).toBe(CLOUD_BANDS);
    let was = 0;
    for (let y = CLOUD_THIN; y >= CLOUD_GONE; y -= 0.5) {
      const n = cloudThinned(y);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(was);
      was = n;
    }
    expect(CLOUD_GONE).toBeGreaterThan(CLOUD_Y);
  });
});

describe('cover', () => {
  it('fills a taller box by height, cut evenly at the sides', () => {
    expect(cover(450, 800, 1280, 720)).toEqual({ x: (450 - 800 * 16 / 9) / 2, y: 0, width: 800 * 16 / 9, height: 800 });
  });

  it('fills a wider box by width, cut a little more off the foot than the top', () => {
    const r = cover(1600, 600, 1280, 720);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(900);
    expect(r.y).toBeCloseTo(-300 * 0.45);
  });
});

describe('flightShape', () => {
  const set = { width: 1, height: 1, shots: [] };
  it('takes the tall flight for a frame on end, where there is one', () => {
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 390, 700)).toBe('tall');
    expect(flightShape({ version: 'v', frames: 2, wide: set } as Flight, 390, 700)).toBe('wide');
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 1440, 800)).toBe('wide');
  });
});

describe('the locator bar and the lanterns', () => {
  it('reads a bearing as the game faces: north is negative Z, east to its right', () => {
    const north = headingOf(0);
    expect(north[0]).toBeCloseTo(0);
    expect(north[1]).toBeCloseTo(-1);
    expect(bearing([0, 0], north, [0, -100]).angle).toBeCloseTo(0);
    expect(bearing([0, 0], north, [100, 0]).angle).toBeCloseTo(Math.PI / 2);
    expect(bearing([0, 0], north, [-100, 0]).angle).toBeCloseTo(-Math.PI / 2);
    expect(Math.abs(bearing([0, 0], north, [0, 100]).angle)).toBeCloseTo(Math.PI);
    expect(bearing([0, 0], north, [30, -40]).blocks).toBeCloseTo(50);
  });

  it('takes the way the camera faces from where it stands and looks', () => {
    const [x, z] = heading([0, 300, 0], [0, 64, -40]);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
    expect(heading([0, 0, 0], [10, -5, 0])).toEqual([1, 0]);
  });

  it('draws a lantern smaller the farther off it stands, within bounds', () => {
    expect(depthScale(140)).toBeCloseTo(1);
    expect(depthScale(1000)).toBe(0.5);
    expect(depthScale(20)).toBe(1.1);
    expect(depthScale(280)).toBeCloseTo(0.5);
  });

  it('puts the horizon far ahead at the camera\'s own height', () => {
    const [x, y, z] = horizonPoint([0, 300, 0], [0, 64, -40]);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(300);
    expect(z).toBeLessThan(-99000);
  });
});

describe('a corner of the world on a wall', () => {
  /* a camera that sees x and y from -1 to 1 at a distance, wider as it backs off */
  const at = (span: number): FlightShot => {
    const m = [...IDENTITY];
    m[0] = 1 / span; m[5] = 1 / span;
    return { m, eye: [0, 0, 0], look: [0, 0, 0], d: span };
  };
  const set = { width: 1280, height: 720, shots: [at(100), at(10), at(3)] };

  it('takes the still that has them all, as close as it still has them', () => {
    const pick = frameFor(set, [[-5, -5, 0], [5, 5, 0]])!;
    expect(pick.k).toBe(1);
    expect(pick.at.every(a => a !== null)).toBe(true);
  });

  it('takes the still with the most of them when none has all', () => {
    const pick = frameFor(set, [[-5, 0, 0], [5, 0, 0], [500, 0, 0]])!;
    expect(pick.at.filter(Boolean)).toHaveLength(2);
    expect(pick.at[2]).toBeNull();
  });

  it('has nothing to show for no places', () => {
    expect(frameFor(set, [])).toBeNull();
  });
});

describe("a place's card seen from the air", () => {
  const at = (span: number): FlightShot => {
    const m = [...IDENTITY];
    m[0] = 1 / span; m[5] = 1 / span;
    return { m, eye: [0, 0, 0], look: [0, 0, 0], d: span };
  };
  /* the overview, then nearer and nearer */
  const set = { width: 1280, height: 720, shots: [at(100), at(10), at(3)] };
  const CARD = { width: 1200, height: 630 };
  const anywhere = () => true;

  it('takes the nearest still, cropped to bring the place up toward the aim', () => {
    const s = cardShot(set, [0, 0, 0], CARD, anywhere)!;
    expect(s.k).toBe(2);
    expect(s.width).toBeCloseTo(1200);
    expect(s.height).toBeCloseTo(675);
    /* the still is 45 px taller than the card, all of it spent lifting the place */
    expect(s.top).toBeCloseTo(-45);
    expect(s.x).toBeCloseTo(600);
    expect(s.y).toBeCloseTo(337.5 - 45);
  });

  it('takes the nearest still where the lantern stands clear of the postcard', () => {
    /* far left: the nearest still puts it under the postcard, the next one clear of it */
    const s = cardShot(set, [-2.4, 0, 0], CARD, (x) => x >= 400 && x <= 700)!;
    expect(s.k).toBe(1);
    expect(s.x).toBeGreaterThanOrEqual(400);
  });

  it('draws a still a little closer when that brings the lantern clear', () => {
    /* three quarters across the nearest still: 900 on the card at the least
       scale, short of the clear ground, which starts at 920 */
    const s = cardShot(set, [1.5, 1.5, 0], CARD, (x, y) => x >= 920 && y <= 250)!;
    expect(s.k).toBe(2);
    expect(s.width).toBeGreaterThan(1200);
    expect(s.width).toBeLessThanOrEqual(1280 * 1.2 + 1e-9);
    expect(s.x).toBeGreaterThanOrEqual(920);
    expect(s.y).toBeLessThanOrEqual(250);
  });

  it('falls back to the nearest still that has it on the card at all', () => {
    expect(cardShot(set, [0, 0, 0], CARD, () => false)!.k).toBe(2);
  });

  it("never crops past the still's edge", () => {
    for (const point of [[0, 0, 0], [2.9, 2.9, 0], [-2.9, -2.9, 0]]) {
      const s = cardShot(set, point, CARD, anywhere)!;
      expect(s.left).toBeLessThanOrEqual(0);
      expect(s.left).toBeGreaterThanOrEqual(CARD.width - s.width - 1e-9);
      expect(s.top).toBeLessThanOrEqual(0);
      expect(s.top).toBeGreaterThanOrEqual(CARD.height - s.height - 1e-9);
    }
  });

  it('has no card from the air for a place no still shows', () => {
    expect(cardShot(set, [500, 0, 0], CARD, anywhere)).toBeNull();
  });
});
