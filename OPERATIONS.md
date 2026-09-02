# PickIt — kézzel elvégzendő teendők

Amit **neked kell megcsinálnod**, mert jelszó, konzolos kattintás, vagy pénzügyi
és kiadási döntés kell hozzá. Az alkalmazás felépítését a
[claude4.md](claude4.md) írja le.

**Jelölés:** 🔒 = jelszavad vagy kétlépcsős azonosításod kell, én nem tudom
megcsinálni. ⚙ = parancs, amit én is le tudok futtatni, ha szólsz.

Jelenlegi azonosítók:

| | Érték |
|---|---|
| Firebase / GCP projekt | `pickitclaude` |
| Expo fiók / projekt | `jattila` / `pickit` (`b4dfe696-2f33-42f8-83ac-d851ffd42913`) |
| Apple Team | `DAUW38YPBN` |
| App Store Connect app | `6794636733` |
| Csomagazonosítók | `com.pickitclaude.app` és `com.pickitclaude.app.dev` |

---

## 1. Firebase projekt 🔒

**Firebase konzol → Új projekt.** Google Analytics bekapcsolva.

Ezután **Firestore Database → adatbázis létrehozása** — éles módban, európai
régióban. A szabályokat és az indexeket ne kézzel írd, azok a repóból települnek
(9. pont).

## 2. Alkalmazások regisztrálása 🔒

**Négy** app kell, mert a fejlesztői változat külön identitást használ:

| Platform | Csomag | Letöltendő fájl |
|---|---|---|
| Android | `com.pickitclaude.app` | `google-services.json` |
| Android | `com.pickitclaude.app.dev` | `google-services.json` (dev) |
| iOS | `com.pickitclaude.app` | `GoogleService-Info.plist` |
| iOS | `com.pickitclaude.app.dev` | `GoogleService-Info.dev.plist` |

> **Ellenőrizd a csomagnevet betűről betűre**, mielőtt letöltöd. Egyszer egy
> hiányzó „c" miatt (`om.pickitclaude.app.dev`) az egész appot újra kellett
> hozni — a Firebase nem engedi átnevezni.

A letöltött fájlok a projekt gyökerébe kerülnek, és **gitignore-oltak**. Ha új
gépen dolgozol, ezeket kézzel kell odamásolni.

## 3. Hitelesítés 🔒

**Authentication → Sign-in method → E-mail/jelszó** bekapcsolása.

Az e-mail-visszaigazolás kötelező: a biztonsági szabályok minden művelethez
`email_verified`-et követelnek.

## 4. Push értesítések 🔒

**Android:** semmi külön teendő, a `google-services.json` elég.

**iOS:** APNs kulcs kell. *Apple Developer → Certificates, Identifiers & Profiles
→ Keys → új kulcs, APNs jogosultsággal.* A `.p8` fájlt **egyszer lehet
letölteni**. Feltöltés: *Firebase konzol → Projekt beállítások → Cloud Messaging
→ APNs Authentication Key*, a Key ID-vel és a Team ID-vel (`DAUW38YPBN`) együtt.

> A `com.pickitclaude.app.dev` iOS apphoz **külön fel kell tölteni ugyanazt a
> kulcsot**, különben a fejlesztői változatban nincs push.

## 5. App Check 🔒

**Firebase konzol → App Check → Apps.**

- **iOS:** App Attest. Nincs további teendő.
- **Android:** Play Integrity — **SHA-256 ujjlenyomatokat** kér.

Az ujjlenyomatok több helyről jönnek, és **mindegyiket fel kell venni**:

```bash
npx eas-cli credentials --platform android    # ⚙ az EAS aláírókulcsa
```

plusz a **Play Console → Beállítások → Alkalmazás-aláírás** oldalán szereplő
kulcsok (app signing és upload key). Jelenleg **öt** ujjlenyomat van felvéve.

> **Az Enforce jelenleg KI van kapcsolva**, és ez szándékos. Csak akkor kapcsold
> be, ha az új buildek már kint vannak a tesztelőknél, és a *Requests* grafikon
> hitelesített forgalmat mutat. Idő előtt bekapcsolva minden kérést elutasít.

## 6. Költségvédelem 🔒

Ez a rész a „reggel felébredek egy nagy számlára" ellen véd. Négy réteg:

1. **`maxInstances: 10`** — kódban, a `functions/src/index.ts` tetején.
2. **Visszaigazolt e-mail** minden íráshoz — a szabályokban.
3. **Költségvetési riasztás:** *Google Cloud Console → Billing → Budgets &
   alerts.* Hozz létre egy költségvetést a projektre, és **kapcsold be a
   „Connect a Pub/Sub topic to this budget" opciót** a `billing-alerts` témára.
4. **Számlázás lekapcsolása:** a `disableBillingOnBudget` függvény hallgatja ezt
   a témát, és a keret túllépésekor **leválasztja a számlázási fiókot**. Ehhez a
   függvény szolgáltatásfiókjának jogosultság kell:

```bash
# ⚙ egyszeri beállítás, számlázási fiók szintjén
gcloud billing accounts add-iam-policy-binding <BILLING_ACCOUNT_ID> \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/billing.admin"
```

## 7. TTL a meghívókra 🔒

**Firestore → TTL** → új szabály: `invites` gyűjtemény, `expiresAtTime` mező.

A lejárt meghívók így maguktól eltűnnek. A mező kifejezetten emiatt létezik
`Timestamp` típusban — a TTL a számként tárolt `expiresAt`-et figyelmen kívül
hagyná.

---

## 8. Fejlesztői szerver ⚙

```bash
APP_VARIANT=development npx expo start --dev-client --tunnel
```

Tunnel módban a telefon bármilyen hálózaton lehet. A címet a `PickIt Dev`
*Enter URL manually* mezőjébe kell beírni; **újraindításkor változhat**.

Helyi hálózaton (`--lan`) gyorsabb, de iOS-en a *Beállítások → PickIt Dev →
Helyi hálózat* engedélynek bekapcsolva kell lennie.

Gyorsítótár ürítése: `--clear`.

## 9. Szabályok és függvények telepítése ⚙

```bash
npx firebase-tools deploy --only firestore:rules,functions --project pickitclaude
```

> A kimenetben szereplő *„already up to date, skipping upload"* nem jelenti, hogy
> nem történt semmi — de azt sem, hogy igen. Ha bizonyosság kell, az élő
> szabálykészlet lekérdezhető a Rules API-ból.

## 10. Buildek készítése ⚙

```bash
npx eas-cli build --platform all --profile development   # fejlesztői
npx eas-cli build --platform all --profile production    # tesztelői / bolti
```

**Amit tudni kell a lejáratról:** a belső terjesztésű (development, preview)
buildek csomagja **kb. két hét után törlődik** az EAS-ről. A telepített app
tovább működik, de újratelepíteni nem lehet belőle. A production buildeknél ez
30 nap.

**iOS eszközregisztráció** 🔒: minden fejlesztői buildhez a telefon UDID-jének
benne kell lennie a profilban. Új készülékhez:

```bash
npx eas-cli device:create    # ⚙ majd a telefonon el kell fogadni 🔒
```

Egy meglévő buildet **nem lehet utólag kiterjeszteni** új eszközre — új build kell.

## 11. Telepítés a telefonra 🔒

**iOS-en nincs fájlból telepítés.** A `.ipa` letöltése csak az App Store
Connectbe való feltöltéshez jó.

- **Fejlesztői build:** nyisd meg az EAS build oldalát **magán az iPhone-on**
  Safariban, és nyomd meg az *Install* gombot. Gyorsabban: a gépen nyitod meg, és
  beolvasod a QR-kódot.
- **Tesztelői build:** TestFlighten keresztül.
- **Android:** az APK közvetlenül telepíthető.

## 12. Kiadás a tesztelőknek 🔒

**iOS / TestFlight:**

```bash
npx eas-cli submit --platform ios --profile production   # ⚙
```

Utána *App Store Connect → TestFlight* → belső tesztelői csoport → tesztelők
felvétele e-mail címmel.

**Android / Play Console:** az `.aab` feltöltése *Tesztelés → Belső tesztelés →
Új kiadás*. A verziókód nem használható újra — ha ütközik, új build kell.

## 13. OTA frissítés ⚙

```bash
npx eas-cli update --branch production --message "..."
```

**Csak akkor ér el egy buildet, ha a fingerprintje egyezik.** Ellenőrzés:

```bash
npx eas-cli fingerprint:compare    # ⚙
```

Ha eltér, az update **némán senkihez nem jut el** — ilyenkor új build kell.

## 14. Adatok törlése 🔒

A sorrend számít, különben az app visszaírja magát.

1. **Authentication → Users** → fiókok törlése. *(A kiadott token még legfeljebb
   egy óráig érvényesnek látszik.)*
2. **Firestore ürítése:**
   ```bash
   npx firebase-tools firestore:delete --all-collections --recursive --force --project pickitclaude   # ⚙
   ```
3. **A telefonokon a helyi adat** — ezt a konzolos törlés **nem érinti**:
   - fejlesztői változatban: *Beállítások → Fejlesztői eszközök → Helyi adatok
     visszaállítása*
   - Androidon: *Beállítások → Alkalmazások → PickIt → Tárhely → Adatok törlése*
   - iOS-en: **csak az app törlése és újratelepítése**

---

## Ami most nyitva van

- **App Check Enforce** — kikapcsolva, az 5. pont feltételéig.
- **APNs kulcs a `.dev` iOS apphoz** — enélkül a fejlesztői változatban nincs push.
- **App Store Connect app neve** `PickItClaude`; a TestFlight meghívó ezen a
  néven megy ki. Átnevezhető `PickIt`-re.
