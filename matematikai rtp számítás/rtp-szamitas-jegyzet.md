
- RTP = jóváírás / feltett összeg × 100.


- 37 szám: 0–36, mindegyik egyformán esélyes.
- A kód minden fogadástípus minden szabályos pozícióján végigpróbálja mind a 37 eredményt.

Példa egy számra, 1 CR téttel:

```text
37 lehetséges eredményből 1 fizet 36 CR-t.
36 / 37 × 100 = 97,2973% RTP.
```

Más fogadásnál több nyerő szám van, de kisebb a kifizetés:

```text
Két szám:    2 × 18 / 37 × 100 = 97,2973%
Tucat:      12 ×  3 / 37 × 100 = 97,2973%
Piros:      18 ×  2 / 37 × 100 = 97,2973%
```

A jelenlegi szabályokkal minden fogadástípus ugyanennyi.


Baccarat

Nyolc pakliban összesen 416 lap van:

- 128 darab 0 értékű lap: tízesek, bubik, dámák és királyok.
- Az 1–9 pontértékekből külön-külön 32 darab.

A kihúzott lapokat nem tesszük vissza. Ezért az első húzásnál
416 lapból választunk, a másodiknál 415-ből, és így tovább.


Először mindkét oldal két lapot kap:

Player → Banker → Player → Banker

A pontszám az összeg utolsó számjegye. Ezután a szabályok döntenek:

- Ha valamelyik oldal kezdő pontszáma 8 vagy 9, nincs további húzás.
- Egyébként a Player 0–5 pontnál húz, 6–7 pontnál megáll.
- Ha a Player megállt, a Banker 0–5 pontnál húz, 6–7 pontnál megáll.
- Ha a Player húzott, a Banker az alábbi táblázat alapján dönt:

Banker pontszáma | Mikor húz harmadik lapot? 

| 0–2 | Mindig |
| 3 | Ha a Player harmadik lapjának értéke nem 8 |
| 4 | Ha a Player harmadik lapjának értéke 2–7 |
| 5 | Ha a Player harmadik lapjának értéke 4–7 |
| 6 | Ha a Player harmadik lapjának értéke 6 vagy 7 |
| 7 | Soha |

A végén a magasabb pontszám nyer; azonos pontszámnál döntetlen van.
Mindkét oldal legfeljebb három lapot kap, tehát egy kör legfeljebb
hat lapból áll.


Minden lehetséges osztást három csoport valamelyikébe sorolunk:
Player nyer, Banker nyer vagy döntetlen.

Például:

| Kiosztott pontértékek | Player | Banker | Eredmény |
|---|---:|---:|---|
| 9, 0, 0, 7 | 9 | 7 | Player nyer |
| 7, 9, 0, 0 | 7 | 9 | Banker nyer |
| 9, 9, 0, 0 | 9 | 9 | Döntetlen |

Egy pontértéksor sok különböző konkrét lapból összeállhat.
A `9, 0, 0, 7` sorhoz például:

```text
32 × 128 × 127 × 32 = 16 646 144 kezdőosztás
```

Miért szorzunk?

- 32 különböző kilencessel kezdhetünk.
- Mindegyikhez 128 különböző 0 értékű lap választható.
- A következő 0 értékű lapból már csak 127 marad.
- Mindegyik eddigi választáshoz 32 hetes kapcsolódhat.

Ez a 16 646 144 kezdőosztás mind Player-győzelem.
Ugyanígy megszámoljuk a többi pontértéksorhoz tartozó eseteket is.

Player összesen =
  az első Player-győzelmet adó sor darabszáma
+ a második Player-győzelmet adó sor darabszáma
+ az összes további Player-győzelmet adó sor darabszáma


Külön összeadjuk a Banker-győzelmeket és a döntetleneket is.
Ha további lap szükséges, annak lehetőségeit is figyelembe vesszük,
és csak a kör végén döntjük el, melyik csoporthoz tartozik az eset.

A különböző paklikból származó azonos lapokat külön példánynak
számoljuk. A hat lap összes lehetséges sorrendje:


416 × 415 × 414 × 413 × 412 × 411 = 4 998 398 275 503 360

