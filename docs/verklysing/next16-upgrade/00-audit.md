# Next.js 16 upgrade, Phase 0 audit

Date: 24 October 2026. Scope: `jongodi/godord`, `jongodi/swim-jod`, `jongodi/minecraft-jod-v2`, each read at the head of `main`.
No repository source was changed. The same file is committed to all three repos.

## How this was checked

- Read `package.json`, the lockfile entries, `next.config.*`, `vercel.json`, `tsconfig.json`, any middleware, and the whole app tree in each repo.
- Read the advisories on GitHub and the Vercel project settings (read-only).
- Ran a throwaway trial outside the repos: a fresh copy of each repo, `npm ci`, then `next@16.4.2 react@19.3.1 react-dom@19.3.1`, then typecheck, build, tests and lint. Nothing from the trial was committed. The results below say "trial" where they come from it.

## Corrections to the brief

These change the picture, so they come first.

1. **GHSA-673q-mjm6-r5xr does not affect any of the three apps today.** It covers `next` 16.0.0 to 16.4.0 only, and needs a `use cache` function. All three run 15.5.27 and none uses `use cache`. Moving to 16.4.2 is past its fix (16.4.1), so the upgrade does not introduce it either.
2. **GHSA-p3m5-59mp-jv5r needs at least one Server Action.** None of the three defines one (no `"use server"` anywhere), so it is not exploitable on any of them today.
3. **The Image Optimization RCE is GHSA-2464-fhr4-w9xw for Next** (references CVE-2026-96889) and **GHSA-wq5f-xc86-pv6w for sharp** (fixed in 0.35.5). Only minecraft-jod-v2 uses the optimizer. godord never imports `next/image`; swim-jod sets `images.unoptimized: true`. On Vercel, `next/image` is served by Vercel's own image optimization, so the deployed function's `sharp` is probably not on that path at all. Not verified.
4. **Next 15.5.28 exists** (backport, 14 October) and fixes both Next advisories above. Next 15 still gets no patches after 21 October, so the move to 16 is right. But a one-line bump to 15.5.28 in each repo, with React untouched, closes today's exposure within the hour if Jón Goði wants a stopgap while the 16 work is reviewed.
5. **`sharp` is not a direct dependency anywhere.** In all three it is an optional dependency of `next` (swim-jod 0.34.5, the other two 0.35.4). `next@16.4.2` asks for `sharp ^0.35.5`, and in the trial every lockfile moved to 0.35.5 on its own. Adding `sharp` to `package.json` would break the "Add nothing" rule, so the recommendation is not to.
6. **swim-jod and minecraft-jod-v2 run React 18**, not 19. For them this is a React major upgrade. godord is already on 19.3.0, so for godord it is a patch.
7. **minecraft-jod-v2 has no `three` or `@react-three/fiber`.** The 3D map on jodcraft.world is the prebuilt BlueMap viewer, served as static files from `public/bluemap`. The Three.js r186 warning applies to godord (`three` 0.169) and swim-jod (0.185.1).
8. **minecraft-jod-v2's app tree is `src/app`**, not `app/`.
9. **The two React advisories could not be checked.** GHSA-xqc2-xf4c-x3h3 and GHSA-h3gv-c5rc-p453 both return 404 on GitHub. The IDs may be wrong or not yet public.
10. **`next@latest` is 16.4.3** (23 October). Its notes list no security fixes, but it has a `proxy.ts` fix ("stopped loading the app-page runtime in proxy.ts") that touches minecraft-jod-v2. `npx @next/codemod upgrade latest` installs 16.4.3, so Phase 1 step 3 moves it back down to 16.4.2.

## Shared answers

