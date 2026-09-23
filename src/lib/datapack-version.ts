/* Reading an installed pack's version off the file name the server keeps it
   under. Those names carry the game version too, often right beside the
   pack's own ("Wabi-Sabi Structures-3.0.5-1.21.11 Datapack"), and sometimes
   only the game version ("call_of_the_king-1.21.9-10"). A game version must
   never be recorded as the pack's, so those are skipped, and a name where the
   two are run together with no way to tell them apart gives no answer. */

/* 1.13 to 1.29 with an optional patch, and the year-numbered releases (26.1, 26.1.1) */
const GAME = /^(1\.(1[3-9]|2\d)(\.\d+)?|2\d\.\d+(\.\d+)?)$/;
export const isGameVersion = (v: string) => GAME.test(v);

/* a run of numbers joined by dots, hyphens or underscores, optionally after a
   v or v. ("v3-0-1", "V.3.5.1", "3.0.5-1.21.11"), not starting or ending
   inside a longer number */
const RUN = /(?<![\d.])[vV]?\.?(\d+(?:[._-]\d+)+)(?![\d.])/g;

/** The first version-like string in `tail` that is not a game version. */
export function extractVersionFromTail(tail: string): string | null {
  for (const m of tail.matchAll(RUN)) {
    const run = m[1];
    /* with dots, the run is dotted versions joined by - or _; without, it is
       one version spelled with - or _ ("v3-0-1" is 3.0.1, "1_3" is 1.3) */
    const pieces = run.includes('.') ? run.split(/[_-]/) : [run.replace(/[_-]/g, '.')];
    for (const v of pieces) {
      if (!v.includes('.') || isGameVersion(v)) continue;
      const parts = v.split('.');
      /* "26-1-1-3-6": a game version and the pack's run together; where one
         ends is a guess, and a wrong guess would be saved as the version */
      if (parts.length > 3 && (isGameVersion(parts.slice(0, 2).join('.')) || isGameVersion(parts.slice(0, 3).join('.')))) continue;
      return v;
    }
  }
  return null;
}

/** The pack's version from its file name. Only the part after the pack's
    known name is searched, so a game version in brackets at the start
    ("[1.20.x] More Vanilla Paintings v1.0") is never in the way. */
export function extractVersion(filename: string, serverFile: string | undefined): string | null {
  const base = filename.replace(/\.zip$/i, '');
  if (serverFile) {
    const idx = base.toLowerCase().indexOf(serverFile.toLowerCase());
    if (idx >= 0) return extractVersionFromTail(base.slice(idx + serverFile.length));
  }
  return extractVersionFromTail(base);
}
