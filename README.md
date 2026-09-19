# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk; `framer-motion` sér aðeins um bendlahreyfingar (kort, myndir, valmynd).

## Vefurinn

Vefurinn er eitt kvöld á þjóninum. Gesturinn kemur að sólsetri yfir Minecraft-eyðimörk (badlands) og skrunar inn í nóttina; þegar bærinn kveikir á luktunum. Skrun er tími sem líður. Hönnunin er skjalfest í `DESIGN.md`.

Fimm reglur halda útlitinu saman: terracotta-lög eyðimerkurinnar eru skilrúm og grunnur merkisins; gulbrúnt luktarljós er eingöngu á því sem hægt er að smella á; allt letur er teiknað á pixlarist, og pixlaleturgerðin sjálf er á öllum stuttum strengjum (valmynd, hnappar, myndatextar, merkimiðar, tölur og það sem þjónninn segir); pappír er fyrir það sem var fest upp (tölfræði, uppsettir pakkar, leiðin inn); og yfirborð eru hlý og dökk, aldrei kaldgrá.

Letur: Alfa Slab One fyrir fyrirsagnir, Pixelify Sans fyrir meginmál og Silkscreen fyrir merkimiða og gögn — allar þrjár teiknaðar á pixlarist. Þær fylgja vefnum í gegnum `@fontsource` og eru hlaðnar með `next/font/local`. Allir litir, stærðir, bil og tímasetningar eru í `src/app/tokens.css`.

| Hluti | Innihald |
|---|---|
| Sólsetur | Merkið, vistfangið sem er afritað með einum smelli, og lukt með stöðu þjónsins, útgáfu og hausum þeirra sem eru inni. Himinninn dökknar og stjörnurnar koma með skruni. |
| Heimurinn | Þrívíddarkortið af heimasvæðinu fyllir skjáinn undir mesunum. Það opnast sem kyrrmynd; skoðarinn sjálfur (BlueMap) hleðst ekki fyrr en ýtt er á luktina, og á síma opnast hann á heilum skjá. Staðirnir liggja í röð neðst með myndunum sínum; veldu stað og póstkortið hans birtist. *Teiknað kort* leggur málaða kortið yfir sama ramma, *Myndir* opnar allan vegginn, *Heill skjár* opnar skoðarann einan. |
| Hópurinn | Myndir af átta félögum, lukt logar á bak við þau sem eru inni. Þar undir er eftirlýsingaspjald fyrir hvern tölfræðiflokk með þremur efstu: sá fyrsti stór, annar og þriðji í tveimur línum undir strikinu. Öll tölfræðin er á síðu hvers og eins. |
| Á hillunni | Hver uppsettur gagnapakki er lítill kassi með sinni pixlateikningu; sá sem þú bendir á fær miðann sinn lesinn upp á búðarborðinu fyrir neðan. |
| Varðeldurinn | Ein landræma neðst: varðeldur á jörðinni með ljósinu sínu og glæðum, og fjöllin úr sólsetrinu aftur sem dökk útlína. Hópurinn, stjórnborðið, umhverfishljóðið og leiðin aftur upp í sólsetrið. Smelltu á eldinn: þar býr einvígið, viðbragðsleikur í þremur umferðum. |

Valmyndin er þrjár dyr, hver sín lukt: Heimurinn, Hópurinn, Hillan. Á tölvu eru þær efst við hlið vistfangsins, á síma neðst í seilingu þumals.

Áhrif (himinn, mesa-lög með dýpt, ryk og glæður, luktarljós sem fylgir bendlinum, vindur og eldur úr Web Audio) eru hvert um sig sjálfstæð eining í `src/effects/` og slökkva á sér undir `prefers-reduced-motion`.

Á `/crew` er félagalistinn. Á `/crew/<name>` eru kynning, tölfræði, afrek, færslur og myndir hvers leikmanns. Félagar skrá sig inn með sínum aðgangslykli.

Kóðinn er í `src/components/badlands/`, útlitsreglur í `src/app/badlands.css` og `src/app/board.css`, grunngildi í `src/app/tokens.css` og `src/app/globals.css`. Endurhönnunin er skjalfest í `DESIGN.md`.

## Verkfæri

- **Stjórnborð** (`/admin`): Fjórir flipar. **Þjónn**: staða, leikmenn inni, ræsa, stöðva og endurræsa á Exaroton, uppfærist sjálfkrafa. **Gagnapakkar**: allt um pakkana á einum stað; hvaða pakkar birtast í kaupfélaginu á vefnum (sýna eða fela), röðin á hillunum, uppsett útgáfa, athugun á nýrri útgáfu á Modrinth eða GitHub, lestur skráarheita beint af þjóninum, og eigin pakkar (til dæmis JOÐ-pakkarnir) sem má bæta við, breyta, gefa mynd og eyða. **Myndasafn**: upphleðsla, titlar, röð, sýna eða fela, og tenging við stað á kortinu. **Landakort**: ritill sem sýnir kortið nákvæmlega eins og gestir sjá það. Landslagið sjálft er málað þar: pensill og fylling mála sjó, land, gras, skóg, kletta og sand í kubbaristina, strönd teiknast sjálfkrafa þar sem land mætir sjó, og Shift heldur strokunni beinni. Að auki: afturköllun, rist, örvatakkar, afritun staða og myndaval. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð.

## Heimskortið

Heimasvæðið í þrívídd, teiknað af BlueMap á þjóninum, er á forsíðunni undir *Heimurinn*; `/heimskort` vísar á skoðarann sjálfan á heilum skjá. Exaroton leyfir ekki fleiri gáttir, svo vefþjónn BlueMap er óvirkur og vefurinn sækir kortið sjálfur í gegnum Exaroton-forritaskilin (`src/app/bluemap/[[...path]]/route.ts`).

