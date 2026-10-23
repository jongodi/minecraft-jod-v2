# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk; `framer-motion` sér aðeins um bendlahreyfingar (kort, myndir, valmynd).

## Vefurinn

Vefurinn er eitt kvöld á þjóninum. Gesturinn kemur að sólsetri yfir Minecraft-eyðimörk (badlands) og skrunar inn í nóttina; þegar bærinn kveikir á luktunum. Skrun er tími sem líður. Síðan er tveir skjáir og varðeldur: sólsetrið, heimurinn, og allt annað opnast yfir heiminum. Hönnunin er skjalfest í `DESIGN.md`.

Fimm reglur halda útlitinu saman: terracotta-lög eyðimerkurinnar eru skilrúm og grunnur merkisins; gulbrúnt luktarljós er eingöngu á því sem hægt er að smella á; allt letur er teiknað á pixlarist, og pixlaleturgerðin sjálf er á öllum stuttum strengjum (valmynd, hnappar, myndatextar, merkimiðar, tölur og það sem þjónninn segir); pappír er fyrir það sem var fest upp (tölfræði, uppsettir pakkar, leiðin inn); og yfirborð eru hlý og dökk, aldrei kaldgrá.

Letur: Alfa Slab One fyrir fyrirsagnir, Pixelify Sans fyrir meginmál og Silkscreen fyrir merkimiða og gögn, allar þrjár teiknaðar á pixlarist. Þær fylgja vefnum í gegnum `@fontsource` og eru hlaðnar með `next/font/local`. Allir litir, stærðir, bil og tímasetningar eru í `src/app/tokens.css`.

