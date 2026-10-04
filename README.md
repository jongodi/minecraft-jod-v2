# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk; `framer-motion` sér aðeins um bendlahreyfingar (kort, myndir, valmynd).

## Vefurinn

Vefurinn er eitt kvöld á þjóninum. Gesturinn kemur að sólsetri yfir Minecraft-eyðimörk (badlands) og skrunar inn í nóttina; þegar bærinn kveikir á luktunum. Skrun er tími sem líður. Síðan er tveir skjáir og varðeldur: sólsetrið, heimurinn, og allt annað opnast yfir heiminum. Hönnunin er skjalfest í `DESIGN.md`.

Fimm reglur halda útlitinu saman: terracotta-lög eyðimerkurinnar eru skilrúm og grunnur merkisins; gulbrúnt luktarljós er eingöngu á því sem hægt er að smella á; allt letur er teiknað á pixlarist, og pixlaleturgerðin sjálf er á öllum stuttum strengjum (valmynd, hnappar, myndatextar, merkimiðar, tölur og það sem þjónninn segir); pappír er fyrir það sem var fest upp (tölfræði, uppsettir pakkar, leiðin inn); og yfirborð eru hlý og dökk, aldrei kaldgrá.

Letur: Alfa Slab One fyrir fyrirsagnir, Pixelify Sans fyrir meginmál og Silkscreen fyrir merkimiða og gögn — allar þrjár teiknaðar á pixlarist. Þær fylgja vefnum í gegnum `@fontsource` og eru hlaðnar með `next/font/local`. Allir litir, stærðir, bil og tímasetningar eru í `src/app/tokens.css`.

| Hluti | Innihald |
|---|---|
| Sólsetur | Merkið, vistfangið sem er afritað með einum smelli, og lukt með stöðu þjónsins, útgáfu og hausum þeirra sem eru inni. Luktin veit líka hvort þjónninn er að vakna, slokkna eða hrundi, og sé slökkt á honum segir hún hvenær hann logaði síðast og hverjir voru inni þá. Undir henni er línan um næsta spilakvöld, sem telur niður á sjálfan daginn. Himinninn dökknar og stjörnurnar koma með skruni. |
| Heimurinn | Þrívíddarkortið af heimasvæðinu fyllir skjáinn undir mesunum. Það opnast sem kyrrmynd; skoðarinn sjálfur (BlueMap, í fötum JOÐ) hleðst ekki fyrr en ýtt er á luktina, og kyrrmyndin víkur um leið og landslagið undir henni er komið; nákvæmu reitirnir streyma svo inn. Á síma verður ramminn að heilum skjá og bakhnappurinn skilar gestinum aftur á síðuna. Staðirnir liggja í röð neðst með myndunum sínum; veldu stað og póstkortið hans birtist, og hafi staðurinn hnit í heiminum flýgur myndavélin þangað og luktin hans logar í þrívíddinni. Kortið opnast að nóttu svo ljósin í bænum loga, og *Nótt* hleypir sólinni aftur upp, *Teiknað kort* leggur málaða kortið yfir sama ramma, *Myndir* opnar allan vegginn og *Heill skjár* gerir rammann sjálfan að heilum skjá. |
| Eftirlýst | Herbergi hópsins, sem opnast yfir heiminum (önnur dyrnar í valmyndinni, staðaluktin eða `/#hopur`): myndir af átta félögum í einni röð, lukt logar á bak við þau sem eru inni. Þar undir eftirlýsingaspjöldin á einni rennibraut, eitt fyrir hvern tölfræðiflokk með þremur efstu: viðurnefni þrjótsins efst (Innipúkinn, Slátrarinn, Draugurinn, Ódauðlegi, Vökustaurinn, Flakkarinn, Boxpúðinn, Ræningjabaninn, Plötusnúðurinn), sökin þar undir, sá fyrsti stór og annar og þriðji í tveimur línum undir strikinu, og neðst sá sem bætti mestu við sig í vikunni, reiknað úr daglegu afritunum. Öll tölfræðin er á síðu hvers og eins. |
| Á hillunni | Hitt herbergið (þriðju dyrnar eða `/#hillan`). Hver uppsettur gagnapakki er lítill kassi með sinni pixlateikningu; sá sem þú bendir á fær miðann sinn lesinn upp á búðarborðinu fyrir neðan. |
| Varðeldurinn | Ein landræma neðst: varðeldur á jörðinni með ljósinu sínu og glæðum, og fjöllin úr sólsetrinu aftur sem dökk útlína. Hópurinn, stjórnborðið, umhverfishljóðið og leiðin aftur upp í sólsetrið. Smelltu á eldinn: þar býr einvígið, viðbragðsleikur í þremur umferðum. |

