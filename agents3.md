# PickIt — teljes specifikáció

Ez a dokumentum **mindent tartalmaz, ami a fejlesztés kezdete óta kérésként elhangzott**,
témák szerint rendezve (nem időrendben). Önálló olvasmány: nem feltételezi a
`claude.md` (alapspecifikáció) vagy a `claude2.md` (közbenső finomítások) ismeretét,
de azokkal nem mond ellent — ha eltérés van, ez a dokumentum az érvényes.

A nyers, időrendi kéréslista külön fájlban van: `pickit-full-prompts.md`.

---

## 1. Mi ez az alkalmazás

Bevásárlólista mobilalkalmazás, amit egyedül és közösen (család, barátok) is lehet
használni. A hangsúly a súrlódásmentes napi használaton van: gyors tételfelvétel,
azonnali szinkron a tagok között, és annak elkerülése, hogy ketten megvegyék
ugyanazt.

**Kötelező technológiai keret:**

- React Native, **Expo SDK 54** — kifejezetten *nem* 56
- Backend: Firebase (Firestore, Auth, Cloud Functions, FCM)
- Projektkönyvtár: `/Users/jattila/www/claude/PickIt` — a `pickit_claude` nem használandó
- Firebase projekt: `pickitclaude`, alkalmazás-azonosító: `com.pickitclaude.app`

---

## 2. Használat regisztráció nélkül és regisztrációval

**Vendég mód.** Az app regisztráció nélkül is teljes értékűen használható: listák,
tételek, bejelölés. Ilyenkor minden adat kizárólag a telefonon él, és az app
újraindítása után is megmarad. Nincs a háttérben létrehozott fiók.

**Regisztráció.** Opcionális, e-mail + jelszó + **név** megadásával. A név a
csoportokban jelenik meg a tagoknál.

**Átállás.** Regisztrációkor a vendég módban felvett listák és tételek egyszeri
művelettel átkerülnek a fiókba, majd a helyi tároló ürül. Semmi nem duplikálódik —
ideértve a rejtett alapértelmezett listát is.

**Bejelentkezési felület:**

- A jelszó mezőben **szem ikon** mutatja/rejti a jelszót
- A bejelentkezési és a regisztrációs képernyő **oda-vissza átvált** egymásra
- Ha az e-mail cím már foglalt, érthető magyar hibaüzenet jelenik meg
- Vendégként a főképernyő fejlécének jobb oldalán **kék „Belépés" gomb** van
- Kijelentkezés után az app visszatér a főképernyőre

---

## 3. Listák és tételek

**Több lista** hozható létre. Azonos nevű lista nem hozható létre kétszer — sem
személyes, sem csoportos körben.

**Tétel műveletek:** hozzáadás, törlés, átnevezés, **mennyiség** megadása,
**kedvencnek jelölés**, és a megvásárolt tételek bejelölése.

**A főképernyő** egyszerre mutat listákat és tételeket:

- felül a listák („Saját listáim és tételeim" fejléc + „+ Új lista")
- alattuk közvetlenül a tételek
- a gyorsan felvett tételek egy **rejtett háttérlistába** kerülnek, amit a
  felhasználó nem lát külön listaként
- ez a rejtett lista **csak az első tétel felvételekor jön létre** — a puszta
  megnyitás nem hoz létre üres listát
- nincs „Teendő" felirat sehol; csak a bejelölt tételek kapnak „Megvéve" fejlécet

**Sorrend:** a tételek **ábécésorrendben** jelennek meg (magyar szerint, tehát az
ö/ő/ü/ű a helyén), a **kedvencek elöl**. A kedvenc a soron egy csillag ikonnal
jelölhető és kapcsolható.

