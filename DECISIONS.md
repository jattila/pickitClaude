# PickIt — elvetett megoldások és a döntések indoklása

Ez a dokumentum azt rögzíti, **mit próbáltunk és miért nem vált be**. A célja, hogy
egy zsákutcát ne kelljen kétszer végigjárni — sem nekem, sem másnak, aki később
ránéz a kódra és kézenfekvőbbnek gondol valamit, mint ami ott van.

Több pont **hibából** derült ki, nem tervezésből. Ezeknél a „miért nem vált be"
rész a lényeg.

---

## Billentyűzet kezelése Androidon

Ez volt messze a leghosszabb zsákutca-sorozat: **hat sikertelen megközelítés**,
mire kiderült, hogy három egymásra rakódott probléma van.

**A három ok, ami végül előkerült:**

1. A készülék ablaka **soha nem méretezik át** a billentyűzethez (edge-to-edge mód
   alatt), pedig ezt a beállítás ígéri
2. A rendszer által jelentett billentyűzet-magasság **~48 ponttal kevesebb** a
   valósnál
3. A gyártói (Samsung) billentyűzet a billentyűk fölé **saját eszköztárat** rajzol,
   amiről **egyetlen API sem ad tájékoztatást**

| Amit próbáltunk | Miért nem vált be |
|---|---|
| Beépített `KeyboardAvoidingView`, fejléc-magasságú eltolással | A mező jóval a billentyűzet fölé ugrott |
| A kompenzáció teljes kikapcsolása (feltéve, hogy a rendszer átméretez) | Nem méretez át — a billentyűzet teljesen eltakarta a mezőt |
| Kompenzáció eltolás nélkül | Emelt, de kevesebbet a kelleténél |
| Saját mérés az ablakmagasságból levezetve | 48 ponttal alultájolt (a jelentett magasság hibás) |
| Önkorrigáló mérési ciklus | Pontosan a *jelentett* billentyűzet-tetőhöz konvergált — csakhogy az sem a valódi |
| `pan` mód (az OS görgeti fel az ablakot) | Működött, **de a fejlécet is felvitte** — ezt a felhasználó kifejezetten nem akarta |
| Kitöltés a beviteli sor alá (rés nyerésére) | Az Android az elrendezés változása után **újraszámolja** a görgetést, és visszatolja |
| `react-native-keyboard-controller` beépített komponense | Pontosabb adatot használ, de **még mindig 58 ponttal** alultájolt |

**Amit helyette csinálunk:** a `keyboard-controller` billentyűzet-eseményeiből
számolunk (ez adja a legpontosabb magasságot), a beviteli sor tényleges pozíciójához
mérve, **plusz egy fix ráhagyás** a gyártói eszköztárra.

**Miért fix ráhagyás?** Mert a sáv magasságáról nincs adat. Olyan billentyűzeten,
aminek nincs ilyen sávja, ez kicsit nagyobb rést hagy — ez a rosszabbik eset, és
vállalható. **Az elfedés súlyosabb hiba, mint a laza térköz.**

**Tanulság a hibakereséshez:** négy kört futottam a tünet alapján következtetve, és
mind a négy téves volt. Az áttörést a **mérések naplózása** hozta (kiderült, hogy az
ablak nem méretezik át), majd egy **képernyőkép** (kiderült az eszköztár). Ha
legközelebb elrendezési hiba jön, egy képernyőkép többet ér bármennyi számolásnál.

---

## Az offline sáv elhelyezése

| Amit próbáltunk | Miért nem vált be |
|---|---|
| Lebegő sáv a képernyő tetején | Ráült a fejlécre: eltakarta a címet **és a vissza gombot** |
| A sáv a felső elrendezésbe, majd a navigáció felső behúzásának nullázása | A natív fejléc **nem React-oldalról** kezeli az állapotsávot — üres csík maradt |
| `headerStatusBarHeight` mind a három navigátorban | Ugyanaz az üres csík; ráadásul három helyre kellett átvezetni |

