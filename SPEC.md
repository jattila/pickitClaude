# PickIt — funkcionális követelmények

Ez a dokumentum azt írja le, **mit kell az alkalmazásnak csinálnia**, és milyen
határesetekre kell helyesen reagálnia. Nem a megvalósításról szól: a „hogyan"
a kódban van, itt a **szándék** és az elvárt viselkedés szerepel.

Funkciónként csoportosítva. Minden pontban külön szerepel az alapviselkedés és
azok a határesetek, amelyek a fejlesztés során ténylegesen felmerültek — több
közülük hibából derült ki, ezért érdemes megőrizni őket.

---

## 1. Használat fiók nélkül

**Elvárt viselkedés.** Az alkalmazás regisztráció nélkül is teljes értékű:
listákat és tételeket lehet létrehozni, szerkeszteni, bejelölni. Az adatok a
telefonon maradnak, és az app újraindítása után is megvannak. A háttérben nem jön
létre semmilyen fiók.

**Határesetek:**

- Fiók nélkül **nincs csoport és nincs értesítés** — nincs kihez kapcsolni őket,
  és nincs kivel megosztani. Ez nem hiányosság, hanem a vendég mód természete.
- A vendég adatai **nem szinkronizálódnak sehova**, tehát készülékvesztés esetén
  elvesznek. A regisztráció az egyetlen módja a megőrzésüknek.

---

## 2. Regisztráció és bejelentkezés

**Elvárt viselkedés.** E-mail, jelszó és **név** megadásával lehet fiókot
létrehozni. A név az, ami a csoporttársaknak megjelenik.

A jelszó mezőben **szem ikon** mutatja és rejti a jelszót. A bejelentkezési és
regisztrációs képernyő között **oda-vissza lehet váltani**. Vendégként a
főképernyő fejlécében **kék „Belépés" gomb** kínálja a belépést.

**Határesetek:**

- **Foglalt e-mail cím** esetén érthető magyar üzenet jelenik meg, ami a
  bejelentkezés felé tereli — nem nyers hibakód.
- A jelszó **láthatóvá tétele nem változtathatja meg a beírtat**: nincs
  automatikus nagybetűsítés vagy javítás. Enélkül a felhasználó nem értené, miért
  nem sikerül a belépés.
- A két hitelesítési képernyő közti oda-vissza váltás **nem halmozhat fel**
  visszalépéseket.
- **Kijelentkezés után** az app a főképernyőre tér vissza — nem hagyja a
  felhasználót egy olyan képernyőn, amihez már nincs jogosultsága.
- Az alkalmazás **egy ideig bejelentkezettnek látszhat** azután is, hogy a fiókot
  szerveroldalon törölték: a helyben tárolt belépési adat kb. egy óráig érvényes.
  A kijelentkezés azonnal helyreállítja a vendég állapotot.

---

## 3. Áttérés fiókra (migráció)

**Elvárt viselkedés.** Regisztrációkor a vendég módban létrehozott listák és
tételek átkerülnek az új fiókba, majd a helyi tároló ürül.

**Határesetek:**

- **Semmi nem duplikálódhat.** Különösen a rejtett alapértelmezett lista: a
  migráció után **nem jelenhet meg két „Bevásárlólista"**.
- A tételek minden tulajdonsága átjön — a mennyiség és a **kedvenc jelölés** is.
- A migráció **egyszer fut le**; ismételt regisztráció nem hozhat be újra régi
  adatokat.

---

## 4. Listák

**Elvárt viselkedés.** Több lista hozható létre. Minden lista átnevezhető és
törölhető — **ikonnal és hosszú nyomással egyaránt**.

**Határesetek:**

- **Azonos nevű lista nem hozható létre kétszer** ugyanabban a körben (személyes,
  illetve csoportonként külön).
- A főképernyőn gyorsan felvett tételek egy **rejtett listába** kerülnek, amit a
  felhasználó soha nem lát külön listaként.
- Ez a rejtett lista **csak az első tétel felvételekor jön létre**. Az app
  megnyitása vagy egy csoporthoz csatlakozás **nem hozhat létre üres listát**.
- Csoportban a rejtett listát **több tag is megnyithatja egyszerre** — ettől sem
  jöhet létre belőle kettő.

---

## 5. Tételek

**Elvárt viselkedés.** Tétel hozzáadható, törölhető, átnevezhető, bejelölhető
megvettként, kaphat mennyiséget, és kedvencnek jelölhető. Minden művelet elérhető
**ikonnal és hosszú nyomással**, illetve csúsztatással.

A tételek **ábécésorrendben** jelennek meg, a **kedvencek elöl**. A rendezés
magyar szerint történik, tehát az ö/ő/ü/ű a helyére kerül, nem a lista végére.

