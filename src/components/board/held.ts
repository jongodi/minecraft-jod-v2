import { andList, plural } from '@/lib/format';

/** Who said they would come to a held night and did not, as its slip on the
    board prints them (Notice.tsx), the verb agreeing with how many they
    were: "sagðist mæta en kom ekki: fafnir1994" for one, "sögðust mæta en
    komu ekki: fafnir1994 og IMlonely" for more, as the count of those who
    came beside it says "1 mætti" and "3 mættu". */
export function noShowsLine(names: readonly string[]): string {
  return `${plural(names.length, 'sagðist mæta en kom ekki', 'sögðust mæta en komu ekki')}: ${andList(names)}`;
}