**Amit helyette csinálunk:** a sáv a képernyő **aljára** került. Ott nincs fejléc,
amivel ütközhetne — se takarás, se üres csík, se navigátoronkénti hekkelés.

Külön ok: offline állapotban különösen fontos, hogy a felhasználó **tudjon
navigálni** — pont ilyenkor eltakarni a vissza gombot a legrosszabb.

---

## Felfüggesztési értesítés e-mailben

**Amit próbáltunk:** a hivatalos Firebase „Trigger Email" bővítmény, ami egy
adatbázis-kollekcióból küld leveleket.

**Miért vetettük el:** külső szolgáltatót, SMTP-hitelesítést, alkalmazásjelszót és
egy bővítmény telepítését igényelte volna — mindezt **egyetlen mondatnyi üzenetért**.
A felhasználó megítélése szerint „körülményes és felesleges is".

**Amit helyette csinálunk:** az értesítés az **appon belül** jelenik meg a
felfüggesztett tagnak, a következő indításkor, a tulajdonos e-mail címével együtt.

**Amit menet közben meg kellett oldani:** az értesítés nem kerülhetett a csoport
alá, mert a felfüggesztett tag onnan már semmit nem olvashat — így pont a
tulajdonos címét nem érné el. Ezért a **saját felhasználói adatai alá** kerül, ami
az egyetlen hely, ami nyitva marad neki.

---

## Ajánlások adatbázis-lekérdezésből

**Amit próbáltunk:** az ajánlásokat közvetlenül az adatbázisból kérdezni le, névre
szűrve.

**Miért nem vált be:** a Firestore **csak a név elejére** tud szűrni — szó közepi
keresést nem támogat. Ez adatbázis-szintű korlát, nem kerülhető meg lekérdezéssel.

**Amit helyette csinálunk:** a katalógust egyben betöltjük, és **helyben szűrünk**.
Egy háztartás katalógusa elég kicsi ehhez, ráadásul így **gyorsabb is**: a betöltés
gépelési munkamenetenként egyszer fut, nem karakterenként, a szűrés pedig hálózat
nélkül, azonnal.

---

## A katalógus hatókörének kikövetkeztetése

**Amit próbáltunk:** a csoport katalógusát abból megállapítani, hogy a megnyitott
lista melyik csoporthoz tartozik.

**Miért nem vált be:** a csoport rejtett listája **csak az első tétel felvételekor
jön létre**. Amíg nincs, nincs miből kikövetkeztetni a csoportot, és a lekérdezés
némán **a személyes katalógusra esett vissza** — a felhasználó a csoportban a saját
termékeit látta felajánlva, a csoportéit viszont nem.

**Amit helyette csinálunk:** a képernyő **kimondja**, melyik katalógusról van szó,
ahelyett hogy egy dokumentum létezéséből következtetnénk rá.

---

## Rendezés az adatbázis-lekérdezésben

**Amit próbáltunk:** a tételeket a lekérdezés rendezze (bejelöltség és létrehozás
szerint).

**Miért nem vált be:** a Firestore **kihagyja a találatokból** azt a dokumentumot,
amelyikből hiányzik a rendezési mező. Egy hiányosan létrejött tétel így **teljesen
láthatatlanná vált** — se a listán nem jelent meg, se újra felvenni nem lehetett,
mert a rendszer létezőnek találta.

**Amit helyette csinálunk:** a lekérdezés rendezetlen, a rendezés a kliensen
történik. Ez egyben a két tárolót (helyi és felhő) is egységesíti, és megszünteti a
„láthatatlan tétel" hibaosztályt.

---

## Részleges írás a tétel felvételekor

**Amit próbáltunk:** offline állapotban, amikor nem lehet ellenőrizni, létezik-e már
a tétel, csak a biztosan ismert mezőket írni — nehogy felülírjunk egy más által
bejelölt tételt.