- **Peer range:** `next@16.4.2` accepts `react` and `react-dom` `^18.2.0 || ^19.0.0`. `react-dom@19.3.1` needs `react ^19.3.1`. Pinning both at 19.3.1 is valid.
- **Node:** `next@16.4.2` and `sharp@0.35.5` need Node 20.9 or later. Vercel runs 24.x. minecraft-jod-v2 CI uses `node-version: 20`, which resolves to the latest 20.x, so it is fine.
- **Turbopack:** none of the three has a custom `webpack` function, so no `--webpack` flag is needed. All three compiled under Turbopack in the trial.
- **Removed APIs:** no `serverRuntimeConfig`, `publicRuntimeConfig`, AMP, `next/legacy/image`, `images.domains` or `experimental` keys anywhere. `next lint` is used by swim-jod and minecraft-jod-v2 (see below).
- **Async request APIs:** every `cookies()`, `params` and `searchParams` read in all three is already awaited and typed as a Promise. None needs a change. `headers()` and `draftMode()` are not used.
- **`tsconfig.json`:** on first build, Next 16 rewrites it in all three: `jsx` becomes `react-jsx` and `.next/dev/types/**/*.ts` is added to `include`. This needs committing.
- **Smooth scrolling:** Next 16 no longer turns off `scroll-behavior: smooth` during client navigation. Any app with `html { scroll-behavior: smooth }` and `next/link` would start smooth-scrolling to the top on every route change. Adding `data-scroll-behavior="smooth"` to `<html>` keeps today's behaviour. This applies to swim-jod and minecraft-jod-v2, not godord (it has no `next/link`).

## godord (godord.app)

**Answers**

| Question | Answer |
|---|---|
| `react`, `react-dom` direct? | Yes, `^19.3.0`, locked at 19.3.0. Patch move to 19.3.1. |
| Custom `webpack`? | No. `next.config.ts` holds only `headers()`, `reactStrictMode` and `poweredByHeader`. |
| `middleware.ts`? | No. |
| Request APIs | `cookies()`: `app/api/stjorn/adgangur/route.ts:16`, `stjorn/adgangur.ts:37`. `params`: `app/gogn/[godord]/route.ts:4`. `searchParams`: `app/daemi/verkefni/page.tsx:21`. All already awaited. |
| Server Actions? | None. |
| SVG through `next/image`? | No `next/image` at all, no `images` config, no `dangerouslyAllowSVG`. |
| Removed APIs? | None. No lint script exists. |
| Framework Preset | The Vercel project has `framework: null` and Node 24.x. `vercel.json` sets `"framework": "nextjs"`, and that is what makes the build detect Next.js. `next.config.ts` does not depend on it. Neither should be touched. |
| `sharp` | Not direct. Transitive 0.35.4, becomes 0.35.5. |

**Trial:** `prebuild` (`node verk/smida-kjarna.mjs`) ran and wrote `public/gragas/*`. `tsc` passed, the build passed, `npm test` passed (46 of 46) and `npm run check` passed. Turbopack added one new warning (below).

**Files the migration will touch**

- `package.json`, `package-lock.json`: `next` 16.4.2, `react` and `react-dom` 19.3.1.
- `tsconfig.json`: the rewrite Next does on first build.
- `stjorn/geymsla.ts:84`: the source of the new Turbopack warning.

**Risks**

- Breaking: none found.
- Likely: Turbopack warns that `readFile(skraLeid())` in `stjorn/geymsla.ts` "causes tracing of the whole project". The path comes from `STJORN_SKRA` or `efni/stillingar.json`, so the tracer gives up and packs the whole repo, `public/` included, into `/api/stjorn` and `/stjorn`. That breaks "no new warnings" and can push those functions toward the size limit. The fix has to keep `efni/stillingar.json` readable at runtime, so it needs care. A blanket `turbopackIgnore` could drop the file.
- Cosmetic: the `tsconfig.json` rewrite.

## swim-jod (laugin.app)

**Answers**

| Question | Answer |
|---|---|
| `react`, `react-dom` direct? | Yes, pinned at `18.3.1`. Major move to 19.3.1. `@types/react` `^18.3.5` (locked 18.3.24), `@types/react-dom` `^18.3.0`. |
| Custom `webpack`? | No. The config has CSP `headers()`, a `/new` redirect, `outputFileTracingRoot`, `serverExternalPackages` (Playwright, Chromium, ioredis) and `images.unoptimized: true`. |
| `middleware.ts`? | No. |
| Request APIs | None on the server. `app/page.tsx` only uses `URL.searchParams` in the browser. |
| Server Actions? | None. |
| SVG through `next/image`? | No. `next/image` is never imported and `images.unoptimized: true` turns the optimizer off. `app/icon.svg` is a metadata file. OG images use `next/og`, which does not use `sharp`. Phase 2's "images still load through `next/image`" check should become "images still load". |
| Removed APIs? | `"lint": "next lint"`, with `eslint` 8.57.0, `.eslintrc.json` and `eslint-config-next ^15.5.27`. |
| `sharp` | Not direct. Transitive 0.34.5, becomes 0.35.5. |

