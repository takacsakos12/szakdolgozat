
Az alkalmazás három fő részből áll: a böngészőben futó React kliensből, a Node.js és Express alapú szerverből, valamint a MongoDB adatbázisból. A kliens HTTP-kéréseken keresztül kommunikál a szerverrel, az adatokat JSON-formátumban továbbítják.

Kliensoldal

A React alkalmazás jeleníti meg az oldalakat, fogadja a felhasználó műveleteit, és megjeleníti a szervertől kapott eredményeket. Ide tartoznak a bejelentkezési űrlapok, a játékfelületek, az animációk és a játéktörténet.

Az oldalakat külön komponensekbe szerveztem, a fejléc és a lábléc pedig közösen használt komponens. Az API-hívásokat külön modulok kezelik, amelyek a közös apiClient.js fájlon keresztül küldik el a kéréseket. Ez csökkenti az ismétlődő kommunikációs kódot, és elválasztja a megjelenítést a HTTP-kérések kezelésétől.

Szerveroldal

Az Express a kérés útvonala alapján választja ki a megfelelő útvonalkezelőt. Ezek ellenőrzik a szükséges bejelentkezést és bemeneti adatokat, majd meghívják a feladatot végrehajtó szolgáltatásokat.

A játékok szabályait külön motorok valósítják meg. A slotEngine.js a szimbólumrácsot és a nyereményeket számítja ki, a rouletteEngine.js pedig a rulettfogadásokat értékeli ki. A motorok nem kezelnek HTTP-válaszokat vagy felhasználói egyenleget, ezért adatbázis nélkül is tesztelhetők és szimulációkban is használhatók.

A slot és a rulett elszámolását a közös gameSessionService.js végzi. Ez kapcsolja össze a játékmotort a Provably Fair generátorral, az egyenleg módosításával és a játéktörténet mentésével. A közös működés így nem ismétlődik meg minden játék útvonalkezelőjében.

A sorsolás és az elszámolás azért szerveroldali feladat, mert a böngészőben futó kód és az elküldött adatok módosíthatók. A frontend animációi a szerver által meghatározott eredményt szemléltetik.

Adattárolás

A szerver Mongoose-modelleken keresztül éri el a MongoDB adatbázist. A modellek meghatározzák a tárolt dokumentumok mezőit, hivatkozásait és indexeit.

Az adatbázis tárolja a felhasználókat, a lezárt játékköröket és a Provably Fair seedadatokat. A kliens nem kapcsolódik közvetlenül az adatbázishoz, minden lekérés és módosítás a szerveren keresztül történik.