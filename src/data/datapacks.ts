// The datapacks on the server. Edit this list and nothing else; the site
// reads it directly. `blurb` is what it does, in Icelandic, eight words at
// most. `version` is what is installed. `modrinth` is the project slug, so
// the name links to the pack's page.

export interface Datapack {
  name: string;
  blurb: string;
  version: string;
  modrinth: string;
}

export const DATAPACKS: readonly Datapack[] = [
  { name: 'MVP', blurb: 'Fleiri málverk í vanilla-stíl', version: '1.0', modrinth: 'mvp' },
  { name: 'Banner Flags', blurb: 'Fánar úr borðum, hvar sem er', version: '3.0.1', modrinth: 'banner-flags' },
  { name: 'Call of the King', blurb: 'Skepnur verða risastórar', version: '1.1', modrinth: 'call-of-the-king' },
  { name: 'Colored Name Teams', blurb: 'Litamerkt liðsnöfn yfir leikmönnum', version: '1.0.3', modrinth: 'colorednameteams' },
  { name: 'Dungeons & Taverns', blurb: 'Nýjar dýflissur og krár í heiminum', version: '5.2.0', modrinth: 'dungeons-and-taverns' },
  { name: 'Ghast Mayhem', blurb: 'Hraðskreiðir ghastar', version: '1.3', modrinth: 'ghast-mayhem' },
  { name: 'Holographic Tags', blurb: 'Svífandi texti hvar sem er', version: '1.6.1', modrinth: 'gm4-holographic-tags' },
  { name: 'LY Graves', blurb: 'Gröf við dauða, dótið geymist', version: '3.0.0', modrinth: 'ly-graves' },
  { name: 'Show Player Health', blurb: 'Líf annarra sést í TAB-listanum', version: '2.2.0', modrinth: 'show-player-health' },
  { name: 'Better Mineshaft', blurb: 'Endurhönnuð námugöng', version: '1.3.6', modrinth: 'hopo-better-mineshaft' },
  { name: 'MC Paint', blurb: 'Teiknaðu eigin málverk í leiknum', version: '1.7.0', modrinth: 'mc-paint' },
  { name: 'Waystones', blurb: 'Vegsteinar til að ferðast hratt', version: '3.5.1', modrinth: 'waystones-data-pack' },
  { name: 'Vanilla Refresh', blurb: 'Nýir hlutir og uppskriftir, samt vanilla', version: '1.4.30', modrinth: 'vanilla-refresh' },
  { name: 'Wabi-Sabi Structures', blurb: 'Japönsk mannvirki á víð og dreif', version: '3.0.5', modrinth: 'wabi-sabi-structures' },
];