**Miért nem vált be:** a kihagyott mezők miatt a tétel **kimaradt a lekérdezésből**
(lásd az előző pontot), tehát a felhasználó számára eltűnt.

**Amit helyette csinálunk:** mindig a **teljes** kezdőállapot íródik ki, a „ne
duplikálj, ne írd felül más bejelölését" védelem pedig a felületre került, a már
betöltött listaelemek alapján. Ez offline is helyes, mert azok az adatok a
gyorsítótárból jönnek — szemben egy friss lekérdezéssel, ami offline egyszerűen
hibára fut.

---

## Vendég mód névtelen fiókkal

**Amit fontolgattunk:** a regisztráció nélküli használatot a háttérben létrehozott
névtelen fiókkal megoldani.

**Miért vetettük el:** a követelmény szó szerint az volt, hogy „a telefon jegyezze
meg" — ehhez semmilyen fiók nem kell. A tisztán helyi tárolás egyszerűbb, nincs
szinkronizálni való, és nem hoz létre a felhasználó tudta nélkül fiókot.

---

## Belépés telefonszámmal vagy e-mailes varázslinkkel

**Amit fontolgattunk:** jelszó helyett e-mailben küldött belépési link.

**Miért vetettük el:** mobilon ehhez az a Firebase-szolgáltatás kellene, amit 2025-ben
megszüntettek — ma megbízhatatlan út lenne.

**Amit helyette csinálunk:** e-mail + jelszó, jelszó-visszaállítással.

---

## Sor-műveletek megjelenítése

| Amit próbáltunk | Miért nem vált be |
|---|---|
| Hosszú nyomásra alulról felcsúszó menü | A felhasználó **ugyanazt** a panelt kérte, mint amit a csúsztatás ad |
| Beépített csúsztatás-komponens | **Kitolta a sort** a képernyőről; a kérés az volt, hogy a sor maradjon helyben |
| Egymásba ágyazott érintés-kezelők | A belső **elnyelte** a hosszú nyomást, a menü egyáltalán nem jött elő |

**Amit helyette csinálunk:** a sor helyben marad, a gombok jobbról **fölé úsznak**,
és a csúsztatás meg a hosszú nyomás ugyanazt a panelt nyitja. A csillag (kedvenc) a
gesztus-kezelőn **kívülre** került, különben ugyanabba az elnyelési hibába futna.

---

## Görgetés az új tételhez

| Amit próbáltunk | Miért nem vált be |
|---|---|
| Listakomponens beépített „görgess ehhez az elemhez" függvénye | A virtualizáció miatt megbízhatatlan volt |
| Ugyanaz, hibakezeléssel és újrapróbálkozással | Továbbra sem talált oda |

**Amit helyette csinálunk:** a ténylegesen kirajzolt sor pozícióját mérjük, és oda
görgetünk. A cél azonosítóját már az írás **előtt** beállítjuk, mert az kiszámítható
— így nincs érzékelhető késleltetés.

---

## Digest-számlálók a listák alatt

**Amit terveztünk:** a függő változásokat a listákhoz tartozó tagoknál tárolni.

**Miért változtattunk:** az ütemező felhasználónként dolgozik, így minden futásnál a
projekt **összes listáján** kellene keresnie.

**Amit helyette csinálunk:** a számlálók a **címzett felhasználó alatt** vannak, így
egy felhasználó függő változásai egyetlen kis olvasással előjönnek.

---

## Katalógus írása a kliensről

**Amit próbáltunk:** a katalógus-bejegyzéseket az app írja, amikor tételt vesz fel.

**Miért változtattunk:** a katalógus hatókörét (csoport vagy személyes) a szerver
tudja megbízhatóan eldönteni, és így a szabályok is szigoríthatók.

**Amit helyette csinálunk:** a bejegyzéseket szerveroldali trigger hozza létre. A
kliens csak **szerkesztheti és törölheti** a sajátját.

