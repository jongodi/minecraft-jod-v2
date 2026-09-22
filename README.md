# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk; `framer-motion` sér aðeins um bendlahreyfingar (kort, myndir, valmynd).

## Vefurinn

Vefurinn er eitt kvöld á þjóninum. Gesturinn kemur að sólsetri yfir Minecraft-eyðimörk (badlands) og skrunar inn í nóttina; þegar bærinn kveikir á luktunum. Skrun er tími sem líður. Síðan er tveir skjáir og varðeldur: sólsetrið, heimurinn, og allt annað opnast yfir heiminum. Hönnunin er skjalfest í `DESIGN.md`.

Fimm reglur halda útlitinu saman: terracotta-lög eyðimerkurinnar eru skilrúm og grunnur merkisins; gulbrúnt luktarljós er eingöngu á því sem hægt er að smella á; allt letur er teiknað á pixlarist, og pixlaleturgerðin sjálf er á öllum stuttum strengjum (valmynd, hnappar, myndatextar, merkimiðar, tölur og það sem þjónninn segir); pappír er fyrir það sem var fest upp (tölfræði, uppsettir pakkar, leiðin inn); og yfirborð eru hlý og dökk, aldrei kaldgrá.

Letur: Alfa Slab One fyrir fyrirsagnir, Pixelify Sans fyrir meginmál og Silkscreen fyrir merkimiða og gögn — allar þrjár teiknaðar á pixlarist. Þær fylgja vefnum í gegnum `@fontsource` og eru hlaðnar með `next/font/local`. Allir litir, stærðir, bil og tímasetningar eru í `src/app/tokens.css`.

| Hluti | Innihald |
|---|---|
| Sólsetur | Merkið, vistfangið sem er afritað með einum smelli, og lukt með stöðu þjónsins, útgáfu og hausum þeirra sem eru inni. Himinninn dökknar og stjörnurnar koma með skruni. |
| Heimurinn | Þrívíddarkortið af heimasvæðinu fyllir skjáinn undir mesunum. Það opnast sem kyrrmynd; skoðarinn sjálfur (BlueMap, í fötum JOÐ) hleðst ekki fyrr en ýtt er á luktina, og kyrrmyndin víkur um leið og landslagið undir henni er komið; nákvæmu reitirnir streyma svo inn. Á síma verður ramminn að heilum skjá og bakhnappurinn skilar gestinum aftur á síðuna. Staðirnir liggja í röð neðst með myndunum sínum; veldu stað og póstkortið hans birtist, og hafi staðurinn hnit í heiminum flýgur myndavélin þangað og luktin hans logar í þrívíddinni. *Nótt* lætur sólina setjast svo ljósin í bænum lýsa, *Teiknað kort* leggur málaða kortið yfir sama ramma, *Myndir* opnar allan vegginn og *Heill skjár* gerir rammann sjálfan að heilum skjá. |
| Eftirlýst | Herbergi hópsins, sem opnast yfir heiminum (önnur dyrnar í valmyndinni, staðaluktin eða `/#hopur`): myndir af átta félögum í einni röð, lukt logar á bak við þau sem eru inni. Þar undir eftirlýsingaspjöldin á einni rennibraut, eitt fyrir hvern tölfræðiflokk með þremur efstu: viðurnefni þrjótsins efst (Innipúkinn, Slátrarinn, Draugurinn, Ódauðlegi, Vökustaurinn, Flakkarinn, Boxpúðinn, Ræningjabaninn, Plötusnúðurinn), sökin þar undir, sá fyrsti stór og annar og þriðji í tveimur línum undir strikinu. Öll tölfræðin er á síðu hvers og eins. |
| Á hillunni | Hitt herbergið (þriðju dyrnar eða `/#hillan`). Hver uppsettur gagnapakki er lítill kassi með sinni pixlateikningu; sá sem þú bendir á fær miðann sinn lesinn upp á búðarborðinu fyrir neðan. |
| Varðeldurinn | Ein landræma neðst: varðeldur á jörðinni með ljósinu sínu og glæðum, og fjöllin úr sólsetrinu aftur sem dökk útlína. Hópurinn, stjórnborðið, umhverfishljóðið og leiðin aftur upp í sólsetrið. Smelltu á eldinn: þar býr einvígið, viðbragðsleikur í þremur umferðum. |