| Hluti | Innihald |
|---|---|
| Sólsetur | Merkið, vistfangið sem er afritað með einum smelli, og lukt með stöðu þjónsins, útgáfu og hausum þeirra sem eru inni. Luktin veit líka hvort þjónninn er að vakna, slokkna eða hrundi, og sé slökkt á honum segir hún hvenær hann logaði síðast og hverjir voru inni þá. Undir henni er línan um næsta spilakvöld, sem telur niður á sjálfan daginn. Nafnið er höggvið úr berglögunum: leirlögin fimm undir hverri brún sem snýr niður. Fjöllin bera öll sín lög, og þau sem eru inni standa á næsta hrygg sem þau sjálf, með logandi lukt í hendi, hvert þeirra leið á vegginn sinn. Komi einhver inn meðan síðan er opin klifrar viðkomandi upp á hrygginn, og niður aftur þegar viðkomandi fer. Guli textinn yfir Ð-inu er staðreynd um heiminn; ýttu á hann og sú næsta kemur. Himinninn dökknar ofan frá með skruni en gullið situr eftir við sjóndeildarhringinn, skýin úr leiknum reka yfir og grána, stjörnurnar koma, og tungl kvöldsins kemur upp yfir J-inu í kvartilinu sem raunverulega tunglið er í (`?tungl=0` … `7` sýnir hvaða kvartil sem er). |
| Heimurinn | Þrívíddarkortið af heimasvæðinu fyllir skjáinn undir mesunum. Það opnast sem kyrrmynd; skoðarinn sjálfur (BlueMap, í fötum JOÐ) hleðst ekki fyrr en ýtt er á luktina, og kyrrmyndin víkur um leið og landslagið undir henni er komið; nákvæmu reitirnir streyma svo inn. Á síma verður ramminn að heilum skjá og bakhnappurinn skilar gestinum aftur á síðuna. Staðirnir liggja í röð neðst með myndunum sínum; veldu stað og póstkortið hans birtist, og hafi staðurinn hnit í heiminum flýgur myndavélin þangað og luktin hans logar í þrívíddinni. Myndavélin kemur ofan úr lofti yfir öllum heiminum og lækkar sig niður í bæinn eftir því sem skrunað er (sjá *Flugið niður í heiminn* að neðan), og staðirnir standa sem luktir á því sem sést. Kyrrmyndin kemur inn í rökkri og ljósin í bænum kvikna í þremur hópum þegar heimurinn er kominn í sýn (þau slokkna aftur ef farið er upp í sólsetrið); ljósið er tekið af sjálfri kyrrmyndinni. Leiðin inn í þrívíddina er lukt sem hangir á staur, með skilti og miða. Kortið opnast að nóttu, undir hlýrri nótt síðunnar en ekki gráblárri nótt BlueMap, svo ljósin í bænum loga, og *Nótt* hleypir sólinni aftur upp, *Teiknað kort* leggur málaða kortið yfir sama ramma, *Myndir* opnar allan vegginn og *Heill skjár* gerir rammann sjálfan að heilum skjá. Þegar komið er í heiminn segir spjall leiksins í horninu yfir stöðunum hvað gerðist á JOÐ síðan síðast, með orðum leiksins sjálfs: það sem hópurinn festi upp, afrek og bál sem voru kveikt, og hverjir koma inn og fara meðan síðan er opin (`/api/chat`, `src/components/badlands/Chat.tsx`). Hver lína leiðir þangað sem það gerðist, og T opnar spjallið til að lesa það aftur, eins og í leiknum. |
| Taflan | Tilkynningataflan, þar sem allt sem gerist á JOÐ hangir, nýjast efst (aðrar dyrnar í valmyndinni, `/#taflan`, eða `/taflan` sem síða út af fyrir sig). Það sem félagarnir festa upp hangir sem skiltin þeirra, hvert á við staðarins, og þar má kveikja á lukt, gefa hlut, svara, taka ósk að sér og svara spurningu án þess að fara á vegg viðkomandi. Það sem þjónninn og kortið gerðu er prentað á miða við hliðina: bál sem voru kveikt, kvöld sem voru ákveðin og haldin, afrek dagsins hjá hverjum og einum, nýir staðir og myndir á kortinu, teiknaða kortið málað upp á nýtt og nýtt afrit af þrívíddarkortinu. Dagarnir eru aðskildir með berglögunum. Síur: Allt, Myndir, Miðar, Viðburðir, Kortið, og *Til þín* þegar einhver hefur nefnt mann (`?syna=myndir` geymir síuna í slóðinni). Undir *Myndir* hanga allar myndirnar í rammum eins og leikurinn hengir mynd á vegg, dag fyrir dag, og hver opnast stór. Taflan teiknar fyrstu tuttugu hlutina og bætir við eftir því sem skrunað er niður (eða ýtt á *Sýna eldra*). *Á döfinni* við hliðina sýnir næsta spilakvöld, óskir sem bíða og spurningar sem eru opnar. Það sem bættist við síðan félaginn leit síðast við er merkt *Nýtt* (nýtt svar undir eldri færslu: *Nýtt svar*), rauður þráður er negldur þvert yfir töfluna þar sem hann hætti síðast að lesa, og fjöldinn stendur á lukt dyranna á öllum síðum, eins og leikurinn skrifar fjölda á hólf; hvenær var síðast litið við er geymt á þjóninum fyrir hvern félaga, svo það er eins í símanum og tölvunni (gestur geymir það í vafranum). Innskráður félagi festir upp beint af töflunni (`src/components/board/`, `src/lib/board.ts`, `/api/board`). |
| Eftirlýst | Herbergi hópsins, sem opnast yfir heiminum (þriðju dyrnar í valmyndinni, staðaluktin eða `/#hopur`): myndir af átta félögum í einni röð, lukt logar á bak við þau sem eru inni. Þar undir eftirlýsingaspjöldin á einni rennibraut, eitt fyrir hvern tölfræðiflokk með þremur efstu: viðurnefni þrjótsins efst (Innipúkinn, Slátrarinn, Draugurinn, Ódauðlegi, Vökustaurinn, Flakkarinn, Boxpúðinn, Ræningjabaninn, Plötusnúðurinn, Brautryðjandinn), sökin þar undir, sá fyrsti stór og annar og þriðji í tveimur línum undir strikinu, og neðst sá sem bætti mestu við sig í vikunni, reiknað úr daglegu afritunum. Brautryðjandinn er sá sem varð oftast fyrstur hópsins að afreki í leiknum. Öll tölfræðin er á síðu hvers og eins. Neðst í herberginu er **Annáll**: spilakvöldin sem hafa verið, hvert sem útbrunninn eldur á sömu jörð, nýjast fyrst. Ýttu á eld og kvöldið opnast: hver kveikti, hverjir mættu, hverjir sögðust mæta en komu ekki, og myndir kvöldsins, skjámyndirnar sem félagarnir tóku um kvöldið og festu á veggina sína. Þær finnast sjálfar eftir tímanum í nafni skjámyndarinnar, frá hálftíma áður en kvöldið hefst þar til því lýkur. Tengill liðins kvölds (`/kvold/<id>`) opnar það í annálnum. |
| Á hillunni | Þriðja herbergið (fjórðu dyrnar eða `/#hillan`), verslun með veggjum úr borðum. Hver uppsettur gagnapakki er kassi á hillunum með pixlateikninguna sína á miða negldum framan á; sá sem þú bendir á fær miðann sinn lesinn upp á búðarborðinu við hliðina (fyrir neðan á síma). |
| Varðeldurinn | Ein landræma neðst: varðeldurinn í miðjunni, í steinahring á jörðinni, ljósið hans breitt yfir jörðina og á rætur fjallanna úr sólsetrinu, sem standa aftur sem dökk útlína. Leiðin aftur upp í sólsetrið og umhverfishljóðið standa sitt hvoru megin við hann, og smáa letrið á moldinni fyrir neðan. Smelltu á eldinn: þar býr einvígið, viðbragðsleikur í þremur umferðum. |