Kortið sjálft er teiknað upp úr afriti sem geymt er á vefnum, svo það hleðst hratt hvort sem þjónninn er í gangi eða ekki. Aðeins staða leikmanna kemur beint frá þjóninum, meðan hann er í gangi. Afritið er sótt svona:

```bash
npm run map:sync            # sækir það sem hefur breyst
npm run map:sync -- --full  # sækir allt upp á nýtt
```

Skipunin vistar skoðarann í `public/bluemap`, kortagögnin í `public/bluemap-data` og skráalista í `src/lib/bluemap-snapshot.json`. Síðan sýnir dagsetningu afritsins. Afritið birtist á vefnum þegar breytingunum hefur verið ýtt á GitHub. Best er að keyra skipunina meðan þjónninn er í gangi.

Kyrrmyndin sem heimurinn opnast sem er `public/map-poster.webp`. Hún er tekin af afritinu með `npm run dev` í gangi:

```bash
npm run map:poster
```

Skipunin notar Chrome eða Edge sem er þegar á tölvunni (eða vafrann í `CHROME=<slóð>`); `playwright-core` kemur ekki með eigin vafra.

Upphafssjónarhornið er `MAP_START_VIEW` í `src/components/badlands/data.ts`; það er allt sem stendur á eftir `#` í vistfangi skoðarans þegar búið er að stilla myndina. Keyrðu `map:poster` aftur eftir hverja samstillingu sem breytir heimasvæðinu.

Í `plugins/BlueMap/webapp.conf` á þjóninum þarf að vera `client-decompression: true`, `map-data-root: "/bluemap-data/maps"` og `live-data-root: "maps"`. Fyrsta stillingin lætur skoðarann afpakka þjöppuðu skrárnar sjálfur, hinar tvær láta hann sækja kortið í afritið en stöðu leikmanna til þjónsins. Breytingar á `webapp.conf` birtast á vefnum eftir næstu afritun.

## Tungumál

Viðmótið, villuskilaboð og sjálfgefnir myndatextar eru á íslensku. Dagsetningar og tölur nota `is-IS`.

Auðkenni, slóðir, Minecraft-lyklar, notendanöfn og eiginheiti utanaðkomandi pakka og laga haldast óbreytt.  Í `src/lib/icelandic.ts` eru birtingarheiti fyrir innri auðkenni og samsvaranir fyrir eldri enska myndatexta og kortaheiti. Þekktur eldri texti er þýddur við lestur, án þess að skrifa yfir nýtt efni notenda í gagnagrunni.

## Umhverfisbreytur

Afritaðu `.env.local.example` sem `.env.local` og fylltu inn gildin.

| Breyta | Lýsing |
|---|---|
| `EXAROTON_API_KEY` | Exaroton-aðgangslykill fyrir stöðu þjónsins, stjórnun og tölfræði leikmanna |
| `EXAROTON_SERVER_ID` | Auðkenni þjónsins á exaroton.com; valfrjálst, sparar auka uppflettingu |
| `ADMIN_TOKEN` | Lykilorð að stjórnborðinu á `/admin`, að minnsta kosti 8 stafir |
| `GITHUB_TOKEN` | Hefðbundinn GitHub-aðgangslykill án aðgangssviða; hækkar fyrirspurnamörk við athugun gagnapakka, valfrjálst |
| `CREW_TOKEN_<USERNAME>` | Aðgangslykill hvers félaga, t.d. `CREW_TOKEN_STEBBIAS=...` |
| `REDIS_URL` | Redis-tenging fyrir prófíla, færslur, myndalýsigögn og vistuð tölfræðigögn |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob-aðgangur fyrir myndir sem er hlaðið upp. Geymslan má vera opin eða lokuð; myndir úr lokaðri geymslu eru birtar um `/api/blob/…` |
| `BLOB_ACCESS` | `public` eða `private`; valfrjálst, sleppir sjálfvirkri athugun á aðgangsstigi Blob-geymslunnar |

## Þróun

```bash
npm install
npm run dev
```

Opnaðu [vefinn á localhost:3000](http://localhost:3000).

Áður en breytingar eru sendar:

```bash
npm run lint
npx tsc --noEmit
npm run build
node scripts/shots.mjs shots / /crew        # skjámyndir og yfirflæðisathugun á 1440 og 390 px
SECTIONS=1 WIDTHS=390,1440 node scripts/shots.mjs shots /   # ein mynd á hvern hluta
REDUCE=1 node scripts/shots.mjs shots-reduce /             # með prefers-reduced-motion
```

## Bæta við félaga

1. Bættu notandanafninu við `CREW_USERNAMES` í `src/lib/crew.ts`.
2. Bættu því við `CREW` í `src/components/badlands/data.ts`.
3. Stilltu `CREW_TOKEN_<UPPERCASE_USERNAME>` í umhverfisbreytunum.

## Gagnapakkar

Grunnlistinn er í `src/data/datapacks.ts`. Allt sem er breytt í stjórnborðinu (eigin pakkar, sýnileiki, röð, uppsett útgáfa, mynd) vistast í Redis og er lesið saman við grunnlistann í `src/lib/datapacks-store.ts`. Vefurinn sækir listann um `/api/datapacks`, svo faldir pakkar birtast ekki og eigin pakkar birtast strax.

Stilltu hvern pakka í grunnlistanum eða í stjórnborðinu:

- `source: 'modrinth'` og `modrinthSlug`: athugar Modrinth.
- `source: 'github'` og `githubRepo` (`owner/repo`): athugar útgáfur á GitHub.
- `source: 'manual'`: engin sjálfvirk athugun.

Settu `currentVersion` á þá útgáfu sem er uppsett á þjóninum.
