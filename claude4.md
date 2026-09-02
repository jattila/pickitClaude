# PickIt — újraépítési leírás

Ebből a dokumentumból az alkalmazás **nulláról felépíthető**. Azt írja le, *miből
áll* és *hogyan illeszkedik össze* — a viselkedést a [SPEC.md](SPEC.md), a
zsákutcákat a [DECISIONS.md](DECISIONS.md) tartalmazza. A konzolos, kézzel
elvégzendő teendők külön fájlban vannak: [OPERATIONS.md](OPERATIONS.md).

---

## 1. Mi ez

Közös bevásárlólista mobilra. **Fiók nélkül is teljes értékű**: a listák a
telefonon, SQLite-ban élnek. Regisztráció után a felhőbe költöznek, és
megoszthatók — egy család közösen szerkesztheti a teljes bevásárlólistát, és
egy-egy alkalmi listát (buli, nyaralás) más körrel is meg lehet osztani.

---

## 2. Technológiai alapok

| Réteg | Választás | Verzió |
|---|---|---|
| Keretrendszer | Expo (**SDK 54**, nem 56) | `~54.0.0` |
| React Native | | `0.81.5` |
| Navigáció | expo-router (fájlalapú) | `~6.0.24` |
| Állapot | zustand | `^5.0.14` |
| Helyi tároló | expo-sqlite | `~16.0.10` |
| Backend | React Native Firebase | `^25.1.0` |
| OTA | expo-updates | `~29.0.19` |

Firebase modulok: `app`, `auth`, `firestore`, `functions`, `messaging`,
`app-check`, `analytics`. Kiegészítők: `expo-dev-client`, `expo-constants`,
`expo-linking`, `react-native-gesture-handler`, `react-native-reanimated`,
`react-native-keyboard-controller`, `react-native-safe-area-context`,
`react-native-screens`.

### Natív beállítások, amiket nem lehet kihagyni

- **`expo-build-properties` → `ios.useFrameworks: "static"`** — a Firebase iOS
  SDK statikus keretrendszereket vár.
- **`plugins/withFirebaseStaticFramework.js`** — saját config plugin, ami a
  fentit kiegészíti.
- **`patch-package`, négy folttal** (`firestore`, `messaging`, `app-check`,
  `analytics` — mind `25.1.0`). Mindegyik ugyanazt javítja: a
  `#import <React/RCTBridgeModule.h>` a modul-fejléc **elejére** kerül. Enélkül
  az iOS build elhasal `declaration of 'RCTBridgeModule' must be imported from
  module...` hibával. A `postinstall` futtatja őket.
- **Android `POST_NOTIFICATIONS`** engedély kézzel felvéve — sem a Notifee, sem
  az RNFirebase nem deklarálja, és Android 13-tól enélkül a kérdés fel sem jön.
- **Android `softwareKeyboardLayoutMode: "resize"`** — a
  `react-native-keyboard-controller` ezt várja.
- **Analytics `withoutAdIdSupport: true`** iOS-en — reklámazonosító nélküli
  build, így nem kell App Tracking Transparency.

---

## 3. Adatmodell

### Firestore

```
users/{uid}
  email, displayName, settings{}, createdAt
  defaultListId      ← AMELYIK LISTÁRA A FŐKÉPERNYŐ ÍR (lehet megosztott is)
  personalListId     ← a fiók saját, privát listája; megosztás nem mozdítja
  guestDataMigratedAt
  activeUntil        ← jelenlét, a kliens írja
  nextDigestDueAt, lastDigestSentAt   ← CSAK az Admin SDK írja
  ├── devices/{token}       push-tokenek
  ├── pendingDigest/{listId} összefoglaló-számlálók (csak trigger írja)
  ├── notices/{id}          app-on belüli üzenetek (csak trigger írja)
  └── catalog/{slug}        személyes terméktár

groups/{groupId}                    ← „kör": egy megnevezett közönség
  name, ownerId, memberIds[], createdAt, updatedAt
  mainListId          ← a kör teljes bevásárlólistája, vagy null
  ├── members/{uid}   uid, displayName, email, role, joinedAt, suspended
  └── catalog/{slug}  közös terméktár

lists/{listId}
  name, ownerId, groupId   ← null = privát; egyébként a kör azonosítója
  activeItemCount, boughtItemCount, lastActivityAt, createdAt, updatedAt
  └── items/{slug}   name, normalizedName, quantity, favorite,
                     checked, checkedBy, checkedByName, checkedAt,
                     addedBy, createdAt, updatedAt

invites/{CODE}      ← a kliens EGYÁLTALÁN nem éri el, csak függvények
  groupId, groupName, invitedEmail, createdBy, createdAt,
  redeemedAt, redeemedBy, expiresAt, expiresAtTime, maxUses, useCount, revoked
```