A négy vagy öt lap után lezáruló köröket is ehhez viszonyítjuk.
A fel nem használt lapok minden lehetséges folytatását ugyanahhoz
a már eldőlt eredményhez számoljuk.

A fenti négylapos Player-győzelemnél ez:

16 646 144 × 412 × 411 = 2 818 724 855 808 hatlapos sorrend

Az utolsó két lap ilyenkor nem kerül kiosztásra. Csak azért
vesszük hozzá a lehetőségeiket, hogy minden esetet azonos alapon
számolhassunk össze.


Az összes esetet a kör tényleges hossza szerint csoportosítva:

| Kör hossza | Player nyer | Banker nyer | Döntetlen |
|---|---:|---:|---:|
| 4 lap | 857 541 897 461 760 | 857 541 897 461 760 | 178 651 816 535 040 |
| 5 lap | 599 464 498 483 200 | 783 893 126 688 768 | 133 377 183 608 832 |
| 6 lap | 773 511 886 647 296 | 650 817 542 287 360 | 163 598 426 329 344 |
| **Összesen** | **2 230 518 282 592 256** | **2 292 252 566 437 888** | **475 627 426 473 216** |

A táblázat minden sora hatlapos sorrendekre van kiegészítve.
Ezek nem lejátszott körök, hanem megszámolt lehetőségek.

Az egyes oszlopok összegét elosztjuk az összes lehetőség számával:

```text
Player:
2 230 518 282 592 256 / 4 998 398 275 503 360 × 100
= 44,62466093%

Banker:
2 292 252 566 437 888 / 4 998 398 275 503 360 × 100
= 45,85974226%

Döntetlen:
475 627 426 473 216 / 4 998 398 275 503 360 × 100
= 9,51559680%
```

A teljes jóváírás az eredeti visszakapott tétet is tartalmazza:

- Player-győzelem: 2-szeres jóváírás.
- Banker-győzelem: 1,95-szörös jóváírás.
- Tie-győzelem: 9-szeres jóváírás.
- Player és Banker fogadásnál döntetlenkor visszajár a tét.

```text
Player:
(0,4462466093 × 2 + 0,0951559680) × 100 = 98,7649%

Banker:
(0,4585974226 × 1,95 + 0,0951559680) × 100 = 98,9421%

Tie:
0,0951559680 × 9 × 100 = 85,6404%
```

A nehéz rész tehát a nyerő és döntetlen esetek hiánytalan
megszámolása. Ezekből már egyszerű osztással kapjuk az esélyeket,
majd a kifizetésekkel együtt az RTP-t.

 Player Pair / Banker Pair

Egy rangból 32 lap van. Az első lap után 415 lap marad, ebből 31 azonos rangú:

```text
Pár esélye = 31 / 415 = 7,46987952%

RTP = 31 / 415 × 12 × 100 = 89,6386%
```

### Either Pair

Legalább az egyik oldalon pár kell. Összeadjuk a két oldal páresélyét, majd levonjuk a kétoldali párt, mert azt kétszer számoltuk.

Ha a Playernél már van pár, annak rangjából 30 lap marad, a másik 12 rangból külön-külön 32:

```text
Kétoldali pár esélye:
31 / 415 × (30 × 29 + 12 × 32 × 31) / (414 × 413)
= 0,55807185%

Either Pair esélye:
2 × 7,46987952% − 0,55807185% = 14,38168719%

RTP = 0,1438168719 × 6 × 100 = 86,2901%
```

### Perfect Pair

Azonos rang és kártyaszín kell. Egy konkrét lapból 8 példány van, így az első után 7 megfelelő marad:

```text
Egy oldal tökéletes párjának esélye:
7 / 415 = 1,68674699%
```

Ha a Playernél már van tökéletes pár, abból a lapfajtából 6 példány marad, a másik 51 lapfajtából külön-külön 8:

```text
Kétoldali tökéletes pár esélye:
7 / 415 × (6 × 5 + 51 × 8 × 7) / (414 × 413)
= 0,02847055%

Perfect Pair esélye:
2 × 1,68674699% − 0,02847055% = 3,34502342%

RTP = 0,0334502342 × 26 × 100 = 86,9706%
```

Ezek matematikai számítások. A szimuláció ezzel szemben véletlen körökből becsüli ugyanezeket az értékeket.
