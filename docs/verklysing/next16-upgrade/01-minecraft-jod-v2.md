# Next.js 16 upgrade, Phase 1: minecraft-jod-v2

Date: 24 October 2026. Branch: `claude/next16-upgrade-phase-0-8o9cn3`.

Decided after the audit:
- Target `next` 16.4.3.
- The React types move to 19.
- Lint runs `eslint` directly, on eslint 8.
- `sharp` stays transitive.
- The `instrumentation.ts` warning is fixed without a new file if possible. It was.

## Version moves

| Package | Before | After |
|---|---|---|
| `next` | 15.5.27 | 16.4.3 (exact) |
| `react`, `react-dom` | 18.3.1 (`^18`) | 19.3.1 (exact) |
| `@types/react`, `@types/react-dom` | 18.3.28, 18.3.7 (`^18`) | 19.3.0 (`^19`) |
| `sharp` (through `next`) | 0.35.4 | 0.35.5 |

The only other lockfile moves are `next`'s own dependencies (`@next/env`, `@next/swc-*`, `@swc/helpers`, the new `baseline-browser-mapping`, `@img/sharp-*`), and `scheduler` 0.28.0 with React 19. `@types/prop-types` is gone. The existing `postcss` override kept `postcss` where it was. `framer-motion`, `@vercel/blob`, `ioredis`, eslint and `eslint-config-next` are unchanged.

## Commits

1. **Codemod output** (`npx @next/codemod@canary upgrade latest --skip-adoption --skip-eslint-upgrade`):
   - `package.json` and the lockfile.
   - `src/middleware.ts` renamed to `src/proxy.ts`, with its function renamed from `middleware` to `proxy`. Nothing else in it changed, matcher included.
   - The React 19 types codemod in four files. In `QuickDraw.tsx`, `Shelf.tsx` and `hooks.ts`, `useRef()` became `useRef(undefined)`, the same at run time. In `hooks.ts` (`useDialogFocus`, `useInert`) and `wall/Reactions.tsx`, `RefObject<T>` became `RefObject<T | null>`. Those signature changes also cleared the ten type errors the audit trial found.
   - Its React 19 runtime recipe could not reach the codemod registry. The patterns it rewrites do not occur here.
2. **Pins:** exact `next`, `react` and `react-dom`, and `^19` for the types. The type overrides the codemod added were dropped.
3. **`tsconfig.json`:** `jsx` set to `react-jsx` and `.next/dev/types` added to `include`.
4. **`src/instrumentation.ts`:** Turbopack also builds it for the Edge runtime and warned twice about `process.emitWarning`. It now reaches `process` through `globalThis`, the same object in Node, which Turbopack does not flag. No new file. Its two tests still pass.
5. **Lint:** `"lint": "eslint src"`, the folder `next lint` covered. It runs on eslint 8 with `.eslintrc.json`, lints all 285 TypeScript files and passes clean. CI's `npm run lint` step works again.
6. **`src/app/layout.tsx`:** `data-scroll-behavior="smooth"` on `<html>`. `globals.css` sets `scroll-behavior: smooth`, and Next 16 only turns it off around route changes when this attribute is present.

## Checks

- `npm run build`: passes on Next.js 16.4.3 (Turbopack) with no warnings. The route table lists the proxy.
- `tsc --noEmit`: passes.
- `npm run lint`: passes.
- `npm test`: 421 of 421.
- Local smoke test on `next start` with a test admin token:
  - `/` gives 200.
  - `/admin` without a cookie gives 307 to `/admin/login?next=%2Fadmin`. With the right cookie it gives 200. `/admin/login` gives 200.
  - `/api/blob/...` gives 404 with no Blob store configured, as before.
  - The `<html>` attribute is present.

## Not changed

- Every route and API path, the `/api/blob/[...path]` handler, the admin auth flow, `next.config.mjs` (its `images` block already sets `qualities`, `imageSizes`, `minimumCacheTTL` and `localPatterns`, so Next 16's new image defaults change nothing), `vercel.json` and CI.

## Deferred

- The Vercel preview and the Phase 2 checks: the live map and BlueMap viewer, the gallery through `/api/blob`, admin login against the real token, and Lighthouse and LCP against production.
- Later job: CI runs on Node 20. Next 16 accepts it, but Node 20 reached end of life in April 2026.
