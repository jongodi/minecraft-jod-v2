// The screenshots. Alt text describes the picture in Icelandic; title and
// place are what the players call it. `span` is the width on the desktop grid
// out of 12 columns; `pin` links the picture to a place on the map.

export interface Shot {
  src: string;
  width: number;
  height: number;
  title: string;
  place: string;
  alt: string;
  span: 4 | 5 | 6 | 7 | 8 | 12;
  pin: number;
}

export const GALLERY: readonly Shot[] = [
  { src: '/screenshots/the-castle.webp', width: 1920, height: 1009, title: 'Goði Castle', place: 'Langt í burtu', alt: 'Kastali með turnum handan vatns, brú yfir og grænir bakkar', span: 12, pin: 1 },
  { src: '/screenshots/spawn-hill.webp', width: 1920, height: 1009, title: 'Joð Ville', place: 'Gamla basið, spawn', alt: 'Hæð með háum dökkum turni, kirsuberjatré og garðar í hlíðinni', span: 8, pin: 2 },
  { src: '/screenshots/cherry-estate.webp', width: 1920, height: 1009, title: 'Pink Estate', place: 'Gamla basið', alt: 'Bleikur kirsuberjaskógur kringum stórt ljóst hús undir heiðum himni', span: 4, pin: 3 },
  { src: '/screenshots/j-club.webp', width: 1920, height: 1009, title: 'J Club', place: 'Leynilegur klúbbur neðanjarðar', alt: 'Dansgólf neðanjarðar í fjólubláu og bleiku ljósi, J Club skilti á vegg', span: 4, pin: 4 },
  { src: '/screenshots/mushroom-isle.webp', width: 1920, height: 1009, title: 'Mushroom Island', place: 'Úti á hafi', alt: 'Rauðir risasveppir á sveppaeyju, þoka yfir sjónum', span: 4, pin: 5 },
  { src: '/screenshots/the-hall.webp', width: 1920, height: 1009, title: 'Potions Tower', place: 'Nýja basið', alt: 'Steinsalur innandyra með lituðum gluggum, lugtum og hillum', span: 4, pin: 6 },
  { src: '/screenshots/waterfront.webp', width: 1624, height: 853, title: 'Venice', place: 'Nýja basið, við sjóinn', alt: 'Bær með turnum úti í sjó í rökkri og þoku', span: 5, pin: 7 },
  { src: '/screenshots/the-tavern.webp', width: 1920, height: 1009, title: 'City Hall', place: 'Nýja basið', alt: 'Dökkt timburhús með turni í kvöldsól, lugtir og blómaengi', span: 7, pin: 8 },
  { src: '/screenshots/the-village.webp', width: 1920, height: 1009, title: 'The Village', place: 'Nýja basið, aðalgatan', alt: 'Þorp séð að ofan, aðalgata með básum og timburhúsum', span: 6, pin: 9 },
  { src: '/screenshots/balloon-island.webp', width: 1920, height: 1009, title: 'Balloon Paradise', place: 'Nýja basið, séð að ofan', alt: 'Loftbelgir yfir bænum í rökkri, séð ofan frá', span: 6, pin: 10 },
  { src: '/screenshots/night-sky.webp', width: 1920, height: 1009, title: 'New Town', place: 'Nýja basið, að nóttu', alt: 'Bærinn að nóttu, lýstir loftbelgir svífa undir stjörnum', span: 12, pin: 11 },
];
