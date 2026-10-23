# A kliens–szerver API kialakítása

## 1. A kommunikáció felépítése

A React frontend HTTP-kéréseken keresztül kommunikál az Express backenddel. A kérés- és válaszadatokat JSON-formátumban továbbítom, mert ez mindkét oldalon közvetlenül feldolgozható JavaScript-objektumokká.

A kliens feladata a felhasználói adatok bekérése, a fogadások összeállítása és az eredmények megjelenítése. A sorsolást, a nyereményszámítást, az egyenleg ellenőrzését és az adatbázis módosítását a szerver végzi.

Ezeket a feladatokat azért helyeztem a backendbe, mert a böngészőben futó kód és az elküldött adatok módosíthatók. A szerver ezért a frontend ellenőrzéseitől függetlenül is megvizsgálja a beérkező adatokat.

## 2. A frontend API-moduljai

Az API-hívásokat külön fájlokba szerveztem, hogy az oldalakat megjelenítő komponensekben ne ismétlődjön a HTTP-kommunikáció kódja.

| Fájl | Feladat |
| --- | --- |
| `apiClient.js` | A kérések közös elküldése, a válaszok feldolgozása és a hibák továbbítása. |
| `authApi.js` | Bejelentkezés, regisztráció, kijelentkezés és felhasználói adatok lekérése. |
| `slotApi.js` | A slot konfigurációjának lekérése és a játékmódok indítása. |
| `rouletteApi.js` | A rulett konfigurációjának lekérése és a fogadások elküldése. |
| `gameHistoryApi.js` | A felhasználó játéktörténetének lekérése. |

Például a `RoulettePage.jsx` a `spinRouletteGame()` függvényt hívja meg. A HTTP-kérés összeállítása a `rouletteApi.js` fájlban történik, az elküldést pedig az `apiClient.js` végzi.

Ez a felosztás lehetővé teszi, hogy a közös kommunikációs beállításokat egy helyen módosítsam.

## 3. A végpontok kialakítása

A végpontokat funkció szerint csoportosítottam:

- `/api/auth`: felhasználói hitelesítés.
- `/api/slot`: slotkonfiguráció és játékműveletek.
- `/api/roulette`: rulettkonfiguráció és játékműveletek.
- `/api/game-history`: személyes játéktörténet.
- `/api/provably-fair`: seedkezelés és eredményellenőrzés.

Az adatok lekéréséhez `GET`, az állapotot módosító műveletekhez `POST` kéréseket használok.

A játék konfigurációját a frontend a szervertől kéri le. Így például a megengedett tétek és a szabályos rulettfogadások ugyanabból a konfigurációból származnak, amelyet a backend is használ. A nyilvános konfiguráció nem tartalmaz titkos szerverseedet.

Hitelesítés

| Metódus | Útvonal | Feladat |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Új felhasználói fiók létrehozása. |
| `POST` | `/api/auth/login` | Bejelentkezés felhasználónévvel és jelszóval. |
| `POST` | `/api/auth/logout` | Kijelentkezés. |
| `GET` | `/api/auth/me` | A bejelentkezett felhasználó adatainak lekérése. |

Az alkalmazás indulásakor a kliens a `/api/auth/me` végponton ellenőrzi a bejelentkezési állapotot.

A védett végpontoknál a szerver a hitelesítésből határozza meg a felhasználót. Például a játéktörténet lekérésekor nem a kliens dönti el, melyik fiók adatait kapja vissza.

Slot

| Metódus | Útvonal | Feladat |
| --- | --- | --- |
| `GET` | `/api/slot/config` | A felülethez szükséges konfiguráció lekérése. |
| `POST` | `/api/slot/spin` | Normál pörgetés indítása. |
| `POST` | `/api/slot/bonus-buy` | Bónuszjáték vásárlása. |
| `POST` | `/api/slot/feature-spin` | Feature Spin indítása választott bővülő szimbólummal. |

A játékműveletekhez bejelentkezés szükséges. A kérés tartalmazza az alaptétet, Feature Spin esetén pedig a kiválasztott szimbólumot is.

Rulett

| Metódus | Útvonal | Feladat |
| --- | --- | --- |
| `GET` | `/api/roulette/config` | A konfiguráció és a szabályos fogadási pozíciók lekérése. |
| `POST` | `/api/roulette/spin` | Rulettkör indítása a megadott fogadásokkal. |

A kliens egyetlen kérésben küldi el a kör összes fogadását. A szerver ugyanazzal a kisorsolt számmal értékeli ki valamennyit.

Játéktörténet