Valmyndin er þrjár dyr, hver sín lukt: Heimurinn, Eftirlýst, Hillan. Fyrstu dyrnar eru heimurinn sjálfur; hinar tvær eru herbergi sem rísa upp frá neðri brún kortarammans og skilja heiminn eftir í sýn fyrir ofan. Luktin logar meðan gesturinn er inni um þær dyr. Kjölfestan (`#hopur`, `#hillan`) segir hvaða herbergi er opið, svo tenglar virka hvaðan sem er og bakktakkinn lokar. Á tölvu eru dyrnar efst við hlið vistfangsins, á síma neðst í seilingu þumals, og þar fyllir heimurinn allan skjáinn milli stikanna.

Áhrif (himinn, mesa-lög með dýpt, ryk og glæður, luktarljós sem fylgir bendlinum, vindur og eldur úr Web Audio) eru hvert um sig sjálfstæð eining í `src/effects/` og slökkva á sér undir `prefers-reduced-motion`.

Á `/crew` er félagalistinn og taflan með því nýjasta af öllum veggjum. Á `/crew/<name>` er veggur hvers félaga: eftirlýsingaspjaldið efst (skinnið í heild, kynning, verðlaun, tölfræði, afrek og það sem viðkomandi byggði), og þar undir allt sem félaginn hefur fest upp, nýjast efst. Hausar og skinn koma frá minotar.net, með mc-heads.net til vara. Sjá **Veggirnir** hér að neðan.

Kóðinn er í `src/components/badlands/`, útlitsreglur í `src/app/badlands.css` og `src/app/board.css`, grunngildi í `src/app/tokens.css` og `src/app/globals.css`. Endurhönnunin er skjalfest í `DESIGN.md`.

## Veggirnir

Hver félagi á vegg á `/crew/<name>`. Á honum hangir hvað sem er: miði, mynd, eða miði með myndum. Ein færsla (`CrewEntry`) er texti, núll eða fleiri myndir með myndatexta hver, staður á kortinu ef við á, luktir þeirra sem kveiktu undir henni og stutt svör frá öðrum félögum. Eldri veggir með aðskildum færslum og myndum eru lesnir í þetta form við lestur (`normalizeProfile` í `src/lib/crew-types.ts`); ekkert þarf að flytja handvirkt.

**Að festa eitthvað upp.** Eigandi veggjarins sér pinnann efst: dragðu skjámyndir hvert sem er á síðuna, límdu þær (Ctrl+V), eða veldu þær; hver mynd fer strax upp í geymsluna (minnkuð í 2560 px WebP í vafranum og send beint í Vercel Blob, eins og í stjórnborðinu), fær myndatexta, og sé hún nefnd eins og leikurinn nefnir skjámyndir (`2026-09-10_20.15.33.png`) er dagsetningin lesin af nafninu. Staður er valinn úr stöðunum á kortinu. Færslu má breyta eftir á: texta, myndatexta, stað, taka myndir niður, og setja eina þeirra á plakatið, þar sem hún stendur fölnuð á bak við spjaldið og á tengilspjaldinu (`/crew/<name>/opengraph-image`) þegar veggnum er deilt.

**Innskráning.** Félagi kemst inn með eigin lykilorði eða með tengli frá stjórnandanum. Stjórnborðið býr til innskráningartengil (og QR-kóða) undir **Hópurinn**; tengillinn gildir í viku og fyrir fimm tæki, og má loka fyrr. Hvert tæki sem opnar hann er skráð inn í eitt ár. Þegar félagi er kominn inn velur hann sér lykilorð á veggnum (hnappurinn „Velja lykilorð“, veggurinn minnir á það þangað til), og eftir það dugar „Þetta er ég“ á hvaða síma eða tölvu sem er. Lykilorðin eru geymd sem scrypt-hass, aðskilin frá veggjunum (Redis, eða `src/data/profiles/_passwords.json` í þróun). Gleymt lykilorð hreinsar stjórnandinn í stjórnborðinu og sendir nýjan tengil. Innskráður félagi sér hausinn sinn logandi í stikunni á öllum síðum og kemst þaðan á vegginn sinn. Aðgangslyklarnir í umhverfisbreytum virka áfram sem varaleið.