A bejelölt tételek külön **„Megvéve"** szekcióba kerülnek. Az aktív tételek fölött
**nincs felirat** — nem kell „Teendő" cím.

Gépelés közben a tétel kezdőbetűje **kisbetűvé alakul**, nem csak mentéskor.

Új tétel felvétele után a lista **odagörget az új tételre**.

**Határesetek:**

- **Ugyanaz a termék csak egyszer** szerepelhet egy listán.
- Ha a felhasználó egy **már bejelölt** tételt próbál újra felvenni, az app
  **megerősítést kér**, és megmutatja, ki és mikor jelölte be — nem teszi vissza
  némán a listára. Ez a funkció lényege: elkerülni, hogy valaki újra megvegye,
  amit más már megvett.
- Ha egy **listán már szereplő** tételt vesz fel újra, **mennyiséggel együtt**, az
  a mennyiséget frissíti — ez a természetes módja a mennyiség javításának.
- Egy tétel **soha nem válhat láthatatlanná**. Ha valamiért hiányosan jött létre,
  akkor is meg kell jelennie a listán, és újbóli felvétellel javíthatónak kell
  lennie.

---

## 6. Mennyiség

**Elvárt viselkedés.** A mennyiség **szabad szöveg**: „2", „2 kg", „1 doboz". Nem
szám, mert gyakran mértékegység vagy kiszerelés. Megadható a tétel felvételekor, és
utólag is módosítható.

**Határesetek:**

- **Üresen hagyva törlődik** — ez a mennyiség eltávolításának módja.
- A mennyiség **soha nem kerül a katalógusba**. A katalógus a termékről szól: a
  „2 kg tej" nem másik termék, mint a „tej". Ha bekerülne, szétaprózná az
  ajánlásokat.

---

## 7. Kedvencek

**Elvárt viselkedés.** Bármely tétel kedvencnek jelölhető a soron lévő **csillag
ikonnal**, egyetlen koppintással. A kedvencek a saját szekciójuk **elejére**
kerülnek.

**Határesetek:**

- A kedvenc a **tételhez** tartozik, nem a termékhez — listánként külön jelölhető.
  Ugyanaz a termék az egyik listán lehet kedvenc, a másikon nem.
- A jelölés **túléli az átnevezést** és a **fiókra való áttérést**.
- A csillag a soron **nem ütközhet** a sor egyéb kezelésével (koppintás a
  bejelöléshez, hosszú nyomás a művelet-panelhez).

---

## 8. Katalógus

**Elvárt viselkedés.** A felvett termékek egy katalógusba gyűlnek, ami a gépelési
ajánlások alapja. A katalógus bejegyzései **átnevezhetők és törölhetők** egy külön
szerkesztő képernyőn.

**Hatókörök:** minden csoportnak **saját katalógusa** van, és külön van a
személyes. **Ezek soha nem keveredhetnek** — ez az alapspecifikáció kifejezett
követelménye.

**Határesetek:**

- A **listáról törölt tétel a katalógusban marad**. A katalógus terméktörténet, nem
  a lista tükre: amit egyszer vettél, azt később is fel akarod majd ajánlva látni.
  Célzott törlésre a szerkesztő való.
- A bejegyzés **átnevezhető olyan névre is, ami alapvetően más** — nem csak
  ékezet-javításra.
- Csoportban a **csoport katalógusát** kell használni akkor is, ha a csoport
  rejtett listája még nem létezik. Nem eshet vissza a személyes katalógusra.

---

## 9. Ajánlások gépelés közben

**Elvárt viselkedés.** Gépelés közben az app felajánlja a katalógusban szereplő
termékeket, hogy ne kelljen a teljes nevet beírni.

**Az egyezés szabályai:**

- a keresett szöveg a név **bármely részén** egyezhet, nem csak az elején
- **ékezet-érzéketlen**: a „tejfol" megtalálja a „tejföl"-t, és fordítva
- a **szó elején** egyező találatok kerülnek előre
- azon belül a **gyakrabban vásárolt** termék előrébb

**Határesetek:**

- **Nem ajánlja fel azt, ami már rajta van a listán** — sem az aktív, sem a
  „Megvéve" szekcióban szereplő tételt.
- Az ajánlásoknak **működniük kell akkor is, ha még nincs lista** — friss fiókkal,
  az első tétel felvétele előtt is, a katalógus tartalmából.

---

## 10. Csoportok

**Elvárt viselkedés.** Regisztrált felhasználó csoportot hozhat létre, és
megosztható kóddal vagy linkkel hívhat meg tagokat. A csoport listáihoz és
tételeihez **csak a tagok** férnek hozzá.

A csoport képernyője ugyanúgy működik, mint a főképernyő: felül a csoport listái,
alattuk a közös tételek.

**Határesetek:**

- A meghívott **csak regisztráció után** csatlakozhat — a csoporttagság stabil
  azonosságot igényel.
