# Next.js 16 upgrade, Phase 2: verification

Date: 24 October 2026. The same file is committed to all three repos.

## How this was checked, and the limit on it

This session's network policy blocks every one of the sites: the previews on `*.vercel.app` as well as godord.app, laugin.app and jodcraft.world. So no browser here could open a preview. Two checks stand in for it:

1. **Preview against production, over HTTP.** Every route was fetched on both hosts through Vercel's own fetch tool, using a temporary 23-hour share link on each preview deployment. No project setting was changed. For each route the comparison covered:
   - status and content type;
   - the security headers;
   - the visible text with markup removed;
   - the `<html>`, `<meta>` and `<link>` tags;
   - JSON shape, and image type and size.
2. **Old build against new build, in a real browser.** `main` (Next 15.5.27) and the upgrade branch (Next 16.4.3) of each repo were built and served side by side here, then opened in Chromium (Playwright) with reduced motion, at 390x844 and 1440x900. For each route the comparison covered:
   - full-page screenshots, compared pixel by pixel (pixelmatch, threshold 0.1);
   - console errors and warnings, page errors and failed requests;
   - layout shift.

   Both builds run without the production environment variables (no Redis, Blob or ADMIN_TOKEN beyond a test token), so data-driven parts show the same fallbacks on both sides. A 15 build compared with itself came out at 0 px on the pages tried that way (laugin.app `/`, jodcraft.world `/` and `/kvold`), so the differences below are between the builds, not noise.

Every route that renders a page was checked at both sizes. Each line below covers both widths unless it says otherwise.

## Found and fixed during this phase

- **laugin.app, `/api/pool-counts` and `/api/alfheimar-counts` returned 500 on the preview** (production: 200). These counts feed the home page.
  - Cause: Turbopack's file tracer could not follow `playwright-core`'s run-time read of `browsers.json` and left the file out of the functions (`Cannot find module '/var/task/node_modules/playwright-core/browsers.json'`). `/api/cron/collect` had the same gap.
  - Fix: swim-jod `56e55d4` names the file in `outputFileTracingIncludes` for the three routes.
  - Verified on the new preview: both routes answer 200 with production's JSON shape, and there are no runtime errors on the project since.
- **jodcraft.world, the link preview image `/opengraph-image` lost its strata cut.**
  - Cause: the Satori in Next 16 (0.29, up from 0.15) draws only the last shadow in a `textShadow` list, so "JOÐ" sat on one dark block instead of five clay bands.
  - This was shown in isolation: with 2 and 3 coloured shadows, only the last one is drawn; a single shadow renders the same as on 15.
  - Fix: minecraft-jod-v2 `3751765` draws the bands as copies of the name set lower behind it.
  - The new image matches the 15 image apart from 143 px. Those 143 px are a one-pixel shift in the rounding of the 72 px "J" mark (see below), not the bands.

## godord (godord.app)

Remote (preview against www.godord.app), 15 routes:
- **Visible text, HTML:** identical on all 7 HTML routes.
- **Bodies:** all JSON, CSS and JS bodies are byte-identical, including the `prebuild` output `/gragas/gragas.css`, `gragas.js` and `letur.css`.
- **Statuses and content types:** the same everywhere.

Local browser:

| Route | Status | Pixels | Notes |
|---|---|---|---|
| `/` | 200 | 0 | Same 7 console messages on both. |
| `/kerfi` | 200 | 0 | |
| `/smidja` | 200 | 0 | |
| `/stjorn` | 200 | 0 | |
| `/daemi/verkefni` | 200 | 0 | |
| `/daemi/verkefni?godord=laugin&flotur=bokfell` | 200 | 0 | |
| `/finnst-ekki-xyz` | 404 | 0 | Layout shift 0.173 at 390 px and 0.004 at 1440 px on 16, against 0 on 15. See "Known differences". |

## laugin.app (swim-jod)