Flipinn sjálfur er lukt líka: meðan kveikt er á þjóninum er táknmynd flipans logandi lukt og titillinn segir hve mörg úr hópnum eru inni, „(3) JOÐcraft“, svo spilakvöldið sést úr flipa í bakgrunni. Sé slökkt er táknmyndin merki JOÐ. Flipi í bakgrunni spyr um stöðuna á þriggja mínútna fresti (`src/components/badlands/tabLantern.ts`). Safari heldur fyrstu táknmyndinni, svo þar sést aðeins talan.

Valmyndin er fjórar dyr, hver sín lukt: Heimurinn, Taflan, Eftirlýst, Hillan (lyklarnir 1 til 4, eins og í leiknum). Fyrstu dyrnar eru heimurinn sjálfur; hinar þrjár eru herbergi sem rísa upp frá neðri brún kortarammans og skilja heiminn eftir í sýn fyrir ofan. Luktin logar meðan gesturinn er inni um þær dyr. Á öðrum síðum leiða dyr töflunnar á `/taflan` og dyr Eftirlýst á `/crew`. Kjölfestan (`#taflan`, `#hopur`, `#hillan`) segir hvaða herbergi er opið, svo tenglar virka hvaðan sem er og bakktakkinn lokar. Á tölvu eru dyrnar efst við hlið vistfangsins, á síma neðst í seilingu þumals, og þar fyllir heimurinn allan skjáinn milli stikanna.

Áhrif (himinn, mesa-lög með dýpt, ryk og glæður, luktarljós sem fylgir bendlinum, vindur og eldur úr Web Audio) eru hvert um sig sjálfstæð eining í `src/effects/` og slökkva á sér undir `prefers-reduced-motion`.

Á `/crew` er félagalistinn, með því nýjasta af veggjunum negldu upp við hliðina og leið á töfluna. Hvert spjald segir fyrir hvað félaginn er eftirlýstur, eftir sömu tölum og eftirlýsingaspjöldin í herberginu: viðurnefnið þar sem hann er efstur, annars sætið á þeirri sök sem hann stendur hæst á, og verðlaunin. Sá sem er efstur á flestum sökum hangir fremst, tvöfaldur að stærð: *Mest eftirlýst á JOÐ*. Síðan les síðasta afritið af tölunum á þjóninum á fimm mínútna fresti (`src/components/badlands/outlaws.ts`). Á `/crew/<name>` er veggur hvers félaga: eftirlýsingaspjaldið efst (skinnið í heild, kynning, verðlaun, tölfræði, afrek og það sem viðkomandi byggði), og þar undir allt sem félaginn hefur fest upp, nýjast efst. Afrekin eru afrek leiksins sjálfs, með íslensku heiti sínu úr leiknum, rammanum sem leikurinn teiknar (verkefni, markmið eða áskorun) og deginum sem þau unnust, nýjast fyrst, og merkt þar sem félaginn varð fyrstur hópsins. Daglega verkið les þau af þjóninum (`world/players/advancements`, `src/lib/advancements.ts`); afrek gagnapakka eru ekki talin, því vefurinn á ekkert heiti á þeim. Hausar og skinn koma frá minotar.net, með mc-heads.net til vara. Sjá **Veggirnir** hér að neðan.

Kóðinn er í `src/components/badlands/`, útlitsreglur í `src/app/badlands.css` og `src/app/board.css`, grunngildi í `src/app/tokens.css` og `src/app/globals.css`. Endurhönnunin er skjalfest í `DESIGN.md`.

## Veggirnir

Hver félagi á vegg á `/crew/<name>`. Á honum hangir hvað sem er: miði, mynd, eða miði með myndum. Ein færsla (`CrewEntry`) er texti, núll eða fleiri myndir með myndatexta hver, staður á kortinu ef við á, luktir þeirra sem kveiktu undir henni, hlutirnir sem félagarnir gáfu henni og stutt svör frá öðrum félögum. Eldri veggir með aðskildum færslum og myndum eru lesnir í þetta form við lestur (`normalizeProfile` í `src/lib/crew-types.ts`); ekkert þarf að flytja handvirkt.

**Að festa eitthvað upp.** Eigandi veggjarins sér pinnann efst: dragðu skjámyndir hvert sem er á síðuna, límdu þær (Ctrl+V), eða veldu þær; hver mynd fer strax upp í geymsluna (minnkuð í 2560 px WebP í vafranum og send beint í Vercel Blob, eins og í stjórnborðinu), fær myndatexta, og sé hún nefnd eins og leikurinn nefnir skjámyndir (`2026-09-10_20.15.33.png`) er dagsetningin lesin af nafninu. Staður er valinn úr stöðunum á kortinu. Færslu má breyta eftir á: texta, myndatexta, stað, taka myndir niður, og setja eina þeirra á plakatið, þar sem hún stendur fölnuð á bak við spjaldið og á tengilspjaldinu (`/crew/<name>/opengraph-image`) þegar veggnum er deilt.

