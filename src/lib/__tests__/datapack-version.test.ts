import { describe, expect, it } from 'vitest';
import { extractVersion } from '@/lib/datapack-version';

/* The server's own folder names, as recorded beside each pack in src/data/datapacks.ts. */
describe('extractVersion', () => {
  it('reads the pack\'s version from the names the server uses', () => {
    expect(extractVersion('[1.20.x] More Vanilla Paintings v1.0', 'More Vanilla Paintings')).toBe('1.0');
    expect(extractVersion('banner-flags-v3-0-1', 'banner-flags')).toBe('3.0.1');
    expect(extractVersion('ColeredNameTeams (1.0.3)', 'ColeredNameTeams')).toBe('1.0.3');
    expect(extractVersion('Dungeons and Taverns v5.2.0.zip', 'Dungeons and Taverns')).toBe('5.2.0');
    expect(extractVersion('GM-1_3', 'GM-')).toBe('1.3');
    expect(extractVersion('Graves v3.0.0 [1.21.11]', 'Graves')).toBe('3.0.0');
    expect(extractVersion('Health-2.2.0', 'Health')).toBe('2.2.0');
    expect(extractVersion('mc_paint_v1.7.0_data_pack', 'mc_paint')).toBe('1.7.0');
    expect(extractVersion('pk_waystones_V.3.5.1_mc_26.1', 'pk_waystones')).toBe('3.5.1');
    expect(extractVersion('Wabi-Sabi Structures-3.0.5-1.21.11 Datapack', 'Wabi-Sabi Structures')).toBe('3.0.5');
  });

  it('never records a game version as the pack\'s', () => {
    expect(extractVersion('call_of_the_king-1.21.9-10', 'call_of_the_king')).toBeNull();
    expect(extractVersion('gm4_holographic_tags_26_1', 'gm4_holographic_tags')).toBeNull();
  });

  it('gives no answer where a game version and the pack\'s are run together', () => {
    expect(extractVersion('hopobettermineshaft-26-1-1-3-6', 'hopobettermineshaft')).toBeNull();
  });
});
