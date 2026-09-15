# JOÐ: Minecraft-vefurinn okkar

Vefur fyrir Minecraft-einkaþjón JOÐ á **play.jodcraft.world**.

Byggt með Next.js 15, TypeScript og CSS. Almennu síðurnar nota ekkert viðmótsrammaverk.

## Vefurinn

Útlitið minnir á ferðadagbók á gömlum pappír: myndir límdar inn á ská, símskeyti fest á síðuna, vistfangið sem stimpill og handskrifaðar athugasemdir á spássíunum. Punktalína teiknast niður síðuna þegar skrunað er. Rye er notað fyrir stóru fyrirsagnirnar, Caveat fyrir handskriftina og Lora fyrir meginmálið. Letrið fylgir vefnum í gegnum `@fontsource`.

| Hluti | Innihald |
|---|---|
| Forsíða | Merkið, mynd úr leiknum, vegvísir að efni síðunnar og símskeyti með stöðu þjónsins. Smellur á stimpilinn afritar vistfangið. |
| Búðirnar | Myndir af átta félögum hanga á snúru. Litur og „Inni“-stimpill sýna hver er að spila. Staðan uppfærist á mínútu fresti. |
| Landakort | Kort heimsins á blaði með sviðnum brúnum og látúnspinnum. Mynd af völdum stað birtist yfir horninu. Kortinu er breytt í stjórnborðinu, þar sem hverjum pinna er tengd mynd úr myndasafninu, annaðhvort úr kortaritlinum eða úr myndasafninu sjálfu. |
| Myndaalbúm | Myndir úr leiknum, sem fá lit þegar bent er á þær. Smelltu til að stækka. Myndunum er stjórnað í stjórnborðinu. |
| Einvígi | Viðbragðsleikur með þremur umferðum. Blossi gefur merki, svo birtast reykur og skotgat. Besti tíminn vistast í vafranum. |
| Tölfræði | Stigatafla á eftirlýsingaspjöldum. Þrjú efstu fá spjald, hin birtast í bókinni fyrir neðan. |
| Pakkar | Uppsettir gagnapakkar á kvittun úr kaupfélaginu. |
| Komdu inn | Merki brennt í leður og vistfang á málmplötu. Smelltu til að afrita. |

Á `/crew` er félagalistinn. Á `/crew/<name>` eru kynning, tölfræði, afrek, færslur og myndir hvers leikmanns. Félagar skrá sig inn með sínum aðgangslykli.

Kóðinn er í `src/components/frontier/`, útlitsreglur í `src/app/frontier.css` og sameiginleg grunngildi í `src/app/globals.css`.

## Verkfæri

- **Pakkaritill** (`/rp-editor`): Greinir og breytir útlitspökkum í vafranum. Greining í bakgrunnsþræði rekur yfirlíkön, kubbaástand, hlutaskilgreiningar og yfirskriftir, letur, agnir, búnað, áferðarsöfn og gagnapakka. Hún sýnir bilaðar tilvísanir og skrár sem eru sannanlega ónotaðar. Þar eru líka tengslakort, leit að árekstrum í `custom_model_data`, leit að tvíteknum áferðum, sjálfvirkar leiðréttingar, útflutningur skýrslna og myndritill með þrívíðri forskoðun.
- **Stjórnborð** (`/admin`): Ræsa, stöðva og endurræsa þjóninn, fylgjast með uppfærslum gagnapakka og breyta myndasafni og korti. Heiti staða, svæða og mynda eru vistuð nákvæmlega eins og þau eru skrifuð.

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
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob-aðgangur fyrir myndir sem er hlaðið upp |

## Þróun

```bash
npm install
npm run dev
```

Opnaðu [vefinn á localhost:3000](http://localhost:3000).

## Bæta við félaga

1. Bættu notandanafninu við `CREW_USERNAMES` í `src/lib/crew.ts`.
2. Bættu því við `CREW` í `src/components/frontier/data.ts`.
3. Stilltu `CREW_TOKEN_<UPPERCASE_USERNAME>` í umhverfisbreytunum.

## Fylgjast með uppfærslum gagnapakka

Stilltu hvern gagnapakka í `src/data/datapacks.ts`:

- `source: 'modrinth'` og `modrinthSlug`: athugar Modrinth.
- `source: 'github'` og `githubRepo` (`owner/repo`): athugar útgáfur á GitHub.
- `source: 'manual'`: engin sjálfvirk athugun.

Settu `currentVersion` á þá útgáfu sem er uppsett á þjóninum.