Valmyndin er þrjár dyr, hver sín lukt: Heimurinn, Eftirlýst, Hillan. Fyrstu dyrnar eru heimurinn sjálfur; hinar tvær eru herbergi sem rísa upp frá neðri brún kortarammans og skilja heiminn eftir í sýn fyrir ofan. Luktin logar meðan gesturinn er inni um þær dyr. Kjölfestan (`#hopur`, `#hillan`) segir hvaða herbergi er opið, svo tenglar virka hvaðan sem er og bakktakkinn lokar. Á tölvu eru dyrnar efst við hlið vistfangsins, á síma neðst í seilingu þumals, og þar fyllir heimurinn allan skjáinn milli stikanna.

Áhrif (himinn, mesa-lög með dýpt, ryk og glæður, luktarljós sem fylgir bendlinum, vindur og eldur úr Web Audio) eru hvert um sig sjálfstæð eining í `src/effects/` og slökkva á sér undir `prefers-reduced-motion`.

Á `/crew` er félagalistinn og taflan með því nýjasta af öllum veggjum. Á `/crew/<name>` er veggur hvers félaga: eftirlýsingaspjaldið efst (skinnið í heild, kynning, verðlaun, tölfræði, afrek og það sem viðkomandi byggði), og þar undir allt sem félaginn hefur fest upp, nýjast efst. Hausar og skinn koma frá minotar.net, með mc-heads.net til vara. Sjá **Veggirnir** hér að neðan.

Kóðinn er í `src/components/badlands/`, útlitsreglur í `src/app/badlands.css` og `src/app/board.css`, grunngildi í `src/app/tokens.css` og `src/app/globals.css`. Endurhönnunin er skjalfest í `DESIGN.md`.

## Veggirnir

Hver félagi á vegg á `/crew/<name>`. Á honum hangir hvað sem er: miði, mynd, eða miði með myndum. Ein færsla (`CrewEntry`) er texti, núll eða fleiri myndir með myndatexta hver, staður á kortinu ef við á, luktir þeirra sem kveiktu undir henni og stutt svör frá öðrum félögum. Eldri veggir með aðskildum færslum og myndum eru lesnir í þetta form við lestur (`normalizeProfile` í `src/lib/crew-types.ts`); ekkert þarf að flytja handvirkt.

**Að festa eitthvað upp.** Eigandi veggjarins sér pinnann efst: dragðu skjámyndir hvert sem er á síðuna, límdu þær (Ctrl+V), eða veldu þær; hver mynd fer strax upp í geymsluna (minnkuð í 2560 px WebP í vafranum og send beint í Vercel Blob, eins og í stjórnborðinu), fær myndatexta, og sé hún nefnd eins og leikurinn nefnir skjámyndir (`2026-09-10_20.15.33.png`) er dagsetningin lesin af nafninu. Staður er valinn úr stöðunum á kortinu. Færslu má breyta eftir á: texta, myndatexta, stað, taka myndir niður, og setja eina þeirra á plakatið, þar sem hún stendur fölnuð á bak við spjaldið og á tengilspjaldinu (`/crew/<name>/opengraph-image`) þegar veggnum er deilt.

**Innskráning.** Félagi kemst inn með eigin lykilorði eða með tengli frá stjórnandanum. Stjórnborðið býr til innskráningartengil (og QR-kóða) undir **Hópurinn**; tengillinn gildir í viku og fyrir fimm tæki, og má loka fyrr. Hvert tæki sem opnar hann er skráð inn í eitt ár. Þegar félagi er kominn inn velur hann sér lykilorð á veggnum (hnappurinn „Velja lykilorð“, veggurinn minnir á það þangað til), og eftir það dugar „Þetta er ég“ á hvaða síma eða tölvu sem er. Lykilorðin eru geymd sem scrypt-hass, aðskilin frá veggjunum (Redis, eða `src/data/profiles/_passwords.json` í þróun). Gleymt lykilorð hreinsar stjórnandinn í stjórnborðinu og sendir nýjan tengil. Sé netfang skráð á félagann getur hann líka beðið sjálfur um tengil í pósti („Senda mér innskráningartengil í pósti“ undir „Þetta er ég“); sjá **Póstur** hér að neðan. Innskráður félagi sér hausinn sinn logandi í stikunni á öllum síðum og kemst þaðan á vegginn sinn. Aðgangslyklarnir í umhverfisbreytum virka áfram sem varaleið.