- A meghívó megnyitásakor mindig a csoport **aktuális neve** jelenik meg, akkor is,
  ha közben átnevezték.
- A kiküldött meghívóban is a **csoport neve** szerepel, nem általános szöveg.
- A csoportot **csak a tulajdonos** nevezheti át és törölheti. Törléskor a csoport
  listái, tételei és tagjai is törlődnek, **minden tagnál**.
- Csatlakozás után az app a csoport képernyőjére visz, és a fejlécben **nem
  jelenhet meg technikai név** — mindig a csoport neve vagy értelmes felirat.

---

## 11. Tagok kezelése

**Elvárt viselkedés.** A tagok listája mutatja a neveket és a szerepet. **Hosszan
nyomva** egy tagra megjelenik az **e-mail címe**. A saját sor **„(én)"** jelölést
kap.

A tulajdonos **felfüggeszthet** és **visszaengedélyezhet** tagokat. A felfüggesztett
tag **pirossal, áthúzva**, „felfüggesztve" felirattal látszik.

**Felfüggesztés hatása:** az érintett azonnal elveszíti a hozzáférést a csoport
listáihoz, tételeihez és katalógusához, és a csoport eltűnik a listájából. Az **app
következő megnyitásakor értesítést kap**, amiben szerepel a **tulajdonos e-mail
címe**, hogy jelezni tudjon.

**Kilépés:** a tagok bármikor kiléphetnek a csoportból.

**Határesetek:**

- A tulajdonos **nem függesztheti fel magát** és **nem léphet ki** — a csoport
  adminisztrátor nélkül maradna, visszaút nélkül. Neki a csoport törlése a
  megfelelője.
- A felfüggesztésről szóló értesítés **appon belül** jelenik meg, nem e-mailben.
- Az értesítés **pontosan egyszer** jelenik meg; elutasítás után nem tér vissza.
- Az értesítést a felhasználó **nem gyárthatja magának** — csak a rendszer hozhatja
  létre.
- **Kilépés után** a felhasználó nem kaphat értesítést az elhagyott csoport
  változásairól.
- Régebbi tagoknál **hiányozhat az e-mail cím** (a tárolása később került be) —
  ilyenkor ezt ki kell írni, nem üres helyet mutatni.

---

## 12. Együttműködés és ütközések

**Elvárt viselkedés.** A változások — új tétel, bejelölés — **azonnal látszanak** a
csoport tagjainál.

Ha egy csoportos listán **valaki más nemrég** bejelölt egy tételt, az app
figyelmeztet rá, hogy ne vegyék meg ketten.

**Határesetek:**

- A figyelmeztetés **csak csoportos listán** értelmezhető — személyes listán nincs
  más, aki megvehette volna.
- Csak **más** vásárlása számít, a sajátunk nem.
- Az „nemrég" időtartama **tagonként egyedileg** állítható, és a figyelmeztetés
  ki is kapcsolható.
- A figyelmeztetés **tételenként elutasítható**.

---

## 13. Értesítések

### Azonnali értesítés

**Elvárt viselkedés.** Csoportos lista változásáról push üzenet megy azoknak a
tagoknak, akiknél **épp nincs nyitva az app**. Az üzenet megnevezi a csoportot és
az érintett tételt.

**Határesetek:**

- Aki **használja az appot, nem kap** értesítést — látja élőben a változást.
- **Tagonként legfeljebb kétpercenként egy** értesítés. Öt tétel gyors felvétele
  nem generálhat öt push üzenetet.
- Akinek **nincs regisztrált eszköze**, azt a korlátozás nem némíthatja el
  feleslegesen.
- Az értesítés **kikapcsolható**.

### Összefoglaló (digest)

**Elvárt viselkedés.** Időnként összevont push a csoportok változásairól,
csoportonként összegezve.

**Határesetek:**

- Az időköz **tagonként egyedileg** állítható, és az egész kikapcsolható.
- Aki **épp az appot használja, nem kapja meg** — a függő változásokat viszont
  töröljük, hogy az app bezárása után se érkezzen összefoglaló olyasmiről, amit
  már látott.
- **Kikapcsolt** állapotban is törlődnek a függő változások, hogy a visszakapcsolás
  ne zúdítson rá egy felhalmozott listát.
- Az **intervallum módosítása azonnal** újraszámolja a következő esedékességet, az
  utolsó összefoglalótól mérve. Rövidítés után nem kell kivárni egy teljes régi
  ciklust.
- Az ütemezés **néhány perces pontossággal** működik — a push nem érkezik a
  lejárat másodpercében.
- Egy tartósan hibázó felhasználó **nem blokkolhatja** a többiek értesítéseit, és
  nem próbálkozhat vele a rendszer vég nélkül.

---