**Mennyiség:** szabad szöveg („2", „2 kg", „1 doboz"), mert ez gyakran mértékegység
vagy kiszerelés, nem szám. A hozzáadó sávban közvetlenül megadható, meglévő tételnél
pedig a művelet-panelből módosítható. Üresen hagyva törlődik.

**Beírás:** a tételek kezdőbetűje kisbetű, már **gépelés közben** is.

**Új tétel után** a lista automatikusan az új tételre görget.

---

## 4. Katalógus és ajánlások

A felvett termékek egy **katalógusba** kerülnek, amiből az app gépelés közben
ajánlásokat ad, hogy ne kelljen a teljes nevet beírni.

**Hatókörök szigorúan elkülönülnek:** minden csoportnak **saját katalógusa** van, és
külön van a személyes katalógus. Ezek soha nem keverednek.

**Az ajánlás működése:**

- a szó **közepén** is talál, nem csak a nevek elején
- **ékezet-érzéketlen**: a „tejfol" is megtalálja a „tejföl"-t
- a szó elején egyező találatok kerülnek előre, azon belül a gyakrabban vásárolt termék
- **nem ajánl olyan terméket, ami már rajta van a listán** (sem az aktív, sem a
  megvéve szekcióban)

**Katalógus szerkesztő:** a katalógus bejegyzései átnevezhetők és törölhetők, külön a
személyes és külön a csoport katalógusában.

**A mennyiség nem kerül a katalógusba.** A katalógus a termékről szól: a „2 kg tej"
nem másik termék, mint a „tej" — ha bekerülne, szétaprózná az ajánlásokat.

**A listáról törölt tétel a katalógusban marad** (terméktörténet), hogy legközelebb
is felajánlható legyen. Ha valamire tényleg nincs szükség, a katalógus szerkesztőben
törölhető.

---

## 5. Csoportok és tagság

Regisztrált felhasználó **csoportot hozhat létre**, és tagokat hívhat meg
megosztható kód vagy link alapján. A meghívott csak **regisztráció után**
csatlakozhat.

A csoport listáihoz és tételeihez **csak a tagok** férnek hozzá, és csak ők
szerkeszthetik.

**A csoport képernyője** ugyanúgy viselkedik, mint a főképernyő: felül a csoport
listái, alattuk a csoport közös tételei egy rejtett közös listában.

**Elnevezések:** a fejléc a csoport nevét mutatja (pl. „Juhász Család"), és a
kiküldött meghívóban is a csoport neve szerepel. A meghívó megnyitásakor mindig a
csoport **aktuális** neve látszik — átnevezés után is.

**Tulajdonosi jogok:** a csoportot csak a tulajdonos nevezheti át és törölheti.
Törléskor a csoport listái, tételei és tagjai is törlődnek.

**Tagok képernyő:**

- hosszan nyomva egy tagra megjelenik az **e-mail címe**
- a saját sorodnál **„(én)"** jelölés
- a tulajdonos **felfüggeszthet** és **visszaengedélyezhet** tagokat
- a felfüggesztett tag **pirossal, áthúzva**, „felfüggesztve" jelöléssel látszik

**Felfüggesztés hatása:** a felfüggesztett tag nem látja a csoport listáit,
tételeit és katalógusát. Az **app következő megnyitásakor értesítést kap** róla,
amiben szerepel a **tulajdonos e-mail címe**, hogy jelezni tudjon — az értesítés
appon belül jelenik meg, nem e-mailben.

**Kilépés:** a tagok bármikor kiléphetnek a csoportból. A tulajdonos nem tud
kilépni — neki a csoport törlése a megfelelője.

**Csatlakozás:** a „Csoportjaim" alatt van egy **„Csatlakozás egy csoporthoz"**
gomb, ami meghívó kódot kér be.

---

## 6. Együttműködés és ütközések elkerülése

**Azonnali szinkron:** a változások — új tétel, bejelölés — azonnal látszanak a
tagoknál.

**Egy termék csak egyszer:** ugyanaz a termék nem vehető fel kétszer ugyanarra a
listára.

**Bejelölt tétel védelme:** egy már megvéve jelölt tételt nem lehet óvatlanul
visszatenni a listára — az app megerősítést kér, és megmutatja, ki és mikor jelölte be.

**Friss vásárlás figyelmeztetés:** ha egy csoportos listán **valaki más** nemrég
bejelölt egy tételt, az app figyelmeztet rá. Az „nemrég" időtartama a beállításokban
**tagonként egyedileg** állítható, és a figyelmeztetés ki is kapcsolható.

---

## 7. Értesítések

**Azonnali értesítés.** Csoportos lista változásáról (új tétel, bejelölés) push
üzenet megy azoknak a tagoknak, akiknél **épp nincs nyitva az app** — aki használja,
látja élőben, őt nem zavarjuk. Tagonként legfeljebb kétpercenként egy, hogy több
tétel gyors felvétele ne generáljon értesítés-áradatot. Kikapcsolható.

**Összefoglaló (digest).** Időnként összevont push a csoportok változásairól. Az
időköz **tagonként egyedileg** állítható, és az egész kikapcsolható. Nem megy ki
annak, aki épp az appot használja.

Az intervallum módosítása azonnal újraszámolja a következő esedékességet (az utolsó
összefoglalótól mérve), tehát a rövidítés nem vár ki egy teljes régi ciklust.

---

## 8. Beállítások

Bejelentkezett felhasználóknak, saját fiókonként:

| Beállítás | Mit szabályoz |
|---|---|
| Figyelmeztetés friss vásárlásra | ki/be |
| Mennyire számít frissnek | 15 perc / 30 perc / 1 óra / 3 óra |
| Azonnali értesítés | ki/be |
| Összefoglaló értesítés | ki/be |
| Milyen gyakran | 30 perc / 1 óra / 3 óra / 12 óra |

Emellett: fiók adatai, kijelentkezés, csatlakozás meghívó kóddal; vendégként
regisztráció és bejelentkezés.

---

## 9. Offline működés

Az app **internetkapcsolat nélkül is működik**: listák és tételek felvétele,
módosítása, bejelölése. A változások a kapcsolat helyreálltakor automatikusan
szinkronizálódnak.

Offline állapotban a képernyő **alján** piros sáv jelzi a helyzetet. Szándékosan
alul, mert felül eltakarná a fejlécet és a vissza gombot.

Ami kapcsolatot igényel (bejelentkezés, regisztráció, jelszó-visszaállítás, meghívó
készítése és beváltása), az offline **letiltva**, magyarázó üzenettel — nem hibára
fut.

---

## 10. Kezelés és felület

**Navigáció:**

- alul **fülsáv**: Áttekintés / Katalógus / Beállítások
- bal felül **hamburgermenü**: logó, fiók neve és csoportja, navigáció, csoportlista,
  fiókműveletek
- listába vagy csoportba lépve a fülsáv és a hamburger **végig látható marad**, a
  hamburger a vissza nyíl **előtt** áll
- a „Katalógus" mindig a **kontextushoz tartozó** katalógust nyitja: csoportban a
  csoportét, máshol a személyeset

**Sor-műveletek.** Minden sor (lista, csoport, tétel) kezelhető **ikonnal és hosszú
nyomással** egyaránt. A műveletek csúsztatásra is előjönnek, ugyanabban a panelben.
A sor **nem csúszik ki** a képernyőről — helyben marad, a gombok úsznak be fölé.

**Billentyűzet.** A beviteli mezőt nem takarhatja el a billentyűzet, és a **fejléc a
helyén marad** — csak a lista területe szűkül.

---

## 11. Adatvédelem és jogosultságok

- A csoport adataihoz csak az aktuális tagok férnek hozzá; a felfüggesztett tag
  azonnal elveszíti a hozzáférést
- A tagságot senki nem módosíthatja közvetlenül a kliensből — csatlakozás,
  felfüggesztés és kilépés kizárólag szerveroldalon történik
- A katalógus-bejegyzéseket a szerver hozza létre; a felhasználó szerkesztheti és
  törölheti a sajátját, de nem gyárthat hamisat
- A felhasználó a saját beállításait írhatja, az értesítések ütemezését nem
- Az appon belüli értesítéseket a felhasználó olvashatja és elutasíthatja, de nem
  hozhat létre

---

## 12. Kiadás és tesztelés

- Fejlesztéshez `expo-dev-client` + EAS Build (Expo Go nem alkalmas a natív modulok
  miatt)
- Android: telepíthető APK, illetve Google Play belső tesztelés
- iOS: TestFlight
- A tisztán JS-módosítások azonnal élnek; natív modul hozzáadásakor új build kell

---

## 13. Szándékos döntések, amiket érdemes tudni

Ezek nem hiányosságok, hanem megfontolt választások:

- **A listáról törölt tétel a katalógusban marad** — a katalógus terméktörténet, nem
  a lista tükre. Célzott törlésre a katalógus szerkesztő való.
- **A kedvenc a tételhez tartozik, nem a termékhez** — listánként külön jelölhető.
- **A tulajdonos nem függesztheti fel magát és nem léphet ki** — a csoport
  adminisztrátor nélkül maradna.
- **A felfüggesztésről appon belül értesítünk, nem e-mailben** — az e-mail külső
  szolgáltatót, SMTP-hitelesítést és egy bővítményt igényelne egyetlen mondatért.
- **A vendég módban nincs push és nincs csoport** — fiók nélkül nincs kihez
  kapcsolni az értesítést, és nincs kivel megosztani.
- **Androidon a beviteli mező a billentyűzet felső élére simul** — a rendszer nem ad
  megbízható adatot a gyártói eszköztárak magasságáról, ezért fix ráhagyással
  dolgozunk; ennél pontosabb igazítás nem érhető el.