**Nafn og netfang.** Undir „Nafn og netfang“ á eigin vegg skráir félagi netfangið sitt, velur hvort hann vill póst um spilakvöld, og gefur nafnið sem bréfin kalla hann (til dæmis fornafnið) í stað Minecraft-nafnsins. Stjórnandinn getur líka skráð hvort tveggja í stjórnborðinu, svo hægt sé að senda tengil þeim sem hefur aldrei komið inn. Hvort tveggja er geymt aðskilið frá veggjunum (Redis, eða `src/data/profiles/_emails.json` og `_names.json` í þróun); aðeins eigandinn og stjórnandinn sjá það, og nafnið sést aðeins í bréfunum, aldrei á vefnum. Án nafns nota bréfin notandanafnið.

**Veggirnir annars staðar.** Í Eftirlýst-herberginu á forsíðunni er „Á töflunni“: það nýjasta af veggjunum, og fjöldi mynda undir hverjum haus. Í heiminum ber staður sem eitthvað hefur verið fest við töluna á flísinni sinni, og póstkortið sýnir myndir félaganna af staðnum, hverja eitt smell frá veggnum sínum. Staður getur líka borið hverjir byggðu hann (stillt í kortaritlinum); póstkortið segir það og veggur hvers og eins telur upp það sem viðkomandi byggði. Einvígið við varðeldinn sendir besta tímann á vegginn þegar félagi er innskráður; sá fljótasti er eftirlýstur sem **Fógetinn**.

## Verkfæri

- **Stjórnborð** (`/admin`): Fjórir flipar. **Þjónn**: staða, leikmenn inni, ræsa, stöðva og endurræsa á Exaroton, uppfærist sjálfkrafa; afritun þrívíddarkortsins á vefinn, og grunnkortin (*Grunnkortin*), hvert sent á vefinn með einum hnappi eða öll í einu. **Gagnapakkar**: allt um pakkana á einum stað; hvaða pakkar birtast í kaupfélaginu á vefnum (sýna eða fela), röðin á hillunum, uppsett útgáfa, athugun á nýrri útgáfu á Modrinth eða GitHub, lestur skráarheita beint af þjóninum, og eigin pakkar (til dæmis JOÐ-pakkarnir) sem má bæta við, breyta, gefa mynd og eyða. **Myndasafn**: upphleðsla, titlar, röð, sýna eða fela, og tenging við stað á kortinu. **Hópurinn**: félagarnir, nafn og netfang hvers og eins (sett inn, breytt eða fjarlægt), hvort þeir hafi valið sér lykilorð (og hnappur til að hreinsa það), hvað hangir á hverjum vegg, opnir innskráningartenglar með notkun og lokun, og nýr tengill með QR-kóða fyrir hvern og einn, eða sendur beint í pósti („Senda í pósti“). **Landakort**: ritill sem sýnir kortið nákvæmlega eins og gestir sjá það. Landslagið sjálft er málað þar: pensill og fylling mála sjó, land, gras, skóg, kletta og sand í kubbaristina, strönd teiknast sjálfkrafa þar sem land mætir sjó, og Shift heldur strokunni beinni. Hver staður getur fengið hnit í heiminum (eins og F3 sýnir þau) og stendur þá sem lukt í þrívíddarkortinu. Að auki: afturköllun, rist, örvatakkar, afritun staða og myndaval. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð.

## Póstur

