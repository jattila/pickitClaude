# PickIt — kérések és megvalósított finomítások

Ez a fájl a `claude.md` alapspecifikáción túli, fejlesztés közben érkezett kéréseket
és döntéseket gyűjti össze időrendben/témák szerint. Az alap-architektúrát lásd:
Firebase (Firestore + Auth + Cloud Functions + FCM), Expo SDK 54, React Native,
`expo-dev-client` + EAS Build.

## Projekt alapdöntések

- **Projektkönyvtár:** `/Users/jattila/www/claude/PickIt` (a `pickit_claude` NEM használandó).
- **Backend:** Firebase, projekt: `pickitclaude` (Blaze csomag bekapcsolva a Cloud Functions miatt).
- **App azonosító (bundle/package):** `com.pickitclaude.app` (a `com.pickit.app` foglalt volt).
- **Vendég mód:** tisztán helyi tárolás `expo-sqlite`-tal, nincs háttér-fiók regisztrációig.
- **Regisztráció:** email + jelszó (Firebase Auth), névvel együtt.
- **Migráció:** regisztrációkor a helyi SQLite adatok (listák, tételek) egyszeri
  batch-write-tal átkerülnek a Firestore-ba, majd a helyi tábla ürül.
- **Katalógus scope:** csoportonkénti (`groups/{groupId}/catalog`) és személyes
  (`users/{uid}/catalog`) — sosem keverednek.

## Adatréteg / architektúra

- Közös `ListsRepository` interfész két megvalósítással: `LocalListsRepository`
  (SQLite, vendég) és `FirestoreListsRepository` (regisztrált). `useRepository()`
  az auth állapot alapján vált.
- A tétel doksi ID-je = a normalizált név slug-ja → egy termék csak egyszer
  vehető fel, és a bejelölt tétel újbóli felvétele megerősítést kér (nem duplikál).

## Regisztráció / bejelentkezés

- A regisztrációnál **név** is megadható → `displayName` a Firestore-ban és a
  Firebase Auth fiókban (csoporttagoknál ez jelenik meg).
- "Foglalt email" esetén érthető hibaüzenet ("Ezzel az email címmel már van fiók…").
- A regisztráció/bejelentkezés/jelszó-visszaállítás képernyők görgethetők, hogy a
  billentyűzet és a hibaüzenet ne takarja ki a gombot.
- **Firestore rules bug fix:** regisztrációkor a migráció `permission-denied`-et
  dobott — a listákat a tételeik ELŐTT kell commitolni (a same-batch `get()` a
  batch előtti állapotot látja).
- **Katalógus write bug fix:** a személyes katalógus írását engedélyezni kellett
  (később a Cloud Function trigger vette át, a kliens már nem ír katalógust).

## Listák és tételek — főképernyő

- A főképernyőn lista ÉS tétel is felvehető közvetlenül. A gyorsan felvett tételek
  egy **rejtett háttérlistába** kerülnek (a felhasználó nem látja külön listaként),
  és közvetlenül a főképernyőn jelennek meg.
- Elrendezés: felül a listák ("Saját listáim és tételeim" fejléc + "+ Új lista"),
  alattuk közvetlenül a tételek.
- **Nincs "Teendő" felirat** sehol (sem a főképernyőn, sem a lista-részletezőn) —
  csak a "Megvéve" szekció kap fejlécet a bejelölt tételeknél.
- Nem lehet két azonos nevű listát létrehozni (személyes és csoportos körben is).
- A szekció-fejlécek egy vonalban kezdődnek a sorokkal (nincs dupla behúzás).
- Új tétel felvétele után a lista automatikusan az új tételre görget (mérés-alapú,
  azonnali — nincs érzékelhető késleltetés).
- A tételek kezdőbetűje kisbetű, már **gépelés közben** is (nem csak mentéskor).
- A billentyűzet nem takarja ki a beviteli mezőt (KeyboardAvoidingView + header offset).

## Csoportok

- Csoport létrehozása, tagok meghívása megosztható kód/link alapján
  (`createInvite`/`redeemInvite` Cloud Functions).
- A meghívott csak **regisztráció után** csatlakozhat.
- A csoport-listák képernyő a fejlécben a **csoport nevét** mutatja (pl. "Juhász
  Család"), és a **kiküldött meghívóban** is a csoport neve szerepel.
- A meghívó előnézete mindig a csoport **aktuális** nevét mutatja (átnevezés után
  is) — külön `getInvitePreview` Cloud Function olvassa élőben.
- A csoportot **csak a tulajdonos** nevezheti át / törölheti (ikon + long-press),
  törléskor kaszkádolva törlődnek a listák/tételek/tagok.
- A csoport képernyő a főképernyővel azonosan viselkedik: felül a csoport listái,
  alattuk a csoport közös tételei (rejtett közös lista, determinisztikus ID-vel,
  hogy több tag egyidejű megnyitása se hozzon létre duplikátumot).
- A "Csoportjaim" alatt van egy **"Csatlakozás egy csoporthoz"** gomb (kód bekérés).

## Sor-műveletek (swipe + long-press)

- Minden sor (lista, csoport, tétel) átnevezhető/törölhető ikonnal ÉS long-press-szel.
- **Long-press bug fix:** a beágyazott dupla `Pressable` elnyelte az érintést →
  egyetlen `Pressable`-re vonva (onPress + onLongPress együtt).
- A long-press **ugyanazt** a művelet-panelt nyitja, mint a swipe (nincs külön alsó
  menü).
- A swipe/long-press **nem tolja ki** a sort a képernyőről — a sor helyben marad,
  és a gombok csúsznak be fölé jobbról (egyedi overlay megoldás, nem a beépített
  Swipeable).

## Cloud Functions (M4 — katalógus + számlálók)

- `onItemCreated` / `onItemUpdated` / `onItemDeleted` (Firestore trigger,
  europe-west1): a tétel a szülő lista `groupId`-je alapján a csoport vagy a
  személyes katalógusba kerül; denormalizált `activeItemCount`/`boughtItemCount`
  számlálók karbantartása.
- A kliens és a migráció már **nem ír** közvetlenül katalógust; a Firestore rules
  a katalógust szerver-only írásra korlátozza.
- Bug fix: a csoport rejtett alapértelmezett listájának feloldásakor `get()` egy
  még nem létező lista-doksin — a rules mostantól engedi a nem létező lista-doksi
  olvasását (semmit nem szivárogtat).

## Build / eszközök

- iOS dev-client build EAS-en (fizikai iPhone, ad-hoc), a Firebase config fájlok
  titkos EAS env-változóként feltöltve.
- Build-hibák megoldva: npm `legacy-peer-deps` (`.npmrc`), konzisztens lockfile,
  `app.config.ts` a Firebase config env-fájlokhoz, statikus frameworkök
  (`expo-build-properties` + `$RNFirebaseAsStaticFramework`), a RNFBFirestore
  iOS fordítási hiba patch-package-dzsel, nem-moduláris header hiba
  (`CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES`).

## Megjegyzés a tesztelésről

- A tisztán JS-módosítások Fast Refresh-sel azonnal élnek, nem kell új build.
- Új natív modul (pl. `@react-native-firebase/functions`) hozzáadásakor kell új
  EAS dev-client build.
- A Firestore adatok/felhasználók teljes törlése után az app egy ideig még a
  helyben tárolt (kb. 1 órán át érvényes) tokennel bejelentkezettként indulhat —
  kijelentkezés a Beállításokból azonnal visszaáll vendég módba.