**Két kulcsfogalom, amit könnyű összekeverni:**

- **A megosztás nem másolás és nem áthelyezés.** Egy lista `groupId` mezője
  megnevezi a közönséget. `null` = privát. Megosztani annyi, mint ezt az egy
  mezőt beállítani; a lista ugyanaz a dokumentum marad.
- **A kör neve mindig a lista nevéből származik**, soha nem külön kérdés.

**Tétel- és katalógusazonosító:** a név normalizált változatának „slug"-ja. Ezért
egy tétel átnevezése *törlés + létrehozás*, nem módosítás.

### Helyi SQLite (`pickit-guest.db`)

`lists`, `items`, `catalog`, `meta`. A `meta` kulcs-érték táblában:
`defaultListId`, `hadAccountHere`, `guestSaveWarningSeen`. A `meta` az egyetlen
tároló, ami túléli a kijelentkezést **és** a felhőbe költöztetést.

---

## 4. Felépítés

### Tárolóréteg

`ListsRepository` interfész, két megvalósítással: `LocalListsRepository`
(SQLite, vendég) és `FirestoreListsRepository` (bejelentkezve). A
`useRepository()` az auth-állapot alapján választ — a képernyők nem tudják,
melyikkel dolgoznak.

### Az aktív bevásárlólista

Egyszerre **egy** lista aktív, választósáv nélkül. A `useActiveShoppingList`
oldja fel ebben a sorrendben: `users/{uid}.defaultListId` → az első olyan kör
`mainListId`-je, aminek tagja vagyok → a személyes lista. A fejléc címe **az
aktív lista neve** — ez az egyetlen jelzés arról, hova kerül a következő tétel.
Váltani a Beállításokban lehet (`useShoppingListChoices`).

### Képernyők

```
app/_layout.tsx              gyökér; itt fut az EmailVerificationGate kapu
app/(tabs)/(home)/index.tsx  főképernyő: aktív lista tételei + listasorok
app/(tabs)/(home)/list/[listId].tsx    egy lista részletei, megosztás gomb
app/(tabs)/(home)/group/[groupId]/     kör: listái, tagjai, katalógusa
app/(tabs)/catalog.tsx       terméktár szerkesztő
app/(tabs)/settings.tsx      fiók, bevásárlólisták, csatlakozás, értesítések
app/sign-in|sign-up|forgot-password.tsx
app/join/[code].tsx          meghívó beváltása
```

### Központi szolgáltatások

| Fájl | Felelősség |
|---|---|
| `services/firebase.ts` | inicializálás, App Check |
| `services/sharing.ts` | `shareList` / `unshareList` |
| `services/groups.ts` | körök, tagok, meghívók, csoportlisták |
| `services/migration.ts` | vendégadat átköltöztetése, **egyszer** |
| `services/provisioning.ts` | profil létrehozása + a migráció indítása |
| `services/firestoreWatch.ts` | egységes `onSnapshot` burkolat |
| `services/normalize.ts` | slug és megjelenített név |
| `services/devReset.ts` | `__DEV__`-only helyi visszaállítás |

---

## 5. Cloud Functions

`setGlobalOptions({ maxInstances: 10 })` — **költségplafon**, ez a legfontosabb
sor az egész backendben.

**Hívható (`us-central1`):** `createInvite`, `redeemInvite`, `getInvitePreview`,
`getGroupInvites`, `revokeInvite`, `setMemberSuspended`, `leaveGroup`,
`backfillMemberEmails`.

**Trigger és ütemezett (`europe-west1`):** `onItemCreated`, `onItemUpdated`,
`onItemDeleted` (számlálók + katalógus + push), `digestScheduler`,
`onUserSettingsUpdated`, `disableBillingOnBudget`.