Vefurinn sendir póst frá `hallo@jodcraft.world` í gegnum [Resend](https://resend.com) (`src/lib/email.ts`). Lénið er staðfest þar með DNS-færslum á `send.jodcraft.world` og `resend._domainkey`, sem eru í DNS-stillingum lénsins á Vercel. Án `RESEND_API_KEY` er ekkert sent; lykillinn er aðeins stilltur fyrir Production, svo forskoðanir senda ekkert.

| Bréf | Hverjum | Hvenær |
|---|---|---|
| Innskráningartengill | félaganum sjálfum | þegar stjórnandinn ýtir á „Senda í pósti“, eða félaginn biður um hann undir „Þetta er ég“ (mest þrír á klukkutíma) |
| Bál kveikt | öllum nema þeim sem kveikti | strax, meðan bálið er nýtt |
| Kvöldið ákveðið | öllum nema þeim sem valdi | þegar kvöld með fleiri en einum tíma er ákveðið, af þeim sem kveikti eða sjálfkrafa; með tengli í dagatalið |
| Hálftími í bál | þeim sem sögðust mæta | frá hálftíma áður, þegar hægt er að kveikja á þjóninum |
| Bálið slokknaði | þeim sem sögðust geta mætt | þegar kvöldinu er aflýst |

**Orðin og útlitið.** Allt sem bréfin segja (efnislína, forsýnarlínan sem pósthólfið sýnir, myndin efst, fyrirsögn, textinn, hnappurinn, vísan og smáa letrið) er á einum stað, í `src/lib/email-copy.ts`, á rödd vefsins. Bréfin eru frá **JOÐcraft**, og hverju þeirra fylgir ferskeytla (`VERSES`), með stuðlum og höfuðstöfum, í skáletri neðst. Hvert bréf klæðist öðru af tveimur útlitum (`src/lib/email-design.ts`): **Sólsetur** (himinn og mesa í myndinni, orðin á pappír) eða **Varðeldur** (stjörnur og varðeldur í myndinni, ljós orð á dökkum viði). Hvert bréf er eitt spjald, 600 px á breidd, með myndina efst og dökka rönd með nafni vefsins neðst, og situr á bakgrunni póstforritsins sjálfs, svo stutt bréf passar á skjáinn án þess að skruna. Sjálfgefið eru bréf dagsins í sólsetri og bréf kvöldsins við eldinn; í stjórnborðinu undir **Póstur** sést hvert bréf eins og það berst, með tilbúnum orðum, þar er útlit hvers bréfs valið (geymt í Redis) og prufa send á hvaða netfang sem er. Rofinn „Sýna eins og Gmail“ sýnir bréfin án letur vefsins, eins og Gmail og Outlook sýna þau.

Myndin efst í hverju bréfi er teiknuð á `/api/mail-art` með letri vefsins, eins og tengilspjöldin, og ber fyrirsögn bréfsins sjálfs („Söðlaðu hestinn, Jóna“), svo það sem mest ber á er eins í öllum póstforritum, Gmail líka. Slóð myndarinnar er undirrituð (með `MAIL_ART_SECRET`, eða `CRON_SECRET` sé hann ekki til), svo vefurinn teiknar aðeins orð sem hann skrifaði sjálfur; án lykils, eða með úreltri undirskrift, segir myndin titil bréfsins og fyrirsögnin stendur á pappírnum. Textinn undir biður um sama letur (`public/email-fonts`); Apple Mail og fleiri sýna það, en Gmail og Outlook sýna ekkert sérletur, svo staðgenglarnir eru valdir til að halda svipnum: Verdana í texta og feitletraðir hástafir í merkimiðum, tímum og hnöppum.

Bréfin um spilakvöld fá aðeins þau sem hafa skráð netfang og ekki afþakkað þau (`src/lib/night-mail.ts`). Þau eru send strax eftir að bál er kveikt, valið eða slökkt, og verkið `/api/cron/nights` (á fimm mínútna fresti, sjá `vercel.json`) sendir það sem eftir stendur: kvöld sem var ákveðið sjálfkrafa og hálftímann fyrir kvöldið. Hvert bréf er merkt í Redis áður en það fer, svo það fer aðeins einu sinni; bréf sem komst ekki til skila er reynt aftur í næstu umferð. Tíðara verk en einu sinni á dag þarf Vercel Pro.

Svör við bréfunum fara á `hallo@jodcraft.world`. Til að lesa þau og svara úr Gmail er pósturinn áframsendur þangað (til dæmis með ImprovMX: MX-færslur á rót lénsins), og í Gmail er `hallo@jodcraft.world` bætt við undir „Send mail as“ með `smtp.resend.com`, gátt 587, notandanafni `resend` og Resend-lykli sem lykilorði.

## Heimskortið

Heimasvæðið í þrívídd, teiknað af BlueMap á þjóninum, er á forsíðunni undir *Heimurinn*; `/heimskort` vísar á skoðarann sjálfan á heilum skjá. Exaroton leyfir ekki fleiri gáttir, svo vefþjónn BlueMap er óvirkur og vefurinn sækir kortið sjálfur í gegnum Exaroton-forritaskilin (`src/app/bluemap/[[...path]]/route.ts`).

Kortið sjálft er teiknað upp úr afriti, svo það hleðst hratt hvort sem þjónninn er í gangi eða ekki. Aðeins staða leikmanna kemur beint frá þjóninum, meðan hann er í gangi. Afritið er sótt svona:

```bash
npm run map:sync            # sækir það sem hefur breyst og sendir það í geymsluna
npm run map:sync -- --full  # sækir allt upp á nýtt
npm run map:sync -- --push  # sendir afritið á tölvunni í geymsluna án þess að tala við Exaroton
npm run map:brand           # merkir skoðarann JOÐ aftur, án þess að sækja neitt
npm run map:warm            # hleður öllu kortinu í gegnum vefinn svo Vercel eigi það tilbúið (breytir engu)
npm run server:size         # hve mikið pláss þjónninn tekur, mappa fyrir möppu (breytir engu)
```

Skoðarinn (um 1,5 MB) fer í `public/bluemap` og fylgir vefnum. Kortagögnin (hundruð MB) fara í `public/bluemap-data`, sem er afrit fyrir þróun og ekki í git, og þaðan í Vercel Blob undir `bluemap-data/packs/`, lagt saman í fáa stóra pakka (allt að 64 MB), því hver sending telst í mánaðarkvóta geymslunnar ("Advanced Operations" á Hobby): afrit kostar þannig um fimm aðgerðir í stað einnar á hverja skrá, og ekkert er sent ef kortið hefur ekki breyst. Skrárnar eru lagðar í pakkana bæti fyrir bæti og vefurinn les hverja þeirra aftur úr sínum pakka um `/bluemap-data`, svo kortið er nákvæmlega eins og BlueMap teiknaði það. Skráalisti, staður hverrar skrár í pökkunum og slóð geymslunnar eru skrifuð í `src/lib/bluemap-snapshot.json`, sem er í git. Pakkarnir sem vefurinn á GitHub les eru aldrei fjarlægðir; eldri pakkar fara við næsta afrit. Svari geymslan ekki (til dæmis ef Vercel hefur sett hana í bið) les vefurinn kortið beint af þjóninum á meðan, og Vercel geymir hverja skrá sem þannig er sótt í mánuð. `npm run map:warm` sækir allt kortið þannig í einu, svo það opnist fljótt líka meðan þjónninn er stopp: keyrðu það eftir að nýjasta útgáfa vefsins er komin í loftið, og aftur eftir hverja nýja útgáfu. Skipunin þarf `BLOB_READ_WRITE_TOKEN` í `.env.local` (sami lykill og fyrir myndirnar, úr Storage á Vercel). Síðan sýnir dagsetningu afritsins. Nýtt afrit birtist á vefnum þegar breytingunum á `public/bluemap`, `src/lib/bluemap-snapshot.json` og `src/lib/bluemap-viewer.json` hefur verið ýtt á GitHub.

**Þjónninn má vera slökktur.** Exaroton afhendir skrár slökkts þjóns jafn hratt og þjóns í gangi. Fyrsta afritun grunnkortanna (4. október 2026, af slökktum þjóni) sótti 1.269 skrár (1,5 GB) Joðville á 5 mínútum, 4 til 6 skrár á sekúndu milli hléa, og afritun aðalkortsins meðan þjónninn var í gangi (28. september) um 6. Það sem ræður hraðanum er hve oft Exaroton leyfir að spurt sé: það biður um mínútuhlé á nokkurra mínútna fresti, og þriðjungur til helmingur tímans fer í þau, hvort sem þjónninn er í gangi eða ekki. Öll afritun, bæði `map:sync`, `map:bases` og verkin á GitHub, keyrir því óháð stöðu þjónsins.

**Afritun úr stjórnborðinu.** GitHub Action (`.github/workflows/map-sync.yml`) keyrir `map:sync` þegar hún er ræst: með hnappnum „Afrita kortið núna“ í stjórnborðinu (Þjónn → Þrívíddarkortið), sem sýnir líka síðustu keyrslur, eða á GitHub undir Actions → Map sync → Run workflow. Hnappurinn þarf `MAP_SYNC_GITHUB_TOKEN` í Vercel. Hún keyrir hvort sem þjónninn er í gangi eða ekki; keyrsla sem er ræst meðan hann er slökktur heitir „Map sync, server off“ og stjórnborðið merkir hana. Hafi BlueMap engu breytt síðan síðast gerir hún ekkert og snertir hvorki geymsluna né git. Annars sendir hún nýju pakkana í geymsluna og ýtir afritinu á `main`, og Vercel birtir það. Hún geymir afritið sitt á milli keyrslna í skyndiminni GitHub, svo hún sækir aðeins það sem BlueMap hefur teiknað upp á nýtt. Dagsetningin á vefnum er þá sú síðasta sem kortið breyttist. Hún þarf tvö leyndarmál undir Settings → Secrets and variables → Actions → Repository secrets: `EXAROTON_API_KEY` og `BLOB_READ_WRITE_TOKEN`, þau sömu og í `.env.local`. Hafi afritunin breytt kortinu tekur hún líka nýja kyrrmynd af því (`npm run map:poster`, `public/map-poster.webp`), sem forsíðan opnar á; mistakist það er afritið samt birt, með gömlu myndinni.

Kyrrmyndin sem heimurinn opnast sem er `public/map-poster.webp`, tekin að nóttu eins og kortið opnast og teiknuð í fullri upplausn út að jaðri heimsins. Hún er tekin af afritinu með `npm run dev` í gangi:

```bash
npm run map:poster
```

Skipunin notar Chrome eða Edge sem er þegar á tölvunni (eða vafrann í `CHROME=<slóð>`); `playwright-core` kemur ekki með eigin vafra.

Upphafssjónarhornið er `MAP_START_VIEW` í `src/components/badlands/data.ts`; það er allt sem stendur á eftir `#` í vistfangi skoðarans þegar búið er að stilla myndina. Afritunin á GitHub tekur nýja kyrrmynd sjálf þegar kortið breytist; eftir afritun úr eigin tölvu (`npm run map:sync`) þarf að keyra `map:poster` í höndunum.

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

### Grunnkortin

Hinar stöðvarnar (Joðville, Faraway lands, Bústaður og Shroomy island, í `src/lib/map-bases.json`) eiga hver sitt litla BlueMap-kort, aðskilið frá aðalkortinu, og sinn skoðara á vefnum á `/kort/<id>`, til dæmis `/kort/jodville`. Undir heiminum á forsíðunni er röðin *Aðrar stöðvar* með tengli á hverja stöð sem komin er á vefinn, og póstkort staðar sem stendur innan stöðvar býður kort hennar (*Joðville í þrívídd*).

```bash
npm run map:bases                       # sýnir stillingarnar sem yrðu skrifaðar á þjóninn
npm run map:bases -- --write [id...]    # skrifar þær sem vantar á þjóninn (--force skrifar líka yfir)
npm run map:bases -- --redraw <id...>   # skrifar stillingu korts upp á nýtt, hreinsar það og teiknar frá grunni
npm run map:bases -- --freeze           # frystir öll grunnkortin
npm run map:bases -- --refresh <id>     # affrystir eitt kort og teiknar það sem hefur breyst
npm run map:bases -- --inspect [id...]  # sýnir hvernig hvert kort er teiknað hjá aðalkortinu, breytir engu
npm run map:bases -- --upload [id...]   # afritar kortin á vefinn (öll ef ekkert er nefnt)
npm run map:bases -- --prune [id...]    # fjarlægir afrit sem vefurinn les ekki lengur
```

Kortin uppfærast aldrei sjálf: þau eru fryst og aðeins teiknuð upp á nýtt þegar beðið er um það. Til að uppfæra eitt:

1. **Teikna upp á nýtt** við kortið í stjórnborðinu (Þjónn → Grunnkortin), eða `npm run map:bases -- --redraw <id>`, og bíða þar til teikningunni er lokið (`/bluemap` í leiknum sýnir framvinduna). Þjónninn þarf að vera í gangi.
2. **Frysta grunnkortin**, eða `npm run map:bases -- --freeze`
3. senda það á vefinn: hnappurinn **Senda** við kortið í stjórnborðinu (Þjónn → Grunnkortin), sem gerir allt hitt sjálfur; eða úr eigin tölvu:
   1. `npm run map:bases -- --upload <id>`
   2. `git add src/lib/map-bases/<id>.json`, commit og push
   3. þegar vefurinn er kominn upp með því: `npm run map:bases -- --prune <id>`

**Eigin teiknistillingar.** Grunnkort er teiknað eins og aðalkortið, nema stöð hafi sínar eigin BlueMap-stillingar undir `bluemap` í `src/lib/map-bases.json`; þær eru settar ofan á stillingar aðalkortsins (`scripts/bluemap-conf.mjs`) og taka gildi þegar kortið er teiknað upp á nýtt. Joðville er þannig: öll kortin fela hella undir Y 62 (`remove-caves-below-y`), sem hentar jörð rétt ofan við það, en Joðville stendur í fjöllum í Y 128 og allir hellar inni í þeim voru teiknaðir, svo reitirnir urðu um níu sinnum þyngri en aðalkortsins. Joðville felur því hella alls staðar (`remove-caves-below-y: 10000`, eins og [wiki BlueMap](https://github.com/BlueMap-Minecraft/BlueMapWiki/blob/master/wiki/configs/Maps.md) bendir á); yfirborðið heldur sér (`cave-detection-ocean-floor: -5`), og upplýstar byggingar neðanjarðar líka (`cave-detection-uses-block-light: true`). *Teikna upp á nýtt* skrifar stillingu kortsins á þjóninn (stærð þess líka, `radius`), endurhleður BlueMap (`/bluemap reload light`) og hreinsar kortið (`/bluemap purge`): teiknaðir reitir þess eru fjarlægðir og það teiknað aftur frá grunni, svo ekkert verði eftir utan minna svæðis. Þar til teikningunni er lokið er afritið á þjóninum ófullgert, en afritið á vefnum óbreytt; sendu það því ekki fyrr en henni er lokið. `--inspect` sýnir teiknistillingar hvers korts hjá aðalkortinu og hve þungir fyrstu reitirnir eru (líka sem `inspect` á GitHub: Actions → Map bases).

**Úr stjórnborðinu.** Hnapparnir ræsa GitHub Action (`.github/workflows/map-bases.yml`), eins og afritun aðalkortsins gerir: með einu korti, eða *Senda öll grunnkortin*. Verkið sendir kortin (`--upload`), ýtir nýju skráalistunum á `main` svo Vercel birti þau, bíður þar til Vercel segir nýju útgáfuna komna í loftið og fjarlægir þá afritin sem hún leysti af hólmi (`--prune`). Það þarf sömu tvö leyndarmál og Map sync (`EXAROTON_API_KEY` og `BLOB_READ_WRITE_TOKEN` undir Settings → Secrets and variables → Actions) og hnappurinn sama `MAP_SYNC_GITHUB_TOKEN` í Vercel. Þjónninn má vera slökktur (sjá *Þjónninn má vera slökktur* að ofan): keyrsla sem er ræst á meðan heitir þá „server off“ og stjórnborðið merkir hana. Skráin á GitHub segir hve lengi hvert skref tók: möppurnar lesnar, skrárnar sóttar, hvert kort alls, og hve mikið af öllu var bið eftir exaroton. Fyrsta afritun allra fjögurra (2,1 GB) tók 15 mínútur. Það má líka ræsa á GitHub undir Actions → Map bases → Run workflow. Mistakist eitt kort fara hin samt upp.

`--upload` ber fyrst kortið á þjóninum saman við afritið á vefnum: skráalistann og stærð reitanna við skráalistann í `src/lib/map-bases/<id>.json`, og litlu skrárnar bæti fyrir bæti við það sem er í geymslunni. Sé það eins er ekkert sótt og ekkert sent (`--force` sendir samt), hvort sem afritunin er keyrð úr eigin tölvu eða á GitHub. Annars sækir hún möppu kortsins (`bluemap/web/maps/<id>`) af þjóninum í `scripts/out/map-bases/` (ekki í git), aðeins það sem hefur breyst síðan það var síðast sótt þangað, og sendir það í Vercel Blob í fáum pökkum undir `bluemap-bases/<id>/`, eins og aðalkortið er sent. Skráalistinn, staður hverrar skrár í pökkunum og útgáfan fara í `src/lib/map-bases/<id>.json`. Skipunin les og eyðir aðeins undir `bluemap-bases/<id>/`; `map:sync` og Map sync-verkið lesa aðeins `bluemap-data/`, svo hvorugt getur snert gögn hins. Pakkar sem vefurinn gæti enn verið að lesa eru aldrei fjarlægðir: nýja afritið, það sem það leysir af hólmi og það sem síðasta commit og `origin/main` nefna. `--prune` fjarlægir svo eldra afritið þegar nýja er komið í loftið. Skipanirnar þurfa `EXAROTON_API_KEY` og `BLOB_READ_WRITE_TOKEN` í `.env.local`. `--upload` virkar hvort sem þjónninn er í gangi eða ekki og segir hvort var, og hve lengi hvert skref tók.

Skoðarinn á `/kort/<id>` er sami skoðari og á `/bluemap`, í sömu fötum, smíðaður með vefnum sem fastar skrár: hann sýnir aðeins kort stöðvarinnar, les það úr afriti hennar um `/bluemap-data`, opnast yfir miðju stöðvarinnar úr sömu fjarlægð og sama horni og aðalkortið (eða á eigin sjónarhorni stöðvarinnar, `view` í `src/lib/map-bases.json`: allt á eftir `jodville:` í vistfangi skoðarans þegar búið er að stilla myndina), og myndavélinni er haldið yfir teiknaða svæðinu. Leikmenn og luktir staðanna koma um `/bluemap` eins og á aðalkortinu. Stöð sem hefur ekki verið afrituð á vefinn hefur engan skoðara og engan tengil. Séu fyrstu nákvæmu reitir korts miklu þyngri en aðalkortsins (reitirnir sem sími hleður fyrst, umhverfis upphafsstaðinn) sækir skoðarinn minna svæði af þeim, svo síminn haldi álíka þunga í minninu: Joðville í fjöllunum var um níu sinnum þyngra, og byrjaði því á 3×3 reitum í stað 11×11, þar til það er teiknað upp á nýtt með eigin stillingum sínum (sjá *Eigin teiknistillingar*). Þetta er reiknað úr skráalistunum þegar vefurinn er smíðaður (`heaviness` í `scripts/bluemap-brand.mjs`) og gæðavalið í skoðaranum fylgir því.

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
| `CRON_SECRET` | Langur handahófskenndur lykilstrengur; Vercel sendir hann með tímasettu verkunum (sjá `vercel.json`): daglega verkinu (`/api/cron/daily`), sem geymir tölfræði hópsins einu sinni á dag, og póstverkinu (`/api/cron/nights`), sem sendir bréfin um spilakvöld. Verkin hafna öllum beiðnum án hans |
| `MAP_SYNC_GITHUB_TOKEN` | Fínstilltur GitHub-aðgangslykill að þessu repói með „Actions: Read and write“; hnappurinn sem afritar þrívíddarkortið úr stjórnborðinu ræsir Map sync-verkið með honum |
| `GITHUB_TOKEN` | Hefðbundinn GitHub-aðgangslykill án aðgangssviða; hækkar fyrirspurnamörk við athugun gagnapakka, valfrjálst |
| `CREW_TOKEN_<USERNAME>` | Aðgangslykill hvers félaga, t.d. `CREW_TOKEN_STEBBIAS=...`; varaleið, innskráningartenglar úr stjórnborðinu þurfa engan |
| `NEXT_PUBLIC_SITE_URL` | Valfrjálst; slóð vefsins í innskráningartenglum og pósti, annars slóðin sem stjórnborðið var opnað á (og `https://jodcraft.world` í pósti) |
| `RESEND_API_KEY` | Resend-lykill („Sending access“, aðeins `jodcraft.world`) fyrir innskráningartengla og bréf um spilakvöld; merktur „Sensitive“ og aðeins fyrir Production. Án hans er enginn póstur sendur |
| `EMAIL_FROM` | Valfrjálst; sendandi bréfanna, sjálfgefið `JOÐcraft <hallo@jodcraft.world>` |
| `EMAIL_REPLY_TO` | Valfrjálst; hvert svör við bréfunum fara, ef ekki á sendandann |
| `MAIL_ART_SECRET` | Valfrjálst; lykill sem undirritar fyrirsagnirnar í myndum bréfanna. Án hans er `CRON_SECRET` notaður. Sé honum breytt missa eldri bréf fyrirsögnina úr myndinni (titillinn kemur í staðinn) |
| `REDIS_URL` | Redis-tenging fyrir prófíla, færslur, myndalýsigögn, vistuð tölfræðigögn, spilakvöld og hvenær þjónninn logaði síðast |
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
npm test                                    # einingaprófin (vitest) í __tests__-möppunum undir src
npx tsc --noEmit
npm run build
node scripts/perf.mjs fyrir /               # skrunhraði, stíll og myndir, á tölvu og hægum síma
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