Remote (preview against www.laugin.app):
- **Pages** (`/`, `/hatid`, `/vikan`, 404): visible text is identical, and the CSP and the other five security headers are identical on every route.
- **Files:** `/icon.svg` and `/laugin.webmanifest` are identical. `/sw.js` differs only in its stamped VERSION line, which carries the commit sha.
- **APIs:** `/api/aurora` has the same shape. `/api/og/vikan` is a PNG on both.
- **`/api/og` answers 500 on both hosts.** It already does so in production, so this is not caused by the upgrade.

Local browser:

| Route | Status | Pixels | Notes |
|---|---|---|---|
| `/` | 200* | 0.07% at 390 px, 0.01% at 1440 px | The WebGL water scene. 15 against 15 is 0 px, so a few hundred px of the 3D water differ between builds. Nothing outside the canvas differs. |
| `/hatid` | 200 | 0 | |
| `/vikan` | 200 | 0 | |
| `/new?fara=x` | 200* | 0.08% / 0.03% | Ends on `/` on both, the same as `/`. |
| `/finnst-ekki-xyz` | 404 | 1.0% / 0.25% | Body text, eyebrow and button render in the fallback font. See "Known differences". |

\* The home page polls constantly, so Playwright never sees the network go idle and reports status 0 on both builds. The page rendered and was captured.

Generated images: `/api/og` and `/api/og/vikan` are 0 px apart. `/api/og/hatid` is 52 px apart, scattered single anti-aliased text pixels.

The bundle check on Vercel passes at 223.7 of 230 kB.

## jodcraft.world (minecraft-jod-v2)

Remote (preview against jodcraft.world), 25 routes:
- **Pages** (`/`, `/crew`, `/kvold`, `/taflan`, `/admin/login`, `/crew/stebbias`, `/stadur/22`, 404): visible text is identical.
- **Security headers:** the CSP is identical, including the separate BlueMap CSP under `/bluemap` and `/kort`, as are the other security headers.
- **BlueMap viewer:** `/heimskort` lands on the BlueMap page. `/bluemap/index.html` and `/bluemap/settings.json` are identical, down to the etag.
- **Gallery through Blob:** `/api/gallery` is byte-identical. Two gallery pictures through `/api/blob/...` (webp and png) are identical in type, length, etag and caching.
- **Image optimizer:** a `/_next/image` request taken from the home page's srcset is identical (image/jpeg, 24,632 bytes).
- **Other APIs:** `/api/map`, `/api/server-status`, `/api/stats` and `/api/playnight` have the same shape.
- **Admin:** `/admin` with no cookie lands on the login page on both.

Local browser:

| Route | Status | Pixels | Notes |
|---|---|---|---|
| `/` | 200 | 0.21% at 390 px, 0.07% at 1440 px | The only difference is the hero's yellow splash line ("Badlands við sólsetur!" vs "Aldrei endurræst!"), which `Hero.tsx` picks at random with `Math.random`. |
| `/crew` | 200 | 0 | |
| `/kvold` | 200 | 0.15% / 0.06% | The same random splash. |
| `/taflan` | 200 | 0 | Layout shift 0.018 on 15 and 0.001 on 16 at 1440 px. |
| `/stadur/22` | 200 | 0.13% at 390 px, 0 at 1440 px | The same random splash. |
| `/crew/stebbias` | 200 | 0 | |
| `/admin` without a cookie | 200 | 0 | Redirected to `/admin/login?next=%2Fadmin` on both. |
| `/admin/login` | 200 | 0 | New console warning on 16: two preloaded CSS files not used within a few seconds. A warning, not an error. |
| `/admin` with a valid test cookie | 200 | 0 | The admin panel renders the same. |
| `/finnst-ekki-xyz` | 404 | 0 | Layout shift 0.009 at 390 px on 16. |

