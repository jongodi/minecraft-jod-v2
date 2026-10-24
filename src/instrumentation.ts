/* Runs once when a server instance starts, before it answers anything.

   Next.js parses every request with Node's legacy url.parse(), and newer Node
   versions answer that with a DEP0169 deprecation warning. Vercel files it at
   error level, so it sat on nearly every request in the logs and buried the
   real errors. It is Next's to change, not ours, so this one warning code is
   dropped here; every other warning still goes out as before. */

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  /* Turbopack also builds this file for the Edge runtime, where it never gets
     past the line above, and warns about Node APIs it reads off `process` by
     name. Reached through globalThis it is the same object, unflagged. */
  const node = globalThis.process;
  const emitWarning = node.emitWarning.bind(node) as (...args: unknown[]) => void;
  node.emitWarning = ((...args: unknown[]) => {
    /* emitWarning(warning, type, code) or emitWarning(warning, { type, code }) */
    const [warning, second, third] = args;
    const code = (warning as { code?: string } | null)?.code
      ?? (typeof second === 'object' && second !== null ? (second as { code?: string }).code : third);
    if (code === 'DEP0169') return;
    emitWarning(...args);
  }) as typeof process.emitWarning;
}