**Trial:** `tsc` passed with both React 18 and React 19 types, and `npm test` passed (520 of 520). `next build` compiled, then **`postbuild` failed**, so `npm run build` exits 1 and a Vercel build would fail. `eslint app components lib` (eslint 8, current config) passed clean.

**Files the migration will touch**

- `package.json`, `package-lock.json`: `next`, `react`, `react-dom`, plus the lint script. `@types/*` if approved.
- `tsconfig.json` and `next-env.d.ts` (tracked in this repo): the rewrite Next does.
- `scripts/check-bundle.mjs`: must be rewritten.
- `app/layout.tsx:114`: `data-scroll-behavior="smooth"` on `<html>`.

**Risks**

- Breaking: `scripts/check-bundle.mjs` reads `.next/app-build-manifest.json`. Next 16 no longer writes that file under Turbopack or under `--webpack` (both tried), so the bundle-budget check crashes and fails the build.
- Breaking: the budget itself. Baseline first-load JS for `/` is 194.1 kB gz against a 200 kB budget. A rough count of the Turbopack output (root main files plus the `/page` and `/layout` entry chunks) came to about 223.7 kB gz. React 19's `react-dom` is part of that. The exact number depends on how the rewritten script counts, but going over 200 is likely. Jón Goði decides whether to raise `BUDGET_KB` or make the bundle smaller first.
- Likely: `next lint` is gone, so `npm run lint` breaks.
- Likely: React 18 to 19 is a major version. Nothing removed in 19 was found (`defaultProps`, string refs, `ReactDOM.render`, `findDOMNode`, the global `JSX` namespace). `framer-motion` 11.18.2 accepts React 19. Still needs the Phase 2 walk.
- Likely: `/api/cron/collect`, `/api/og` and `/api/pool-counts` bundle Playwright and `@sparticuz/chromium-min`. The trial traced 93 of their files under Turbopack, but whether they run can only be proven on a preview. The cron route needs `CRON_SECRET`.
- Cosmetic: smooth scroll on navigation (covered by the `<html>` attribute) and the `tsconfig.json` rewrite.

## minecraft-jod-v2 (jodcraft.world)

**Answers**

| Question | Answer |
|---|---|
| `react`, `react-dom` direct? | Yes, `^18`, locked at 18.3.1. Major move to 19.3.1. `@types/react` `^18` (locked 18.3.28). |
| Custom `webpack`? | No. The config has rewrites, redirects, CSP headers, tracing includes and excludes, and `images`. The `images` block already sets `qualities`, `imageSizes`, `minimumCacheTTL` and `localPatterns`, so Next 16's new image defaults change nothing. |
| `middleware.ts`? | Yes: `src/middleware.ts`, the admin gate on `/admin/:path*`. Next 16 runs it but warns it is deprecated. As `proxy.ts` it runs on Node instead of Edge. `isValidAdminToken` (`src/lib/auth.ts`) is plain JS and works on both. In the trial, `@next/codemod middleware-to-proxy` renamed the file and the function, the build passed and the admin and auth tests passed. |
| Request APIs | `cookies()`: `src/lib/auth.ts:22`, `src/lib/crew.ts:256`, `src/app/api/crew/auth/route.ts:58`. `params` as a Promise in 26 route handlers, pages and OG images (every dynamic segment under `src/app`, including `api/blob/[...path]`). `searchParams`: `crew/[username]/page.tsx`, `taflan/page.tsx`. `useSearchParams` in `admin/login/page.tsx`, already inside `<Suspense>`. All already async. |
| Server Actions? | None. |
| SVG through `next/image`? | Yes, the optimizer is in use: `getImageProps` in `src/components/badlands/photo.ts`, with `remotePatterns` for `*.blob.vercel-storage.com`. There is no `dangerouslyAllowSVG`, so the optimizer refuses SVG. Admin uploads reject SVG (`image-uploads.test.ts`), and `/api/blob` serves anything that is not a raster image as a download. This is the only one of the three where the Image Optimization advisory could be reached. |
| Removed APIs? | `"lint": "next lint"` with `eslint` 8 and `eslint-config-next` 15.5.27. CI (`.github/workflows/ci.yml`) runs `npm run lint`. |
| `sharp` | Not direct. Transitive 0.35.4, becomes 0.35.5. |