## 14. Beállítások

**Elvárt viselkedés.** Bejelentkezett felhasználónként állítható:

| Beállítás | Lehetőségek |
|---|---|
| Figyelmeztetés friss vásárlásra | be / ki |
| Mennyire számít frissnek | 15 perc / 30 perc / 1 óra / 3 óra |
| Azonnali értesítés | be / ki |
| Összefoglaló értesítés | be / ki |
| Milyen gyakran | 30 perc / 1 óra / 3 óra / 12 óra |

**Határesetek:**

- A figyelmeztetéssel kapcsolatos beállítások **azonnal érvényesek**.
- A felhasználó a saját beállításait módosíthatja, de az **értesítések belső
  ütemezését nem** — azt a rendszer kezeli.
- Vendégként a beállítások nem jelennek meg, mert nincs mire vonatkozniuk.

---

## 15. Offline működés

**Elvárt viselkedés.** Az app internetkapcsolat nélkül is használható: tétel
felvétele, módosítása, bejelölése. A változások a kapcsolat helyreálltakor
**automatikusan szinkronizálódnak**.

Offline állapotban a képernyő **alján** figyelmeztető sáv jelzi a helyzetet.

**Határesetek:**

- Az offline felvett tételnek **azonnal meg kell jelennie** a listán — nem tűnhet
  el, és nem várhat a kapcsolatra.
- A sáv **nem takarhatja el a fejlécet** és a vissza gombot: offline állapotban
  különösen fontos, hogy a felhasználó tudjon navigálni.
- Ami valódi kapcsolatot igényel — bejelentkezés, regisztráció,
  jelszó-visszaállítás, meghívó készítése és beváltása —, az offline **letiltva**
  jelenik meg, magyarázó üzenettel. Nem futhat hibára.
- A **személyes rejtett lista nem hozható létre offline**, mert az újracsatlakozás
  után duplikálódna. Ilyenkor érthető üzenet jár.
- Kapcsolat elvesztésekor vagy jogosultság megszűnésekor **egyetlen képernyő sem
  omolhat össze** — üres állapotot kell mutatnia.

---

## 16. Navigáció és kezelés

**Elvárt viselkedés.** Alul **fülsáv** (Áttekintés / Katalógus / Beállítások), bal
felül **hamburgermenü** a csoportokkal és a fiókműveletekkel.

Listába vagy csoportba lépve a fülsáv és a hamburger **végig látható marad**, a
hamburger ikon a **vissza nyíl előtt** áll.

**Határesetek:**

- A **vissza gombnak működnie kell** — attól, hogy mellé került a hamburger, nem
  veszítheti el a funkcióját.
- A „Katalógus" mindig a **kontextushoz tartozó** katalógust nyitja: csoportban a
  csoportét, máshol a személyeset.
- A fejlécben **soha nem jelenhet meg belső, technikai név** — a felhasználó nem
  láthat ilyesmit.
- A sor-műveletek (átnevezés, törlés, mennyiség, kedvenc) **ugyanabban a panelben**
  érhetők el csúsztatásra és hosszú nyomásra is.
- A sor **nem csúszhat ki** a képernyőről — helyben marad, a gombok úsznak fölé.

---

## 17. Billentyűzet

**Elvárt viselkedés.** A beviteli mezőt **nem takarhatja el** a billentyűzet, és a
**fejléc a helyén marad** — csak a lista területe szűkül össze.

**Határesetek:**

- A mező **ne ugorjon feleslegesen magasra** sem: közvetlenül a billentyűzet fölé
  kerüljön.
- Egyes gyártói billentyűzetek a billentyűk fölé **saját eszköztárat** rajzolnak,
  amiről a rendszer nem ad tájékoztatást. Ezt is el kell kerülni, akár azon az
  áron, hogy más billentyűzeteknél kicsit nagyobb rés marad. **Az elfedés súlyosabb
  hiba, mint a laza térköz.**

---

## 18. Adatvédelem és jogosultságok

**Elvárt viselkedés.** Mindenki csak ahhoz férhet hozzá, amihez joga van.

**Határesetek:**

- A csoport adatait **csak az aktuális tagok** láthatják; a felfüggesztett tag
  azonnal elveszíti a hozzáférést.
- A **tagságot senki nem módosíthatja közvetlenül** — csatlakozás, felfüggesztés,
  kilépés csak ellenőrzött úton történhet. Enélkül bárki hozzáadhatná magát egy
  idegen csoporthoz.
- A csoporttagok **látják egymás e-mail címét** — ez szándékos, a csoport tagjai
  ismerik egymást. A csoporton kívülre viszont semmi nem szivároghat.
- A felhasználó a **saját beállításait** írhatja, a rendszer belső ütemezését nem.
- A felhasználó **nem gyárthat magának** rendszerüzenetet.