Minden hívható a `requireVerifiedUid()`-dal kezd: bejelentkezés **és**
visszaigazolt e-mail cím nélkül elutasít.

---

## 6. Biztonsági szabályok — a három tartóoszlop

1. **`isSignedIn()` visszaigazolt e-mailt is jelent.** A regisztráció bárkinek
   nyitva áll, és minden írás függvényhívásokra és további írásokra fut ki. Egy
   működő postafiók fiókonként a legolcsóbb fék a tömeges visszaélés ellen.
2. **A `groupId` átírása külön feltétel alá esik** (`isValidShareChange`): csak a
   lista tulajdonosa teheti, és csak olyan körbe, aminek tagja. Az `ownerId`
   minden módosításnál rögzített, különben ez megkerülhető lenne.
3. **A `users/{uid}` frissítése négy mezőre korlátozott**: `settings`,
   `defaultListId`, `personalListId`, `activeUntil`. Az összefoglaló ütemezés
   mezőit csak az Admin SDK írja.

Az `invites` gyűjteményt a kliens **egyáltalán nem éri el**.

Az indexek a `firestore.indexes.json`-ban vannak — a `lists` háromféle
lekérdezése és az `items` rendezése miatt kellenek.

---

## 7. Kiadás

**Változatok.** Az `APP_VARIANT=development` környezeti változó dönti el, melyik
identitást kapja a build (`app.config.ts`):

| | Tesztelői / éles | Fejlesztői |
|---|---|---|
| Név | PickIt | PickIt Dev |
| Azonosító | `com.pickitclaude.app` | `com.pickitclaude.app.dev` |
| Séma | `pickit://` | `pickit-dev://` |

Így a két változat **egyszerre fent lehet** ugyanazon a telefonon. A meghívó
linkje a futó app sémájából épül, nem beégetve.

**EAS profilok:** `development` (internal + dev client), `preview` (internal
APK), `production` (store, `autoIncrement`). `appVersionSource: "remote"`.

**OTA.** `runtimeVersion: { policy: "fingerprint" }`. Update csak akkor ér el egy
buildet, ha a fingerprintje egyezik — natív változás után **új build kell**.

---

## 8. Újraépítés sorrendje

1. `npx create-expo-app` **SDK 54**-gyel, majd a 2. pont függőségei.
2. **Firebase projekt és appok létrehozása** → [OPERATIONS.md](OPERATIONS.md)
   1–3. pont. A `google-services.json` és a `GoogleService-Info.plist` nélkül
   semmi nem fordul; ezek **gitignore-oltak**.
3. `app.json` + `app.config.ts` + `eas.json` a 7. pont szerint.
4. `patches/` négy foltja, `postinstall` beállítása.
5. Adatréteg: `types.ts` → `ListsRepository` → a két megvalósítás →
   `useRepository`.
6. Auth és kapu: `authStore`, `provisioning`, `migration`,
   `EmailVerificationGate`.
7. Képernyők a 4. pont szerint.
8. `functions/` az 5. pont szerint, `firestore.rules` a 6. szerint, majd
   telepítés.
9. **App Check, költségvetési riasztás, TTL** → [OPERATIONS.md](OPERATIONS.md).

---

## 9. Amit könnyű elrontani

- **A `defaultListId` nem a személyes lista**, hanem az aktív. A privát listát a
  `personalListId` őrzi. A kettő megosztáskor válik szét.
- **A migráció pontosan egyszer fut**: a regisztrációt követő első
  megerősítéskor. Az őr a profil *létezése*, és a profil **utoljára** íródik, hogy
  egy félbeszakadt migráció újrapróbálható legyen.
- **A jelenlétkezelés nem hozhat létre profilt.** `updateDoc`, nem
  `setDoc(merge)` — különben egyetlen mezős dokumentumot ír, amit a provisioning
  kész fióknak lát, és kihagyja a migrációt.
- **`auth.currentUser` minden lekérdezéskor friss pillanatkép.** A `reload()`
  előtt elkapott objektum a régit mondja.
- **Androidon a `Modal` külön ablak** — ezért a `PromptDialog` az app saját
  nézetfájában rajzol, nem Modalban.
- **A felfüggesztés a körre hat, nem a listára** — a kör összes listáját lezárja.