**Trial:** `npm test` passed (421 of 421). With React 18 types, `tsc` and the build passed. With React 19 types there are 10 type errors and the build fails. `eslint src` (eslint 8, current config) passed clean. `eslint .` does not, because it reaches into the minified BlueMap bundle, so the new script must name `src`.

**Files the migration will touch**

- `package.json`, `package-lock.json`: `next`, `react`, `react-dom`, plus the lint script. `@types/*` if approved.
- `tsconfig.json`: the rewrite Next does.
- `src/middleware.ts` becomes `src/proxy.ts`, with `export function proxy`.
- `src/app/layout.tsx:71`: `data-scroll-behavior="smooth"` on `<html>`.
- `src/instrumentation.ts`: the Edge warning below.
- If React 19 types are approved: `src/components/admin/ui.tsx:61`, `src/components/badlands/Album.tsx:23`, `Lightbox.tsx:36`, `QuickDraw.tsx:59,68`, `Shelf.tsx:33`, `hooks.ts:181,550`, `src/components/wall/Print.tsx:255`, `src/components/wall/Wall.tsx:106`. These are all `useRef()` with no argument or a `RefObject<T>` that is now `RefObject<T | null>`, and are type-only fixes.

**Risks**

- Breaking: none of the three changes below can wait. `next lint` is gone, so CI fails. The React 19 types cannot build without the 10 ref fixes. Keeping the React 18 types builds, but the types would no longer match the runtime.
- Likely: Turbopack warns twice that `src/instrumentation.ts` uses `process.emitWarning`, which the Edge Runtime does not support. The code already returns early when `NEXT_RUNTIME !== 'nodejs'`, but Turbopack still compiles the file for Edge, and the warning stays after the proxy rename. This breaks "no new warnings". The usual fix is a Node-only import, which means a new file, so it needs a yes or a different approach.
- Likely: the admin gate moves from Edge to Node. The trial shows it builds and its tests pass, but admin login still has to be checked on a preview (Phase 2).
- Likely: smooth scroll on navigation. `globals.css:26` sets it and 20 files use `next/link`. Covered by the `<html>` attribute.
- Likely: React 18 to 19, as for swim-jod. `framer-motion` 11.18.2 accepts 19, and no removed React API was found.
- Cosmetic: the `tsconfig.json` rewrite. The `url.parse()` noise is still filtered by `instrumentation.ts`.

## Decisions needed before Phase 1

1. **`@types/react` and `@types/react-dom` to 19** in swim-jod and minecraft-jod-v2. They are not on the Change list, but types for React 18 on a React 19 runtime are wrong. Recommend yes. It costs the 10 type-only fixes in minecraft-jod-v2 and nothing in swim-jod.
2. **Lint after `next lint` is removed.** Recommend the smallest change: set the script to `eslint src` (minecraft-jod-v2) or `eslint app components lib` (swim-jod). This keeps eslint 8, `.eslintrc.json` and `eslint-config-next` 15.5.27, so no package moves. The other option is `@next/codemod next-lint-to-eslint-cli`, which moves to eslint 9, flat config and `eslint-config-next` 16. That moves packages outside the Change list.
3. **swim-jod bundle budget.** The check script must be rewritten to read Next 16 output. Then, if first-load JS lands near 224 kB, choose between raising `BUDGET_KB` on purpose or making the bundle smaller first, which would be a separate job.
4. **minecraft-jod-v2 `instrumentation.ts`.** Allow one new file for a Node-only import, or accept another way of silencing the Edge warning.
5. **`sharp`.** Confirm it stays transitive (0.35.5 through `next`) rather than being added as a direct dependency.
6. **16.4.2 or 16.4.3.** The brief says 16.4.2. 16.4.3 is the current latest and carries a `proxy.ts` fix.
7. **Stopgap.** Optionally ship `next@15.5.28` to all three now, ahead of the 16 PRs.
8. **Branch name.** This session pushes to `claude/next16-upgrade-phase-0-8o9cn3`. The brief asks for `create-branch` naming or `chore/next-16-security-upgrade` for Phase 1. Confirm which branch the Phase 1 PRs should come from.