**Óskir, spurningar og nöfn.** Pinninn festir upp miða, *ósk* eða *spurningu*. Ósk (Óskast) segir hvað vantar og hver verðlaunin eru; hún hangir sem prentuð auglýsing á skiltinu, einhver úr hópnum tekur hana að sér (sá sem setti hana upp getur losað hana frá þeim sem tók hana og lét ekki sjá sig), og þegar sá sem setti hana upp segir *Komið í höfn* fær hún rauðan stimpil og sá sem tók hana að sér er talinn á eftirlýsingaspjöldunum sem **Hausaveiðarinn** (óskir uppfylltar fyrir verðlaun). Spurning hefur tvo til fjóra svarkosti; hver félagi velur einn og getur skipt um, og sá sem spurði lokar henni. @nafn í miða eða svari er tengill á vegg félagans, lýstur upp þegar það er sá sem les, og nefndi félaginn fær bréf (sjá **Póstur**). Ósk og spurning eru færslur eins og aðrar (`bounty` og `poll` á `CrewEntry`); eldri veggir þurfa enga breytingu.

**Hlutir á skiltin.** Hverju skilti má gefa hluti úr leiknum, átta talsins, og hver segir sitt: köku („Til hamingju!“), demant („Glæsilegt“), hjarta („Elska þetta“), valmúa („Fallegt“), haka („Vel unnið“), smáköku („Takk fyrir“), creeper („Sssss!“) og beinagrindarhaus („Dó úr hlátri“). Það sem hefur verið gefið hangir í fæti skiltisins á eftir luktinni, hver hlutur í sínu hólfi eins og neðst á skjánum í leiknum, og fjöldinn er skrifaður eins og leikurinn telur stafla; hlutirnir sem lesandinn gaf sjálfur bera rammann sem leikurinn setur um hólfið í hendi. Ýtt á hólf gefur hlutinn líka, eða tekur sinn aftur. Tóma hólfið á eftir þeim opnar birgðirnar: alla hlutina, og í fjólubláa reitnum úr leiknum hvað hver þeirra segir og hverjir gáfu hann (í símanum, þar sem ekkert bendir, stendur þar hver gaf hvað). Hlutur sem er gefinn skoppar inn í hólfið eins og hlutir leiksins þegar þeir eru teknir upp, með smellinum úr leiknum ef kveikt er á vindinum og eldinum. Átta hlutir og tóma hólfið fylla níu hólf, eins og í leiknum. Hver félagi gefur hvern hlut einu sinni, á hvaða skilti sem er, sínu eigin líka (`reactions` á `CrewEntry`, `POST /api/crew/<name>/entries/<id>/react`). Myndirnar eru teiknaðar á sextán pixla rist í `src/lib/item-art.ts`, og `src/app/items.css` er teiknað úr þeim; prófið heldur þessu tvennu saman og `npx vitest run -u reactions` teiknar blaðið aftur eftir breytingu.

**Myndir sem voru aldrei festar upp.** Mynd fer í geymsluna um leið og hún er sett í hólfið, áður en ýtt er á „Festa upp“. Sé hún tekin úr hólfinu er henni eytt strax, en sé flipanum lokað með myndir í hólfinu verða þær eftir í geymslunni án þess að nokkur veggur vísi á þær. Daglega verkið (`/api/cron/daily`) eyðir þeim þegar þær eru orðnar þriggja daga gamlar (`src/lib/crew-sweep.ts`). Það eyðir engu nema allir veggirnir hafi verið lesnir, lítur aðeins á myndir í möppu núverandi félaga sem eru nefndar eins og hólfið nefnir þær, og eyðir engu ef það myndi taka meirihluta myndanna eða finnur engan vegg með mynd á; þá segir það frá því í skránni. Það kostar eina aðgerð á dag í kvóta geymslunnar (listann yfir `crew/`).

**Innskráning.** Félagi kemst inn með eigin lykilorði eða með tengli frá stjórnandanum. Stjórnborðið býr til innskráningartengil (og QR-kóða) undir **Hópurinn**; tengillinn gildir í viku og fyrir fimm tæki, og má loka fyrr. Hvert tæki sem opnar hann er skráð inn í eitt ár. Þegar félagi er kominn inn velur hann sér lykilorð á veggnum (hnappurinn „Velja lykilorð“, veggurinn minnir á það þangað til), og eftir það dugar „Þetta er ég“ á hvaða síma eða tölvu sem er. Lykilorðin eru geymd sem scrypt-hass, aðskilin frá veggjunum (Redis, eða `src/data/profiles/_passwords.json` í þróun). Gleymt lykilorð hreinsar stjórnandinn í stjórnborðinu og sendir nýjan tengil. Sé netfang skráð á félagann getur hann líka beðið sjálfur um tengil í pósti („Senda mér innskráningartengil í pósti“ undir „Þetta er ég“); sjá **Póstur** hér að neðan. Innskráður félagi sér hausinn sinn logandi í stikunni á öllum síðum og kemst þaðan á vegginn sinn. Aðgangslyklarnir í umhverfisbreytum virka áfram sem varaleið.

