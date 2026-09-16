# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk; `framer-motion` sér aðeins um bendlahreyfingar (kort, myndir, valmynd).

## Vefurinn

Vefurinn er eitt kvöld á þjóninum. Gesturinn kemur að sólsetri yfir Minecraft-eyðimörk (badlands) og skrunar inn í nóttina; þegar bærinn kveikir á luktunum. Skrun er tími sem líður. Hönnunin er skjalfest í `DESIGN.md`.

Fimm reglur halda útlitinu saman: terracotta-lög eyðimerkurinnar eru skilrúm og grunnur merkisins; gulbrúnt luktarljós er eingöngu á því sem hægt er að smella á; pixlaletur er eingöngu fyrir lifandi gögn frá þjóninum (vistfang, staða, fjöldi inni, útgáfa, tölfræði); pappír er fyrir það sem var fest upp (tölfræði, uppsettir pakkar, leiðin inn); og yfirborð eru hlý og dökk, aldrei kaldgrá.

Letur: Alfa Slab One fyrir fyrirsagnir, Literata fyrir meginmál og Silkscreen fyrir gögn. Öll þrjú fylgja vefnum í gegnum `@fontsource` og eru hlaðin með `next/font/local`. Allir litir, stærðir, bil og tímasetningar eru í `src/app/tokens.css`.

| Hluti | Innihald |
|---|---|
| Sólsetur | Merkið, vistfangið sem er afritað með einum smelli, og lukt með stöðu þjónsins. Himinninn dökknar og stjörnurnar koma með skruni. |
| Búðirnar | Hvað þjónninn er, og myndir af átta félögum. Lukt logar á bak við þau sem eru inni. Staðan uppfærist á mínútu fresti. |
| Landakort | Kort heimsins í kubbum yfir alla breidd síðunnar, með ám sem fylgja ristinni og fánum fyrir staði. Má draga, stækka og láta fljúga að fána. Staðirnir eru taldir upp fyrir neðan með myndunum sínum. Kortinu er breytt í stjórnborðinu. |
| Myndaalbúm | Myndir úr leiknum í trérömmum sem liggja þétt saman á plankavegg, hver fimmta stærri. Röðin á vefnum er nákvæmlega röðin í stjórnborðinu. Smelltu á ramma til að stækka. |
| Einvígi | Viðbragðsleikur með þremur umferðum í náttmyrkri. Besti tíminn vistast í vafranum. |
| Eftirlýst | Tölfræði leikmanna á eftirlýsingaspjöldum með rifnum brúnum. Þrjú efstu fá spjald, hin eru í bókinni fyrir neðan. |
| Kaupfélagið | Uppsettir gagnapakkar sem kassar á hillum, hver með sinni pixlamynd og útgáfumiða. Hver flokkur á sína teikningu, svo enginn pakki er án myndar. |
| Komdu inn | Leiðin inn í þremur skrefum, og vistfangið aftur. |

Áhrif (himinn, mesa-lög með dýpt, ryk og glæður, luktarljós sem fylgir bendlinum, vindur og eldur úr Web Audio) eru hvert um sig sjálfstæð eining í `src/effects/` og slökkva á sér undir `prefers-reduced-motion`.

Á `/crew` er félagalistinn. Á `/crew/<name>` eru kynning, tölfræði, afrek, færslur og myndir hvers leikmanns. Félagar skrá sig inn með sínum aðgangslykli.

Kóðinn er í `src/components/badlands/`, útlitsreglur í `src/app/badlands.css` og `src/app/board.css`, grunngildi í `src/app/tokens.css` og `src/app/globals.css`.

## Verkfæri

- **Pakkaritill** (`/rp-editor`): Greinir og breytir útlitspökkum í vafranum. Greining í bakgrunnsþræði rekur yfirlíkön, kubbaástand, hlutaskilgreiningar og yfirskriftir, letur, agnir, búnað, áferðarsöfn og gagnapakka. Hún sýnir bilaðar tilvísanir og skrár sem eru sannanlega ónotaðar. Þar eru líka tengslakort, leit að árekstrum í `custom_model_data`, leit að tvíteknum áferðum, sjálfvirkar leiðréttingar, útflutningur skýrslna og myndritill með þrívíðri forskoðun.
- **Stjórnborð** (`/admin`): Fjórir flipar. **Þjónn**: staða, leikmenn inni, ræsa, stöðva og endurræsa á Exaroton, uppfærist sjálfkrafa. **Gagnapakkar**: allt um pakkana á einum stað; hvaða pakkar birtast í kaupfélaginu á vefnum (sýna eða fela), röðin á hillunum, uppsett útgáfa, athugun á nýrri útgáfu á Modrinth eða GitHub, lestur skráarheita beint af þjóninum, og eigin pakkar (til dæmis JOÐ-pakkarnir) sem má bæta við, breyta, gefa mynd og eyða. **Myndasafn**: upphleðsla, titlar, röð, sýna eða fela, og tenging við stað á kortinu. **Landakort**: ritill sem sýnir kortið nákvæmlega eins og gestir sjá það. Landslagið sjálft er málað þar: pensill og fylling mála sjó, land, gras, skóg, kletta og sand í kubbaristina, strönd teiknast sjálfkrafa þar sem land mætir sjó, og Shift heldur strokunni beinni. Að auki: afturköllun, rist, örvatakkar, afritun staða og myndaval. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð.

## Tungumál

Viðmótið, villuskilaboð, sjálfgefnir myndatextar og greiningarskýrslur eru á íslensku. Dagsetningar og tölur nota `is-IS`.

Auðkenni, slóðir, Minecraft-lyklar, notendanöfn og eiginheiti utanaðkomandi pakka og laga haldast óbreytt. Ritillinn breytir ekki tungumáli efnis í pökkum sem notandi opnar. Í `src/lib/icelandic.ts` eru birtingarheiti fyrir innri auðkenni og samsvaranir fyrir eldri enska myndatexta og kortaheiti. Þekktur eldri texti er þýddur við lestur, án þess að skrifa yfir nýtt efni notenda í gagnagrunni.

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
