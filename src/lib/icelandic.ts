/** Icelandic display labels; stored identifiers stay unchanged. */
const CATEGORIES: Record<string, string> = {
  BUILD: 'Byggingar', COMBAT: 'Bardagar', SURVIVAL: 'Lífsbarátta',
  QOL: 'Þægindi', STRUCTURE: 'Mannvirki', SOCIAL: 'Samspil',
  LOOT: 'Fengur', TRADE: 'Viðskipti', CRAFT: 'Smíðar', WORLD: 'Heimurinn',
};
export const categoryLabel = (value: string): string => CATEGORIES[value] ?? value;
const MAP_LABELS: Record<string, string> = {
  pin: 'Pinni', zone: 'Svæði', land: 'Landspilda', lake: 'Vatn', mountain: 'Fjall',
  river: 'Á', road: 'Vegur', border: 'Mörk', surface: 'Á yfirborði',
  underground: 'Neðanjarðar', island: 'Eyja', aerial: 'Úr lofti',
  blue: 'Blár', orange: 'Appelsínugulur', green: 'Grænn', purple: 'Fjólublár',
};
export const mapLabel = (value: string): string => MAP_LABELS[value] ?? value;

const VERDICTS: Record<string, string> = { used: 'Í notkun', review: 'Yfirferð', 'safe-remove': 'Má fjarlægja', error: 'Villa' };
export const verdictLabel = (value: string): string => VERDICTS[value] ?? value;
const CONFIDENCE: Record<string, string> = { certain: 'Örugg', high: 'Mikil', medium: 'Miðlungs', low: 'Lítil' };
export const confidenceLabel = (value: string): string => CONFIDENCE[value] ?? value;
const KINDS: Record<string, string> = {
 texture: 'áferð', texture_meta: 'hreyfilýsigögn', model: 'líkan', blockstate: 'kubbaástand',
 item_definition: 'hlutaskilgreining', font: 'letur', particle: 'ögn', equipment: 'búnaður',
 atlas: 'áferðarsafn', sound: 'hljóð', sounds_json: 'hljóðaskrá', lang: 'tungumálaskrá',
 pack_meta: 'pakkalýsigögn', pack_png: 'pakkamynd', shader: 'skyggir', text: 'texti', other: 'annað',
};
export const assetKindLabel = (value: string): string => KINDS[value] ?? value;

const LEGACY_CONTENT: Record<string, string> = {
  "BALLOON PARADISE": "Blöðruparadís",
  "CITY HALL": "Ráðhúsið",
  "FAR AWAY LANDS": "Fjarlæg lönd",
  "FARAWAY LANDS": "Fjarlæg lönd",
  "GOÐI CASTLE": "Kastali Goða",
  "J CLUB": "J-klúbburinn",
  "JOÐ VILLE": "Joðbær",
  "MUSHROOM ISLAND": "Sveppaeyja",
  "NEW BASE": "Nýja byggðin",
  "NEW BASE AT NIGHT": "Nýja byggðin að nóttu",
  "NEW BASE · COASTAL": "Nýja byggðin · við ströndina",
  "NEW BASE · FROM ABOVE": "Nýja byggðin · úr lofti",
  "NEW BASE · MAIN STREET": "Nýja byggðin · aðalgatan",
  "NEW BASE · NIGHT": "Nýja byggðin · að nóttu",
  "NEW BASE, COASTAL": "Nýja byggðin, við ströndina",
  "NEW BASE, FROM ABOVE": "Nýja byggðin, úr lofti",
  "NEW BASE, MAIN STREET": "Nýja byggðin, aðalgatan",
  "NEW TOWN": "Nýibær",
  "OLD BASE": "Gamla byggðin",
  "OLD BASE · SPAWN": "Gamla byggðin · upphafsstaður",
  "OLD BASE, SPAWN": "Gamla byggðin, upphafsstaður",
  "PINK ESTATE": "Bleika setrið",
  "POTIONS TOWER": "Seyðaturninn",
  "RIVER": "Á",
  "SECRET UNDERGROUND CLUB": "Leynilegur klúbbur neðanjarðar",
  "SHROOMY HEAVEN": "Sveppaparadís",
  "THE VILLAGE": "Þorpið",
  "TOWN HALL": "Ráðhúsið",
  "VENICE": "Feneyjar",
  "A GRAVE MARKS YOUR DEATH — YOUR LOOT STAYS SAFE": "Gröf birtist þar sem þú deyrð og dótið þitt helst öruggt",
  "COLOR-CODED TEAM NAMETAGS VISIBLE ABOVE PLAYERS": "Sýnir lituð liðsnöfn fyrir ofan leikmenn",
  "COMPLETELY REDESIGNED MINESHAFT STRUCTURES TO EXPLORE": "Alveg endurhannaðar námur til að kanna",
  "CREATE CUSTOM PIXEL-ART PAINTINGS IN-GAME": "Búðu til þín eigin myndpunktamálverk í leiknum",
  "FLOATING HOLOGRAPHIC TEXT DISPLAYED!": "Sýnir svífandi textamerki",
  "JAPANESE-INSPIRED STRUCTURES SCATTERED ACROSS THE WORLD": "Mannvirki innblásin af Japan á víð og dreif um heiminn",
  "MAKES MOBS HUGE!": "Gerir verurnar RISASTÓRAR!",
  "MORE VANILLA PAINTINGS": "Fleiri málverk í stíl við upprunalega leikinn",
  "NEW ITEMS, RECIPES AND MECHANICS THAT FEEL VANILLA": "Nýir hlutir, uppskriftir og eiginleikar í anda upprunalega leiksins",
  "OVERHAULED DUNGEONS AND TAVERN STRUCTURES IN WORLDGEN": "Ný og endurbætt dýflissu- og kráarmannvirki í heiminum",
  "PLACE WAYSTONES TO FAST-TRAVEL ACROSS THE WORLD": "Settu niður ferðasteina til að ferðast hratt um heiminn",
  "PLANT BANNERS AS FLAGS ANYWHERE IN THE WORLD": "Settu fána niður hvar sem er í heiminum",
  "SEE OTHER PLAYERS' HEALTH IN TAB LIST": "Sjáðu heilsu annarra leikmanna í listanum sem opnast með Tab",
  "SPEEDY GHASTS!": "Elddraugar á fullri ferð!"
};
export function localizeContent(value: string): string {
  return LEGACY_CONTENT[value.trim().toUpperCase()] ?? value;
}

/** Keep library/browser errors in the same language as the surrounding UI. */
export function errorMessage(error: unknown, fallback = 'Óvænt villa kom upp. Reyndu aftur.'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /[áðéíóúýþæö]/i.test(message) ? message : fallback;
}
export function jsonErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const position = message.match(/position (\d+)/i)?.[1];
  const reason = /unexpected end|unterminated/i.test(message)
    ? 'JSON-skráin er ófullgerð.'
    : /property name|double.quoted/i.test(message)
      ? 'Heiti JSON-eiginleika þarf að vera innan tvöfaldra gæsalappa.'
      : /comma|delimiter/i.test(message)
        ? 'Kommu eða lokunartákn vantar í JSON.'
        : 'Ógilt JSON. Athugaðu gæsalappir, kommur og sviga.';
  return position ? `${reason} Staðsetning: ${position}.` : reason;
}