**Nafn og netfang.** Undir „Nafn og netfang“ á eigin vegg skráir félagi netfangið sitt, velur hvort hann vill póst um spilakvöld, og gefur nafnið sem bréfin kalla hann (til dæmis fornafnið) í stað Minecraft-nafnsins. Stjórnandinn getur líka skráð hvort tveggja í stjórnborðinu, svo hægt sé að senda tengil þeim sem hefur aldrei komið inn. Hvort tveggja er geymt aðskilið frá veggjunum (Redis, eða `src/data/profiles/_emails.json` og `_names.json` í þróun); aðeins eigandinn og stjórnandinn sjá það, og nafnið sést aðeins í bréfunum, aldrei á vefnum. Án nafns nota bréfin notandanafnið.

**Veggirnir annars staðar.** Allt sem hangir á veggjunum hangir líka á töflunni (`/taflan`, `#taflan`), með höfði og nafni þess sem skrifaði efst á skiltinu, og þaðan má festa upp beint. Í Eftirlýst-herberginu stendur fjöldi mynda undir hverjum haus. Í heiminum ber staður sem eitthvað hefur verið fest við töluna á flísinni sinni, og póstkortið sýnir myndir félaganna af staðnum, hverja eitt smell frá veggnum sínum. Staður getur líka borið hverjir byggðu hann (stillt í kortaritlinum); póstkortið segir það og veggur hvers og eins telur upp það sem viðkomandi byggði. Einvígið við varðeldinn sendir besta tímann á vegginn þegar félagi er innskráður; sá fljótasti er eftirlýstur sem **Fógetinn**.

## Verkfæri

- **Stjórnborð** (`/admin`): Sex flipar. **Þjónn**: staða, leikmenn inni, ræsa, stöðva og endurræsa á Exaroton, uppfærist sjálfkrafa; afritun þrívíddarkortsins á vefinn, og grunnkortin (*Grunnkortin*), hvert sent á vefinn með einum hnappi eða öll í einu. **Gagnapakkar**: allt um pakkana á einum stað; hvaða pakkar birtast í kaupfélaginu á vefnum (sýna eða fela), röðin á hillunum, uppsett útgáfa, athugun á nýrri útgáfu á Modrinth eða GitHub, lestur skráarheita beint af þjóninum, og eigin pakkar (til dæmis JOÐ-pakkarnir) sem má bæta við, breyta, gefa mynd og eyða. **Myndasafn**: upphleðsla, titlar, röð, sýna eða fela, og tenging við stað á kortinu. **Hópurinn**: félagarnir, nafn og netfang hvers og eins (sett inn, breytt eða fjarlægt), hvort þeir hafi valið sér lykilorð (og hnappur til að hreinsa það), hvað hangir á hverjum vegg, opnir innskráningartenglar með notkun og lokun, og nýr tengill með QR-kóða fyrir hvern og einn, eða sendur beint í pósti („Senda í pósti“). **Landakort**: ritill sem sýnir kortið nákvæmlega eins og gestir sjá það. Landslagið sjálft er málað þar: pensill og fylling mála sjó, land, gras, skóg, kletta og sand í kubbaristina, strönd teiknast sjálfkrafa þar sem land mætir sjó, og Shift heldur strokunni beinni. Hver staður getur fengið hnit í heiminum (eins og F3 sýnir þau) og stendur þá sem lukt í þrívíddarkortinu. Að auki: afturköllun, rist, örvatakkar, afritun staða og myndaval. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð. **Póstur**: hvert bréf eins og það berst, útlit þess og prufusending; sjá **Póstur** hér að neðan.

## Póstur