On `/crew`, `/taflan` and `/crew/stebbias`, the only failed requests are link prefetches cancelled when the test closed the page. They show as new on 16 only because their URLs carry a per-build hash.

Generated images:
- `/opengraph-image`: 143 px apart after the fix (was 10,107).
- `/kvold/card` and `/crew/stebbias/opengraph-image`: 0 px.
- `/stadur/22/opengraph-image`: 191 px of scattered resampling in the screenshot backdrop.
- `/api/mail-art`: 36 px, the same "J" mark rounding.

## Known differences left as they are

1. **The 404 page loses its font preloads on Next 16, on all three sites.** Next 16 puts font preloads in a `Link` header, and the prerendered not-found page gets neither that header nor the `<link>` tags 15 put in its HTML, although its font manifest lists the fonts.
   - On godord.app the fonts swap in late, with a layout shift of 0.17 at 390 px on a cold load.
   - On laugin.app, Inter Tight is set to `display: "optional"` on purpose, so on a cold load straight to a 404 the body text stays in the fallback font.
   - Any visit that already has the fonts cached is unaffected.
   - It cannot be fixed from app code without hard-coding hashed font file names, so it is left for a Next.js patch.
2. **jodcraft.world `/icon.svg` and `/opengraph-image` are now served with `cache-control: public, max-age=0, must-revalidate`** instead of `public, immutable, no-transform, max-age=31536000`. This is how Next 16 serves metadata files. Pages link them with a content hash, and they are small, so the cost is a revalidation round trip. Overriding Next's headers in config was not worth the risk.
3. **The "J" mark** in jodcraft.world's OG image and mail art: the 32-unit SVG drawn with crisp edges at 2.25x rounds two edges one pixel differently in the new renderer. It cannot be seen at the size the image is shown, and fixing it would mean resizing the mark, which is a design change.
4. **Header-level differences that are not visible:**
   - route handlers and metadata files no longer send `vary: rsc, next-router-*`;
   - the manifest link gains `crossorigin="use-credentials"` (Next adds it on protected deployments, so it should not reach production);
   - `twitter:image:alt` moves before `twitter:image:width/height`;
   - `<html>` gains `data-dpl-id`;
   - preview `og:image` URLs point at the preview host (Next's fallback on previews);
   - on laugin.app `/hatid`, metadata is now rendered in `<head>` instead of being streamed into `<body>`.
5. **Expected:** `data-scroll-behavior="smooth"` on `<html>` on laugin.app and jodcraft.world.

## Not tested, and why

- **Real-browser checks on the preview deployments themselves:** console errors, rendering at 390 and 1440 px, keyboard path and visible focus, and Lighthouse and LCP against production. The network policy blocks the previews. They were checked against local production builds instead. Allowing the three domains and `*.vercel.app` under the environment's Network access would let them run here.
- **Lighthouse mobile within 3 points, LCP within 0.3 s, CLS under 0.1 on the real sites:** not measured, for the same reason. The local layout-shift numbers are above; only godord's cold 404 exceeds 0.1. On laugin.app the extra 30 kB of first-load JS is the most likely place for an LCP regression.
- **The 3D scenes and the live map in motion:**
  - The WebGL water on laugin.app ran only under software WebGL with reduced motion, so animation, lazy loading and pause-when-hidden were not exercised. godord's 3D film was not on any route checked.
  - The BlueMap viewer was compared as files, not run; a local build has no map data.
  - The reduced-motion fallback renders the same.
- **Admin login with the real token:** only a test token was used locally, and on the preview only the no-cookie redirect was checked. Logging in on the preview needs the real token, which belongs to Jón Goði.
- **`/api/cron/collect` running end to end:** it needs `CRON_SECRET`. Its trace now carries `browsers.json`, like the two routes proven to work.
- **The `/new` 308 status code on the preview:** the fetch tool follows same-origin redirects silently. Locally, `/new?fara=x` ends on `/` on both builds; the page itself removes `fara` once it has handled it.
