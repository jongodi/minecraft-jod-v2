/* What the admin has changed and not saved, by panel. The browser's own
   beforeunload covers a reload or a closed tab, but a link inside the app or
   signing out never fires it, so those ask here first. */
const dirty = new Set<string>();

export function setUnsaved(panel: string, on: boolean): void {
  if (on) dirty.add(panel); else dirty.delete(panel);
}

export function hasUnsaved(panel: string): boolean {
  return dirty.has(panel);
}

/** True when it is fine to leave: nothing unsaved, or the admin said so. */
export function confirmLeave(): boolean {
  return dirty.size === 0 || window.confirm('Breytingar á kortinu eru ekki vistaðar. Fara samt og henda þeim?');
}
