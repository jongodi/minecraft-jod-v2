/* What the admin has changed and not saved, by panel. A reload or a closed
   tab asks through the browser's beforeunload; a link inside the app,
   signing out or another tab never fires it, so those ask here first. */
const dirty = new Set<string>();
/* each panel's unsaved work, as the question names it */
const WHAT: Record<string, string> = { map: 'kortinu', gallery: 'mynd í myndasafninu', datapacks: 'útgáfum pakkanna' };

/* a reload or a closed tab asks the browser's own question, for any panel */
const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };

export function setUnsaved(panel: string, on: boolean): void {
  const had = dirty.size > 0;
  if (on) dirty.add(panel); else dirty.delete(panel);
  if (!had && dirty.size > 0) window.addEventListener('beforeunload', warn);
  else if (had && dirty.size === 0) window.removeEventListener('beforeunload', warn);
}

export function hasUnsaved(panel: string): boolean {
  return dirty.has(panel);
}

/** True when it is fine to leave: nothing unsaved (in `panels`, or anywhere), or the admin said so. */
export function confirmLeave(panels?: string[]): boolean {
  const open = [...dirty].filter(p => !panels || panels.includes(p));
  if (open.length === 0) return true;
  return window.confirm(`Breytingar á ${open.map(p => WHAT[p] ?? p).join(' og ')} eru ekki vistaðar. Fara samt og henda þeim?`);
}