Vefurinn sendir póst frá `hallo@jodcraft.world` í gegnum [Resend](https://resend.com) (`src/lib/email.ts`). Lénið er staðfest þar með DNS-færslum á `send.jodcraft.world` og `resend._domainkey`, sem eru í DNS-stillingum lénsins á Vercel. Án `RESEND_API_KEY` er ekkert sent; lykillinn er aðeins stilltur fyrir Production, svo forskoðanir senda ekkert.

| Bréf | Hverjum | Hvenær |
|---|---|---|
| Innskráningartengill | félaganum sjálfum | þegar stjórnandinn ýtir á „Senda í pósti“, eða félaginn biður um hann undir „Þetta er ég“ (mest þrír á klukkutíma) |
| Bál kveikt | öllum nema þeim sem kveikti | strax, meðan bálið er nýtt |
| Kvöldið ákveðið | öllum nema þeim sem valdi | þegar kvöld með fleiri en einum tíma er ákveðið, af þeim sem kveikti eða sjálfkrafa; með tengli í dagatalið |
| Hálftími í bál | þeim sem sögðust mæta | frá hálftíma áður, þegar hægt er að kveikja á þjóninum |
| Bálið slokknaði | þeim sem sögðust geta mætt | þegar kvöldinu er aflýst |
| Kallað á þig | þeim sem er nefndur (@nafn) | þegar nýr miði eða svar nefnir félagann, nema hann hafi afþakkað það undir „Nafn og netfang“; mest eitt á klukkutíma frá sama félaga (`src/lib/mention-mail.ts`) |

**Orðin og útlitið.** Allt sem bréfin segja (efnislína, forsýnarlínan sem pósthólfið sýnir, myndin efst, fyrirsögn, textinn, hnappurinn, vísan og smáa letrið) er á einum stað, í `src/lib/email-copy.ts`, á rödd vefsins. Bréfin eru frá **JOÐcraft**, og hverju þeirra fylgir ferskeytla (`VERSES`), með stuðlum og höfuðstöfum, í skáletri neðst. Hvert bréf klæðist öðru af tveimur útlitum (`src/lib/email-design.ts`): **Sólsetur** (himinn og mesa í myndinni, orðin á pappír) eða **Varðeldur** (stjörnur og varðeldur í myndinni, ljós orð á dökkum viði). Hvert bréf er eitt spjald, 600 px á breidd, með myndina efst og dökka rönd með nafni vefsins neðst, og situr á bakgrunni póstforritsins sjálfs, svo stutt bréf passar á skjáinn án þess að skruna. Sjálfgefið eru bréf dagsins í sólsetri og bréf kvöldsins við eldinn; í stjórnborðinu undir **Póstur** sést hvert bréf eins og það berst, með tilbúnum orðum, þar er útlit hvers bréfs valið (geymt í Redis) og prufa send á hvaða netfang sem er. Rofinn „Sýna eins og Gmail“ sýnir bréfin án letur vefsins, eins og Gmail og Outlook sýna þau.

Myndin efst í hverju bréfi er teiknuð á `/api/mail-art` með letri vefsins, eins og tengilspjöldin, og ber fyrirsögn bréfsins sjálfs („Söðlaðu hestinn, Jóna“), svo það sem mest ber á er eins í öllum póstforritum, Gmail líka. Slóð myndarinnar er undirrituð (með `MAIL_ART_SECRET`, eða `CRON_SECRET` sé hann ekki til), svo vefurinn teiknar aðeins orð sem hann skrifaði sjálfur; án lykils, eða með úreltri undirskrift, segir myndin titil bréfsins og fyrirsögnin stendur á pappírnum. Textinn undir biður um sama letur (`public/email-fonts`); Apple Mail og fleiri sýna það, en Gmail og Outlook sýna ekkert sérletur, svo staðgenglarnir eru valdir til að halda svipnum: Verdana í texta og feitletraðir hástafir í merkimiðum, tímum og hnöppum.

Bréfin um spilakvöld fá aðeins þau sem hafa skráð netfang og ekki afþakkað þau (`src/lib/night-mail.ts`). Þau eru send strax eftir að bál er kveikt, valið eða slökkt, og verkið `/api/cron/nights` (á fimm mínútna fresti, sjá `vercel.json`) sendir það sem eftir stendur: kvöld sem var ákveðið sjálfkrafa og hálftímann fyrir kvöldið. Hvert bréf er merkt í Redis áður en það fer, svo það fer aðeins einu sinni; bréf sem komst ekki til skila er reynt aftur í næstu umferð. Tíðara verk en einu sinni á dag þarf Vercel Pro.

**Svarað úr bréfinu.** Bréfin „Bál kveikt“ og „Kvöldið ákveðið“ bera svarhnappa lesandans sjálfs: einn fyrir hvern tíma sem er í boði, eða „Ég mæti“, og „Kemst ekki“. Hnappurinn opnar kvöldið með svarinu útfylltu á miða við eldinn, og svarið fer þegar ýtt er á „Staðfesta svarið“, án innskráningar (`src/lib/night-answer.ts`). Að opna tengilinn skrifar ekkert, því póstskannar og forskoðanir opna tengla líka. Lykillinn í tenglinum gildir aðeins fyrir þann lesanda og það kvöld, þar til kvöldið hefst, og leyfir ekkert annað en að svara. Hann er undirritaður með sama leyndarmáli og myndir bréfanna (`MAIL_ART_SECRET`, eða `CRON_SECRET`); án þess bera bréfin aðeins venjulega hnappinn.

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

**Afritun úr stjórnborðinu.** GitHub Action (`.github/workflows/map-sync.yml`) keyrir `map:sync` þegar hún er ræst: með hnappnum „Afrita kortið núna“ í stjórnborðinu (Þjónn → Þrívíddarkortið), sem sýnir líka síðustu keyrslur, eða á GitHub undir Actions → Map sync → Run workflow. Hnappurinn þarf `MAP_SYNC_GITHUB_TOKEN` í Vercel. Hún keyrir hvort sem þjónninn er í gangi eða ekki; keyrsla sem er ræst meðan hann er slökktur heitir „Map sync, server off“ og stjórnborðið merkir hana. Hafi BlueMap engu breytt síðan síðast gerir hún ekkert og snertir hvorki geymsluna né git. Annars sendir hún nýju pakkana í geymsluna og ýtir afritinu á `main`, og Vercel birtir það. Hún geymir afritið sitt á milli keyrslna í skyndiminni GitHub, svo hún sækir aðeins það sem BlueMap hefur teiknað upp á nýtt. Dagsetningin á vefnum er þá sú síðasta sem kortið breyttist. Hún þarf tvö leyndarmál undir Settings → Secrets and variables → Actions → Repository secrets: `EXAROTON_API_KEY` og `BLOB_READ_WRITE_TOKEN`, þau sömu og í `.env.local`. Hafi afritunin breytt kortinu tekur hún líka nýja kyrrmynd af því (`npm run map:poster`, `public/map-poster.webp`), sem forsíðan opnar á, og ljósin í bænum af henni (`public/map-lights-*.webp`); mistakist það er afritið samt birt, með gömlu myndinni.

Kyrrmyndin sem heimurinn opnast sem er `public/map-poster.webp`, tekin að nóttu eins og kortið opnast og teiknuð í fullri upplausn út að jaðri heimsins. Hún er tekin af afritinu með `npm run dev` í gangi:

```bash
npm run map:poster
```

Skipunin notar Chrome eða Edge sem er þegar á tölvunni (eða vafrann í `CHROME=<slóð>`); `playwright-core` kemur ekki með eigin vafra. Hún tekur líka ljósin í bænum af nýju myndinni: hvern hlýjan, bjartan díl sem BlueMap teiknaði, sem mjúkan ljóspoll í þremur lögum á fjórðungsstærð (um 7 kB saman). `npm run map:lights` tekur þau af núverandi mynd án þess að taka nýja.

Upphafssjónarhornið er `MAP_START_VIEW` í `src/components/badlands/data.ts`; það er allt sem stendur á eftir `#` í vistfangi skoðarans þegar búið er að stilla myndina. Afritunin á GitHub tekur nýja kyrrmynd sjálf þegar kortið breytist; eftir afritun úr eigin tölvu (`npm run map:sync`) þarf að keyra `map:poster` í höndunum.

**Flugið niður í heiminn.** Þegar heimurinn kemur í sýn á forsíðunni byrjar myndavélin hátt yfir öllum teiknaða heiminum og lækkar sig niður í upphafssjónarhornið eftir því sem skrunað er; ramminn stendur kyrr efst á skjánum á meðan (`src/components/badlands/Flight.tsx`). Flugið er röð kyrrmynda af kortinu, tekin með `npm run map:flight` (með `npm run dev` í gangi, eins og kyrrmyndin): 40 rammar fyrir breiðan skjá og 40 fyrir uppréttan síma, hvor rammaður að sinni lögun, í `public/map-flight/`, jafnt dreifðir eftir leiðinni; síðan sjálf hægir á í byrjun og við lendingu. Hver rammi geymir myndavélina sem hann var tekinn með (`src/lib/map-flight.json`): fylkið sem setur blokk á skjáinn, hvar myndavélin stóð, á hvað hún horfði og hve langt frá. Milli tveggja ramma er sá fyrri stækkaður í átt að þeim næsta eftir myndavélunum og sá næsti dofnar inn yfir hann á sama stað, svo myndavélin hreyfist en rammarnir leysast ekki hver upp í annan. Staðirnir sem hafa hnit í heiminum standa sem luktir á því sem sést, og lukt opnar póstkort staðarins eins og röðin neðst. Á leiðinni niður sýna F3-línurnar hvar myndavélin er og í hvaða átt hún snýr, og staurinn með luktinni inn í þrívíddina víkur til hliðar og er settur niður í bænum þegar myndavélin lendir. Síðasti ramminn er upphafssjónarhornið sjálft, þar sem kyrrmyndin tekur við og ljósin í bænum kvikna. Rammarnir eru sóttir þegar heimurinn nálgast: yfirlitið fyrst, svo lendingin og svo æ þéttar á milli, svo hraður skrunari hefur alltaf ramma nálægt. Skrunið les aðeins `scrollY`; staða heimsins á síðunni er mæld þegar stærðin breytist, og striginn hefur ekki fleiri díla en rammarnir sjálfir. Áður en rammarnir eru teknir spyr upptakan BlueMap hve hátt það nær sem stendur undir myndavélinni, tré og byggingar meðtalin, og þar sem myndavélin færi nær því en tíu blokkum, eða eitthvað stæði í nærsta þriðjungi sjónlínunnar, horfir hún meira niður í þeim römmum (svo hún lyftist og færist nær), mjúklega yfir rammana í kring; annars flygi hún í gegnum tré sem eru byggð á leiðinni. BlueMap teiknar aðeins óskýra lagið sitt úr meira en 1.000 blokka fjarlægð, svo yfirlitið stendur nær en það. Afritunin á GitHub tekur flugið með kyrrmyndinni; verkið Map flight (`.github/workflows/map-flight.yml`) tekur það aftur án nýs afrits, úr Actions → Map flight → Run workflow, og sjálft á hverri grein nema `main` þegar `scripts/map-flight.mjs` breytist, svo breyting á fluginu sést í forsýn greinarinnar. Án hreyfingar (`prefers-reduced-motion`), á tæki sem sleppir áhrifunum og áður en flugið hefur verið tekið standa luktirnar á kyrrmyndinni einni.

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
| `public/bluemap-jod/jod.js` | Plankinn með leiðinni heim, myndavélin haldin yfir teiknaða heiminum, skerpa miðuð við tvo skjápunkta, reitir sem eru eins og í fyrra afriti sóttir á gömlu slóðina sína, Venjulegt létt skref fyrir skref á tæki sem nær ekki að teikna það mjúklega meðan myndavélin hreyfist (færri dílar, svo hring færri nákvæmir reitir; tækið man skrefið í þrjá daga, og gæði sem valin eru í valmyndinni eru aldrei létt), mælir í horninu með `?maelir` í vistfanginu (rammar á sekúndu, teikniköll, þríhyrningar, reitir og dílar), ein mynd teiknuð fyrir hvern reit sem berst (BlueMap teiknar annars á fullum hraða í heila sekúndu eftir hvern reit, og meðan reitirnir koma hægt heldur það skjákortinu á fullu allan tímann), og samtalið við forsíðuna (framvinda, hlé, nótt, flug á stað) |
| `public/bluemap/lang/is.conf` | Allur texti skoðarans á íslensku |

Afritunin tekur aðeins það sem skoðarinn les. Skrár BlueMap um hvað hefur verið teiknað (`maps/*/rstate`), kort sem skoðarinn sýnir ekki, hausar leikmanna og kóðakort verða eftir á þjóninum. Hausar leikmanna í kortinu koma um `/api/map-head`.

Hvert afrit fær útgáfu (`version` í `src/lib/bluemap-snapshot.json`) og skoðarinn les kortið af `/bluemap-data/<útgáfa>/maps`. Slóð sem nefnir útgáfu breytist aldrei, svo vafrinn og CDN geyma hvern reit í ár: gestur sem kemur aftur les kortið af eigin diski. Nýtt afrit fær nýjar slóðir aðeins fyrir það sem breyttist. Skráalistinn geymir fingrafar hverrar skráar (`sums`) og útgáfuna sem hún hefur verið óbreytt síðan (`since`), og nákvæmu reitirnir sem eru eins og í fyrra afriti eru sóttir á slóð þeirrar útgáfu (`kept` í `window.JOD_MAP`, sem `jod.js` les), sem vafrinn og CDN eiga þegar. Áður sendi hvert afrit alla gesti eftir öllu kortinu aftur, reit fyrir reit í gegnum geymsluna, þótt aðeins horn af því hefði breyst; afritið 4. október 2026 breytti 346 af 1.139 skrám en gaf þeim öllum nýjar slóðir, og kortið kom þá hægt inn á öllum skjám. Afrit sem var tekið áður en fingraförin voru geymd segir hvort reitur sé eins af stærð hans, eins og `map:sync` sjálft gerir. `npm run map:warm` hitar slóðirnar sem skoðarinn biður um. Staða leikmanna er deild milli gesta í tvær sekúndur og merkin í tíu, svo mörg opin kort kosta eitt kall til Exaroton.

Staður sem fær hnit í kortaritlinum (*Í heiminum (X Y Z)*, eins og F3 sýnir þau) stendur sem lukt í þrívíddarkortinu. Luktunum er bætt við merki BlueMap í `src/app/bluemap/[[...path]]/route.ts`, svo þær birtast líka í merkjalista skoðarans og standa hvort sem þjónninn er í gangi eða ekki.

**Valfrjálst á þjóninum**, í `plugins/BlueMap/maps/world.conf` (síðan `/bluemap reload` og nýtt afrit):

- `render-mask` með hring (`type: "circle"`) í stað kassa: um fimmtungi færri reitir, og heimurinn verður eyja í stað skorins fernings.
- `void-color` og `sky-color`: liturinn undir sjóndeildarhringnum og himinninn. Sé `void-color` látinn vera svartur mýkir `jod.js` hann í himininn.
- `ambient-light` um 0,1 til 0,2: nóttin verður ekki kolsvört.
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
| `CRON_SECRET` | Langur handahófskenndur lykilstrengur; Vercel sendir hann með tímasettu verkunum (sjá `vercel.json`): daglega verkinu (`/api/cron/daily`), sem geymir tölfræði hópsins einu sinni á dag og hreinsar myndir sem voru aldrei festar upp, og póstverkinu (`/api/cron/nights`), sem sendir bréfin um spilakvöld. Verkin hafna öllum beiðnum án hans |
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

Þegar þjónninn fer á nýja útgáfu af Minecraft fá ný afrek heiti sitt með `npm run advancements` (eða `npm run advancements -- 26.4`): skriftan sækir þjón útgáfunnar og íslenskuna til Mojang og skrifar `src/lib/advancements.json`.

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