| Metódus | Útvonal | Feladat |
| --- | --- | --- |
| `GET` | `/api/game-history?page=1&limit=20` | A saját játéktörténet lapozott lekérése. |

A `page` a kért oldal sorszámát, a `limit` az oldalankénti rekordok számát adja meg.

A lapozást azért a szerveren végzem, hogy a kliensnek ne kelljen minden korábbi játékkört egyszerre letöltenie.

Provably Fair

| Metódus | Útvonal | Feladat |
| --- | --- | --- |
| `GET` | `/api/provably-fair/current` | Az aktuális nyilvános seedadatok lekérése. |
| `POST` | `/api/provably-fair/rotate` | Seedrotáció végrehajtása. |
| `GET` | `/api/provably-fair/revealed/:seedId` | Egy felfedett seed lekérése. |
| `POST` | `/api/provably-fair/verify` | Egy korábbi játékkör visszaellenőrzése. |

Az aktív szerverseed titkos marad. A játék előtt annak SHA-256 hashértéke ismerhető meg, a szerverseed pedig a lecserélése után válik hozzáférhetővé.

A visszaellenőrzéshez a kliens a játékelőzmény azonosítóját küldi el. A backend a tárolt adatokból újraszámítja az eredményt, és összehasonlítja a mentett körrel.

## 4. Példa egy rulettkérésre

A kliens a fogadások típusát, összegét és szükség esetén a kiválasztott számokat küldi el.

```http
POST /api/roulette/spin
Content-Type: application/json
Idempotency-Key: egyedi-keresazonosito
```

```json
{
  "bets": [
    {
      "type": "RED",
      "amount": 10
    },
    {
      "type": "SPLIT",
      "numbers": [1, 2],
      "amount": 5
    }
  ]
}
```

A szerver ellenőrzi a bejelentkezést, a fogadások szabályosságát, a tétlimitet és a rendelkezésre álló egyenleget.

A nyertes számot a backend állítja elő. A frontend a válasz alapján animálja a kereket és a golyót; az animáció nem befolyásolja a sorsolást.

A nonce-foglalás, az egyenleg módosítása és a játéktörténet mentése közös MongoDB-tranzakcióban történik. Így ezek együtt teljesülnek, vagy hiba esetén egyik módosítás sem marad meg.

## 5. Ismételt játékkérések kezelése

Hálózati hiba esetén előfordulhat, hogy a szerver már feldolgozta a játékot, de a válasz nem jutott el a klienshez. Egy új kérés ilyenkor második tétlevonást okozhatna.

Ennek elkerülésére a kliens minden új játékkéréshez egyedi azonosítót készít, amelyet az `Idempotency-Key` fejlécben továbbít.

Újrapróbáláskor ugyanazt az azonosítót és ugyanazokat a fogadási adatokat küldi el. A szerver a már teljesített kéréshez a korábban mentett eredményt adja vissza újabb elszámolás helyett.

A kérés tartalmát egy SHA-256 alapú fingerprint is azonosítja. Ez a normalizált kérésadatokból képzett lenyomat.

| Kérés | Feldolgozás |
| --- | --- |
| Új azonosító | Új játékkör indítható. |
| Meglévő azonosító, azonos tartalom | A korábbi eredmény visszaadása. |
| Meglévő azonosító, eltérő tartalom | `409 Conflict` válasz. |

A normalizálás miatt például két 50 CR összegű piros fogadás ugyanazt a tartalmat jelentheti, mint egyetlen 100 CR összegű piros fogadás.

A fingerprint nem digitális aláírás: a kéréstartalom egyezésének ellenőrzésére szolgál.

## 6. Hibakezelés

A backend HTTP-státuszkóddal és JSON-formátumú üzenettel jelzi a hibát.

```json
{
  "message": "Érvénytelen fogadási pozíció."
}
```

| HTTP-státusz | Jelentés |
| --- | --- |
| `400 Bad Request` | Hibás bemenet, például szabálytalan fogadási pozíció. |
| `401 Unauthorized` | Bejelentkezés szükséges. |
| `404 Not Found` | A kért erőforrás nem található vagy a felhasználó számára nem hozzáférhető. |
| `409 Conflict` | Ütközés, például meglévő kérésazonosító eltérő tartalommal. |
| `500 Internal Server Error` | Váratlan szerveroldali hiba. |

Az elkülönített státuszkódok alapján a frontend megfelelő visszajelzést adhat. A hibás fogadást a felhasználónak javítania kell, hiányzó bejelentkezésnél pedig újra be kell lépnie.

Ha a kliens nem tudja biztosan, hogy a játékkérés teljesült-e, megőrzi az eredeti kérésazonosítót és fogadási tartalmat az újrapróbáláshoz.