**Amit menet közben javítani kellett:** a létrehozás teljes tiltása megtörte a
katalógus-szerkesztő átnevezését — mert ha a név alapvetően megváltozik, az új
bejegyzésnek számít. Ezért a létrehozás mégis engedélyezett a jogosult felhasználónak.

---

## A fejlesztői szerver elérése hálózatváltáskor

**Amit próbáltunk:** alagút mód (az Expo szerverein keresztül), amikor a telefon nem
érte el a Macet.

**Miért nem ez lett az alap:** a JS csomag ~11 MB, és alagúton keresztül **kétszer
utazik** az interneten — mobilneten lassú és pazarló.

**Amit helyette csinálunk:** helyi hálózaton dolgozunk, és ha a Mac hálózatot vált,
kifejezetten megadjuk neki a címet — mert magától `127.0.0.1`-re esik vissza, amit a
telefon soha nem ér el.

**Tanulság:** ha „failed to connect" jön, elsőként a két IP-címet érdemes
összevetni. Ha az első három számcsoport nem egyezik, a két eszköz **külön
hálózaton** van, és semmilyen beállítás nem segít.

---

## A beviteli sáv áthelyezése a képernyő tetejére

**Amit felajánlottunk:** ha a beviteli mező felülre kerül, a billentyűzet soha nem
takarhatja el, tehát az egész probléma megszűnik — készüléktől és billentyűzettől
függetlenül.

**Miért nem ez lett:** a felhasználó a natív megoldást választotta, hogy a megszokott
alsó beviteli sáv megmaradjon.

Ez maradjon feljegyezve: ha a billentyűzet-kezelés a jövőben újra gondot okoz,
**ez a megoldás technikailag hibátlan**, és csak a megszokáson múlik.

---

## App Check iOS fordítási hibája — négy nekifutás, három téves

**A tünet:** minden iOS build elhasalt ugyanezzel:

```
declaration of 'RCTBridgeModule' must be imported from module
'RNFBApp.RNFBAppModule' before it is required
```

**Amit próbáltunk, és miért nem volt jó:**

1. `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` az **app targetre** —
   abból a feltevésből, hogy az áthidaló fejléc fordítása bukik el. Nem az volt.
2. `@import RNFBApp;` az áthidaló fejléc élére — ugyanazon a téves feltevésen.
3. Az App Check **config plugin kivétele** az `app.json`-ből — ha a fejléc a baj,
   plugin nélkül nincs fejléc. A hiba plugin nélkül is pontosan ugyanaz maradt.

**Ami tényleg volt:** a hiba **soha nem az áthidaló fejlécben** volt, hanem magában
a podban — `RNFBAppCheckModule.h:24`. Ez mindvégig ott állt a hibaüzenetben, csak
az EAS összefoglalója nem mutat fájlnevet, és az első három nekifutás ezt nem
ellenőrizte. A teljes Xcode-napló (brotli-tömörítve, a `logFiles` mezőben) egy
perc alatt megmutatta.

**A megoldás:** ugyanaz, amit a projekt már két másik RNFirebase csomagnál használ —
a `<React/RCTBridgeModule.h>` importot a fájl **elejére** kell tenni, bármi elé, ami
az `RNFBApp`-ot behúzza. Különben az `RNFBApp` modultérképe magának követeli az
`RCTBridgeModule` deklarációját. Rögzítve két patchben:
`@react-native-firebase+app-check+25.1.0.patch` és
`@react-native-firebase+analytics+25.1.0.patch` — az App Check javítása után a hiba
változatlan formában átugrott az Analyticsre, ugyanabból az okból. A négy RNFirebase
csomagból, amelyik a `RCTBridgeModule`-t használja, immár mind a négy patchelt; az
`auth` és az `app` eltérő sorrendet használ, de azok hónapok óta hibátlanul fordulnak.

**Tanulság:** a build-összefoglalók hibalistája fájlnév nélkül félrevezető. Egy több
órás build kilövése előtt **a teljes naplót** kell megnézni — az EAS `logFiles`
mezőjében elérhető, és letölthető.
