/* The coastline as 20 by 20 blocks, 50 columns by 32 rows over the
   1000 by 640 map. Generated once from the hand-drawn outline: 'L' land,
   'S' shore (land beside water), '.' water. */

export const MAP_CELL = 20;
export const MAP_COLS = 50;
export const MAP_ROWS = 32;

export const MAP_GRID: readonly string[] = [
  '..................................................',
  '..................................................',
  '..................................................',
  '.................SSSSSSSSSSSSS....................',
  '............SSSSSLLLLLLLLLLLLLSSS.................',
  '.........SSSLLLLLLLLLLLLLLLLLLLLLSS...............',
  '.......SSLLLLLLLLLLLLLLLLLLLLLLLLLLSS.............',
  '......SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS............',
  '.....SLLLLLLLLLLLLLLLLLLSSLLLLLLLLLLLLS...........',
  '....SLLLLLLLLLLLLLLLLLLS..SLLLLLLLLLLLLS..........',
  '....SLLLLLLLLLLLLLLLLLLLSSLLLLLLLLLLLLLS..........',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS..SSSS....',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLSSLLLS....',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLSLLLS....',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS.SSSS....',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS.........',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS.........',
  '...SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS.........',
  '...SLLLLLLLLLLLSLLLLLLLLLLLLLLLLLLLLLLLLS.........',
  '...SLLLLLLLLLLS.SLLLLLLLLLLLLLLLLLSLLLLS..........',
  '....SLLLLLLLLLLSLLLLLLLLLLLLLLLLLS.SLLLS..........',
  '....SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLSLLLLS..........',
  '.....SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS...........',
  '......SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS...........',
  '.......SLLLLLLLLLLLLLLLLLLLLLLLLLLLLLS......SS....',
  '........SSLLLLLLLLLLLLLLLLLLLLLLLLLLS.............',
  '...S......SSLLLLLLLLLLLLLLLLLLLLLLSS..............',
  '..SSS.......SSLLLLLLLLLLLLLLLLLLSS................',
  '..............SSSSLLLLLLLLLLLSSS..................',
  '..................SSSSSSSSSSS.....................',
  '..................................................',
  '..................................................',
];
