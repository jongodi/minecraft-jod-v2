/* The time of year on the site, by the calendar in Iceland (which keeps UTC):

   - Hrekkjavaka, 25–31 October: jack-o'-lanterns on the mesas, a darker sunset.
   - Snow, 1 December – 6 January: on the mesas, the ridge and the ground, and
     falling over the sunset instead of the dust.
   - Gamlárskvöld and nýársdagur, 31 December and 1 January: fireworks over
     the campfire all day.
   - The Yule Lads, 12–24 December: the one who came to town that day hides
     somewhere on the page, in the order of the old verses.

   ?arstid= shows a season on any day, to see it before it comes:
   hrekkjavaka, snjor, aramot, or jol-1 … jol-13 for a Yule Lad (with the snow). */

export interface Season {
  halloween: boolean;
  snow:      boolean;
  fireworks: boolean;
  /** which Yule Lad is in town, 0 (Stekkjastaur) to 12 (Kertasníkir), or null */
  lad:       number | null;
}

export const NO_SEASON: Season = { halloween: false, snow: false, fireworks: false, lad: null };

export function seasonAt(d: Date): Season {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return {
    halloween: m === 10 && day >= 25,
    snow: m === 12 || (m === 1 && day <= 6),
    fireworks: (m === 12 && day === 31) || (m === 1 && day === 1),
    lad: m === 12 && day >= 12 && day <= 24 ? day - 12 : null,
  };
}

/** A season asked for by ?arstid=, or null for the calendar's own. */
export function seasonFromParam(v: string | null): Season | null {
  if (!v) return null;
  if (v === 'hrekkjavaka') return { ...NO_SEASON, halloween: true };
  if (v === 'snjor') return { ...NO_SEASON, snow: true };
  if (v === 'aramot') return { ...NO_SEASON, snow: true, fireworks: true };
  const lad = v.match(/^jol-(\d{1,2})$/);
  if (lad && Number(lad[1]) >= 1 && Number(lad[1]) <= 13) return { ...NO_SEASON, snow: true, lad: Number(lad[1]) - 1 };
  return null;
}

/** The thirteen, in the order they come to town from 12 December. */
export const YULE_LADS: readonly { name: string; line: string }[] = [
  { name: 'Stekkjastaur', line: 'Kom fyrstur, stirður á staurfótum, og reyndi að sjúga ærnar í fjárhúsunum.' },
  { name: 'Giljagaur', line: 'Faldi sig í giljum og laumaðist í fjósið eftir froðunni af mjólkinni.' },
  { name: 'Stúfur', line: 'Minnstur bræðranna. Kroppar það sem brennur við á pönnunum.' },
  { name: 'Þvörusleikir', line: 'Sleikir þvöruna þegar enginn sér til. Hann er afskaplega mjór.' },
  { name: 'Pottaskefill', line: 'Skefur pottana innan þegar enginn fylgist með.' },
  { name: 'Askasleikir', line: 'Felur sig undir rúmum og sleikir askana sem settir eru á gólfið.' },
  { name: 'Hurðaskellir', line: 'Skellir hurðum um miðjar nætur svo enginn sefur.' },
  { name: 'Skyrgámur', line: 'Étur skyrið beint upp úr sánum þangað til hann stendur á blístri.' },
  { name: 'Bjúgnakrækir', line: 'Klifrar upp í rjáfrið og krækir sér í bjúgun sem hanga þar.' },
  { name: 'Gluggagægir', line: 'Gægist inn um gluggana eftir einhverju fallegu að taka.' },
  { name: 'Gáttaþefur', line: 'Nefið stórt og næmt: hann finnur lyktina af laufabrauðinu langar leiðir.' },
  { name: 'Ketkrókur', line: 'Rennir krók niður um strompinn og krækir sér í hangikjötið.' },
  { name: 'Kertasníkir', line: 'Kemur síðastur, á aðfangadag, og eltir börnin til að ná í kertin þeirra.' },
];