**Veggirnir annars staðar.** Í Eftirlýst-herberginu á forsíðunni er „Á töflunni“: það nýjasta af veggjunum, og fjöldi mynda undir hverjum haus. Í heiminum ber staður sem eitthvað hefur verið fest við töluna á flísinni sinni, og póstkortið sýnir myndir félaganna af staðnum, hverja eitt smell frá veggnum sínum. Staður getur líka borið hverjir byggðu hann (stillt í kortaritlinum); póstkortið segir það og veggur hvers og eins telur upp það sem viðkomandi byggði. Einvígið við varðeldinn sendir besta tímann á vegginn þegar félagi er innskráður; sá fljótasti er eftirlýstur sem **Fógetinn**.

## Verkfæri

- **Stjórnborð** (`/admin`): Fjórir flipar. **Þjónn**: staða, leikmenn inni, ræsa, stöðva og endurræsa á Exaroton, uppfærist sjálfkrafa. **Gagnapakkar**: allt um pakkana á einum stað; hvaða pakkar birtast í kaupfélaginu á vefnum (sýna eða fela), röðin á hillunum, uppsett útgáfa, athugun á nýrri útgáfu á Modrinth eða GitHub, lestur skráarheita beint af þjóninum, og eigin pakkar (til dæmis JOÐ-pakkarnir) sem má bæta við, breyta, gefa mynd og eyða. **Myndasafn**: upphleðsla, titlar, röð, sýna eða fela, og tenging við stað á kortinu. **Hópurinn**: félagarnir, hvort þeir hafi valið sér lykilorð (og hnappur til að hreinsa það), hvað hangir á hverjum vegg, opnir innskráningartenglar með notkun og lokun, og nýr tengill með QR-kóða fyrir hvern og einn. **Landakort**: ritill sem sýnir kortið nákvæmlega eins og gestir sjá það. Landslagið sjálft er málað þar: pensill og fylling mála sjó, land, gras, skóg, kletta og sand í kubbaristina, strönd teiknast sjálfkrafa þar sem land mætir sjó, og Shift heldur strokunni beinni. Hver staður getur fengið hnit í heiminum (eins og F3 sýnir þau) og stendur þá sem lukt í þrívíddarkortinu. Að auki: afturköllun, rist, örvatakkar, afritun staða og myndaval. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð.

## Heimskortið

Heimasvæðið í þrívídd, teiknað af BlueMap á þjóninum, er á forsíðunni undir *Heimurinn*; `/heimskort` vísar á skoðarann sjálfan á heilum skjá. Exaroton leyfir ekki fleiri gáttir, svo vefþjónn BlueMap er óvirkur og vefurinn sækir kortið sjálfur í gegnum Exaroton-forritaskilin (`src/app/bluemap/[[...path]]/route.ts`).

Kortið sjálft er teiknað upp úr afriti, svo það hleðst hratt hvort sem þjónninn er í gangi eða ekki. Aðeins staða leikmanna kemur beint frá þjóninum, meðan hann er í gangi. Afritið er sótt svona:

```bash
npm run map:sync            # sækir það sem hefur breyst og sendir það í geymsluna
npm run map:sync -- --full  # sækir allt upp á nýtt
npm run map:sync -- --push  # sendir afritið á tölvunni í geymsluna án þess að tala við Exaroton
npm run map:brand           # merkir skoðarann JOÐ aftur, án þess að sækja neitt
npm run server:size         # hve mikið pláss þjónninn tekur, mappa fyrir möppu (breytir engu)
```

Skoðarinn (um 1,5 MB) fer í `public/bluemap` og fylgir vefnum. Kortagögnin (hundruð MB) fara í `public/bluemap-data`, sem er afrit fyrir þróun og ekki í git, og þaðan í Vercel Blob undir `bluemap-data/`; vefurinn sækir þau þangað um `/bluemap-data`. Skráalisti og slóð geymslunnar eru skrifuð í `src/lib/bluemap-snapshot.json`, sem er í git. Skipunin þarf `BLOB_READ_WRITE_TOKEN` í `.env.local` (sami lykill og fyrir myndirnar, úr Storage á Vercel). Síðan sýnir dagsetningu afritsins. Nýtt afrit birtist á vefnum þegar breytingunum á `public/bluemap`, `src/lib/bluemap-snapshot.json` og `src/lib/bluemap-viewer.json` hefur verið ýtt á GitHub. Best er að keyra skipunina meðan þjónninn er í gangi.

Kyrrmyndin sem heimurinn opnast sem er `public/map-poster.webp`. Hún er tekin af afritinu með `npm run dev` í gangi:

```bash
npm run map:poster
```

Skipunin notar Chrome eða Edge sem er þegar á tölvunni (eða vafrann í `CHROME=<slóð>`); `playwright-core` kemur ekki með eigin vafra.

Upphafssjónarhornið er `MAP_START_VIEW` í `src/components/badlands/data.ts`; það er allt sem stendur á eftir `#` í vistfangi skoðarans þegar búið er að stilla myndina. Keyrðu `map:poster` aftur eftir hverja samstillingu sem breytir heimasvæðinu.

Í `plugins/BlueMap/webapp.conf` á þjóninum þarf að vera `client-decompression: true`, `map-data-root: "/bluemap-data/maps"` og `live-data-root: "maps"`. Fyrsta stillingin lætur skoðarann afpakka þjöppuðu skrárnar sjálfur, hinar tvær láta hann sækja kortið í afritið en stöðu leikmanna til þjónsins. Breytingar á `webapp.conf` birtast á vefnum eftir næstu afritun.

### Skoðarinn í fötum JOÐ

Afritunin skrifar skrár BlueMap yfir `public/bluemap` í hvert sinn, svo síðasta skref hennar merkir skoðarann JOÐ aftur (`scripts/bluemap-brand.mjs`). Það má líka keyra eitt og sér, til dæmis eftir breytingu á `MAP_START_VIEW`:

```bash
npm run map:brand
```

Það skrifar íslenska forsíðu skoðarans (heiti, tákn, tenglaspjald og app-lýsing JOÐ), stillir `settings.json` (útgáfa kortsins, upphafssjónarhornið og sjónlengd sem hæfir teiknaða svæðinu) og gerir íslensku að sjálfgefnu máli. Það sem er okkar liggur þar sem afritunin snertir það ekki:

| Skrá | Hvað |
|---|---|
| `public/bluemap-jod/jod.css` | Útlitið: litir, pixlaletrið, viður, pappír og luktir staðanna |
| `public/bluemap-jod/jod.js` | Plankinn með leiðinni heim, myndavélin haldin yfir teiknaða heiminum, skerpa miðuð við tvo skjápunkta, og samtalið við forsíðuna (framvinda, hlé, nótt, flug á stað) |
| `public/bluemap/lang/is.conf` | Allur texti skoðarans á íslensku |

Afritunin tekur aðeins það sem skoðarinn les. Skrár BlueMap um hvað hefur verið teiknað (`maps/*/rstate`), kort sem skoðarinn sýnir ekki, hausar leikmanna og kóðakort verða eftir á þjóninum. Hausar leikmanna í kortinu koma um `/api/map-head`.

Hvert afrit fær útgáfu (`version` í `src/lib/bluemap-snapshot.json`) og skoðarinn les kortið af `/bluemap-data/<útgáfa>/maps`. Slóð sem nefnir núverandi útgáfu breytist aldrei, svo vafrinn og CDN geyma hvern reit í ár: gestur sem kemur aftur les kortið af eigin diski, og nýtt afrit fær nýjar slóðir um leið og það er komið á vefinn. Staða leikmanna er deild milli gesta í tvær sekúndur og merkin í tíu, svo mörg opin kort kosta eitt kall til Exaroton.

Staður sem fær hnit í kortaritlinum (*Í heiminum (X Y Z)*, eins og F3 sýnir þau) stendur sem lukt í þrívíddarkortinu. Luktunum er bætt við merki BlueMap í `src/app/bluemap/[[...path]]/route.ts`, svo þær birtast líka í merkjalista skoðarans og standa hvort sem þjónninn er í gangi eða ekki.

**Valfrjálst á þjóninum**, í `plugins/BlueMap/maps/world.conf` (síðan `/bluemap reload` og nýtt afrit):

- `render-mask` með hring (`type: "circle"`) í stað kassa: um fimmtungi færri reitir, og heimurinn verður eyja í stað skorins fernings.
- `void-color` og `sky-color`: liturinn undir sjóndeildarhringnum og himinninn. Sé `void-color` látinn vera svartur mýkir `jod.js` hann í himininn.
- `ambient-light` um 0,1–0,2: nóttin verður ekki kolsvört.
- `remove-caves-below-y`: hærra gildi sleppir fleiri lokuðum hellum og minnkar reitina.
- Kort sem vefurinn sýnir ekki (nether, end) má taka úr sambandi svo þjónninn teikni þau ekki.

## Tungumál

Viðmótið, villuskilaboð og sjálfgefnir myndatextar eru á íslensku. Dagsetningar og tölur nota `is-IS`. Það sem félagi skrifar á vegginn sinn er geymt eins og það var slegið inn; React sér um að birta það örugglega.

Auðkenni, slóðir, Minecraft-lyklar, notendanöfn og eiginheiti utanaðkomandi pakka og laga haldast óbreytt.  Í `src/lib/icelandic.ts` eru birtingarheiti fyrir innri auðkenni og samsvaranir fyrir eldri enska myndatexta og kortaheiti. Þekktur eldri texti er þýddur við lestur, án þess að skrifa yfir nýtt efni notenda í gagnagrunni.

## Umhverfisbreytur

Afritaðu `.env.local.example` sem `.env.local` og fylltu inn gildin.

| Breyta | Lýsing |
|---|---|
| `EXAROTON_API_KEY` | Exaroton-aðgangslykill fyrir stöðu þjónsins, stjórnun og tölfræði leikmanna |
| `EXAROTON_SERVER_ID` | Auðkenni þjónsins á exaroton.com; valfrjálst, sparar auka uppflettingu |
| `BLUEMAP_WEBROOT` | Mappa vefs BlueMap á þjóninum ef hún er ekki `bluemap/web` (`webroot` í `webapp.conf`); valfrjálst, `map:sync` finnur hana sjálft og segir til ef þarf að setja hana í Vercel |
| `ADMIN_TOKEN` | Lykilorð að stjórnborðinu á `/admin`, að minnsta kosti 8 stafir |
| `GITHUB_TOKEN` | Hefðbundinn GitHub-aðgangslykill án aðgangssviða; hækkar fyrirspurnamörk við athugun gagnapakka, valfrjálst |
| `CREW_TOKEN_<USERNAME>` | Aðgangslykill hvers félaga, t.d. `CREW_TOKEN_STEBBIAS=...`; varaleið, innskráningartenglar úr stjórnborðinu þurfa engan |
| `NEXT_PUBLIC_SITE_URL` | Valfrjálst; slóð vefsins í innskráningartenglum, annars slóðin sem stjórnborðið var opnað á |
| `REDIS_URL` | Redis-tenging fyrir prófíla, færslur, myndalýsigögn og vistuð tölfræðigögn |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob-aðgangur fyrir myndir sem er hlaðið upp og fyrir kortagögnin. Geymslan má vera opin eða lokuð; myndir úr lokaðri geymslu eru birtar um `/api/blob/…` og kortagögn um `/bluemap-data/…` |
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
npm test                                    # einingaprófin (vitest) í src/lib/__tests__
npx tsc --noEmit
npm run build
node scripts/shots.mjs shots / /crew        # skjámyndir og yfirflæðisathugun á 1440 og 390 px
SECTIONS=1 WIDTHS=390,1440 node scripts/shots.mjs shots /   # ein mynd á hvern hluta
REDUCE=1 node scripts/shots.mjs shots-reduce /             # með prefers-reduced-motion
```

## Bæta við félaga

1. Bættu notandanafninu við `CREW_USERNAMES` í `src/lib/crew-types.ts`.
2. Bættu því við `CREW` í `src/components/badlands/data.ts`.
3. Búðu til innskráningartengil í stjórnborðinu undir **Hópurinn**, eða stilltu `CREW_TOKEN_<UPPERCASE_USERNAME>` í umhverfisbreytunum.

## Gagnapakkar

Grunnlistinn er í `src/data/datapacks.ts`. Allt sem er breytt í stjórnborðinu (eigin pakkar, sýnileiki, röð, uppsett útgáfa, mynd) vistast í Redis og er lesið saman við grunnlistann í `src/lib/datapacks-store.ts`. Vefurinn sækir listann um `/api/datapacks`, svo faldir pakkar birtast ekki og eigin pakkar birtast strax.

Stilltu hvern pakka í grunnlistanum eða í stjórnborðinu:

- `source: 'modrinth'` og `modrinthSlug`: athugar Modrinth.
- `source: 'github'` og `githubRepo` (`owner/repo`): athugar útgáfur á GitHub.
- `source: 'manual'`: engin sjálfvirk athugun.

Settu `currentVersion` á þá útgáfu sem er uppsett á þjóninum.
