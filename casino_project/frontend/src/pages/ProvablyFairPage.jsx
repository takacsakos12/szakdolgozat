import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getCurrentProvablyFairSeed,
  rotateProvablyFairSeed,
  verifyProvablyFairGame,
} from "../api/provablyFairApi";
import "./ProvablyFairPage.css";

const CHECK_LABELS = {
  seedHashMatches: "A szerverseed hashének egyezése",
  seedDetailsMatch: "A seedadatok egyezése",
  fingerprintMatches: "A fogadási adatok egyezése",
  roundStateMatches: "A játékállapot visszajátszása",
  gameResultMatches: "A játékeredmény egyezése",
  settlementMatches: "Az elszámolás egyezése",
};

function ProvablyFairPage({ user }) {
  const [searchParams] = useSearchParams();
  const selectedHistoryId = searchParams.get("historyId") || "";
  const [activeTab, setActiveTab] = useState(
    selectedHistoryId ? "verify" : "overview",
  );
  const [seed, setSeed] = useState(null);
  const [previousSeed, setPreviousSeed] = useState(null);
  const [clientSeed, setClientSeed] = useState("");
  const [historyId, setHistoryId] = useState(selectedHistoryId);
  const [verification, setVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const submittingRef = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    setHistoryId(selectedHistoryId);
    setVerification(null);
    if (selectedHistoryId) setActiveTab("verify");
  }, [selectedHistoryId]);

  useEffect(() => {
    let active = true;
    setSeed(null);
    setPreviousSeed(null);
    setVerification(null);
    setErrorMessage("");
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getCurrentProvablyFairSeed()
      .then((response) => {
        if (active) setSeed(response.seed);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function runAction(name, action) {
    if (submittingRef.current || !userId) return;
    submittingRef.current = true;
    setBusy(name);
    setErrorMessage("");
    try {
      await action();
    } catch (error) {
      setErrorMessage(error.message || "A művelet nem sikerült.");
    } finally {
      submittingRef.current = false;
      setBusy("");
    }
  }

  function handleRefresh() {
    runAction("refresh", async () => {
      const response = await getCurrentProvablyFairSeed();
      setSeed(response.seed);
    });
  }

  function handleRotate(event) {
    event.preventDefault();
    runAction("rotate", async () => {
      const response = await rotateProvablyFairSeed(clientSeed);
      setSeed(response.currentSeed);
      setPreviousSeed(response.previousSeed);
      setClientSeed("");
    });
  }

  function handleVerify(event) {
    event.preventDefault();
    setVerification(null);
    if (!/^[a-f\d]{24}$/i.test(historyId.trim())) {
      setErrorMessage(
        "Adj meg egy érvényes, 24 karakteres játékelőzmény-azonosítót.",
      );
      return;
    }
    runAction("verify", async () => {
      const response = await verifyProvablyFairGame(historyId);
      setVerification(response);
    });
  }

  return (
    <main className="pf-page">
      <section className="pf-panel">
        <header className="pf-header">
          <h1>Provably Fair</h1>
          <p>
            A sorsolás adatainak megtekintése és a korábbi körök ellenőrzése.
          </p>
        </header>

        <div className="pf-tabs" aria-label="Provably Fair nézetek">
          <button
            type="button"
            aria-pressed={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Áttekintés és seedek
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "verify"}
            onClick={() => setActiveTab("verify")}
          >
            Játékkör ellenőrzése
          </button>
        </div>

        {errorMessage && (
          <p className="pf-error" role="alert">
            {errorMessage}
          </p>
        )}

        {activeTab === "overview" ? (
          <>
            <article className="pf-card">
              <h2>Mit jelent a Provably Fair?</h2>

              <p>
                A Provably Fair rendszer lehetővé teszi, hogy egy korábbi
                játékkör eredményét a sorsoláshoz használt adatokból újra
                kiszámítsuk. Ugyanazokból az adatokból, ugyanazzal az
                algoritmussal mindig ugyanaz az eredmény keletkezik. Az
                ellenőrzés tehát nem egy újabb sorsolás.
              </p>

              <h3>Milyen adatokból készül az eredmény?</h3>

              <ul>
                <li>
                  <strong>Szerverseed:</strong> a szerver által létrehozott,
                  véletlenszerű karaktersorozat. Amíg használatban van, titkos
                  marad.
                </li>

                <li>
                  <strong>Szerverseed hash:</strong> a szerverseed SHA-256
                  lenyomata, amelyet már a játék előtt megmutatunk. A
                  lenyomatból nem állítható vissza a szerverseed, de a később
                  felfedett értékről ellenőrizhető, hogy ehhez a lenyomathoz
                  tartozik-e.
                </li>

                <li>
                  <strong>Kliensseed:</strong> a játékoshoz tartozó
                  karaktersorozat, amely szintén részt vesz a sorsolásban.
                  Seedcserekor saját értéket is megadhatsz.
                </li>

                <li>
                  <strong>Nonce:</strong> az adott seedpárhoz tartozó kör
                  sorszáma. Nulláról indul, és minden új körnél növekszik.
                  Emiatt ugyanazzal a seedpárral is különböző eredmények
                  keletkezhetnek.
                </li>

                <li>
                  <strong>Játékazonosító:</strong> megkülönbözteti a játékokat
                  és játékmódokat, így azok eltérő véletlenszám-sorozatot
                  használnak.
                </li>
              </ul>

              <h3>Hogyan lesz ezekből játékeredmény?</h3>

              <p>
                A rendszer a szerverseedet és a többi bemenetet egy
                HMAC-SHA512-alapú algoritmussal dolgozza fel. Az így kapott
                értékekből számsorozat készül, amelyet az adott játék motorja
                használ fel.
              </p>

              <p>
                A rulett például egy 0 és 36 közötti nyertes számot választ. A
                kártyajátékok a lapok sorrendjét állítják elő, a slot pedig a
                tárcsák kezdőpozícióit határozza meg. A kifizetést ezután a
                játék rögzített szabályai és a fogadásaid alapján számítjuk ki.
                A képernyőn látható animáció csak megjeleníti az eredményt, nem
                vesz részt annak kisorsolásában.
              </p>

              <h3>Miért csak seedcsere után ellenőrizhető egy kör?</h3>

              <p>
                Az aktív szerverseedet nem fedjük fel, mert annak ismeretében a
                következő körök eredményei is kiszámíthatók lennének.
                Seedcserekor a régi szerverseed nyilvánossá válik, a következő
                körök pedig már új seedpárt használnak, ismét nulláról induló
                nonce-szal.
              </p>

              <p>
                Ha játék előtt elmented a megjelenített szerverseed hashét,
                később összevetheted a felfedett szerverseed SHA-256
                lenyomatával. Az egyezés igazolja, hogy a felfedett érték a
                korábban közzétett lenyomathoz tartozik.
              </p>

              <h3>Hogyan ellenőrizhetsz egy korábbi kört?</h3>

              <ol>
                <li>
                  Játssz le egy kört, és fejezd be az esetleg folyamatban lévő
                  Blackjack-játékot.
                </li>
                <li>
                  Ezen az oldalon cseréld le a seedpárt. Ezzel a régi
                  szerverseed felfedhetővé válik.
                </li>
                <li>
                  A játéktörténetben válaszd ki a kört, és kattints az
                  Ellenőrzés linkre.
                </li>
                <li>
                  Indítsd el az ellenőrzést. A rendszer újraszámítja a kört,
                  majd összehasonlítja a mentett eredménnyel és elszámolással.
                </li>
              </ol>

              <h3>Mit vizsgál az oldal?</h3>

              <p>
                Ellenőrizzük a szerverseed lenyomatát és a seedadatokat,
                valamint ahol rendelkezésre áll, a fogadások fingerprintjét. A
                fingerprint a fogadási adatokból képzett lenyomat: segítségével
                a mentett fogadások összhangját vizsgáljuk. Emellett
                összehasonlítjuk az újraszámított játékeredményt és a pénzügyi
                elszámolást. Blackjacknél a mentett játékosdöntéseket is
                visszajátsszuk.
              </p>

              <h3>Mit jelent a sikeres ellenőrzés?</h3>

              <p>
                Azt jelenti, hogy a vizsgált adatokból az alkalmazott algoritmus
                és szabályok szerint ugyanaz az eredmény állítható elő, mint
                amelyet elmentettünk. Ez nem garantál nyereményt, és nem
                szünteti meg a játék házelőnyét.
              </p>

              <p>
                Ez az oldal jelenleg a saját szerverünkön végzi az
                újraszámítást. A szervertől független ellenőrzéshez a felfedett
                adatokat külön, ugyanazt az algoritmust megvalósító programban
                is fel kell dolgozni.
              </p>
            </article>

            {!user ? (
              <p>
                <Link to="/login">Jelentkezz be a seedek kezeléséhez.</Link>
              </p>
            ) : isLoading ? (
              <p role="status">Seedadatok betöltése...</p>
            ) : (
              <>
                <section className="pf-card">
                  <h2>Aktív seedpár</h2>
                  {seed && (
                    <dl className="pf-seed-data">
                      <dt>Szerverseed SHA-256 hash</dt>
                      <dd>{seed.serverSeedHash}</dd>
                      <dt>Kliensseed</dt>
                      <dd>{seed.clientSeed}</dd>
                      <dt>Következő nonce</dt>
                      <dd>{seed.nonce}</dd>
                      <dt>Algoritmus</dt>
                      <dd>{seed.algorithmVersion}</dd>
                    </dl>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={handleRefresh}
                  >
                    Adatok frissítése
                  </button>
                </section>

                <form className="pf-card" onSubmit={handleRotate}>
                  <h2>Seedpár cseréje</h2>
                  <p>
                    Az új seedpár a következő körökre vonatkozik. A régi seedhez
                    tartozó körök ellenőrizhetővé válnak. Folyamatban lévő
                    Blackjack-kört előbb fejezz be.
                  </p>
                  <label htmlFor="pf-client-seed">
                    Új kliensseed – opcionális
                  </label>
                  <input
                    id="pf-client-seed"
                    value={clientSeed}
                    maxLength={128}
                    disabled={Boolean(busy)}
                    onChange={(event) => setClientSeed(event.target.value)}
                    placeholder="Üresen hagyva véletlenszerű érték készül"
                  />
                  <button
                    className="pf-primary"
                    disabled={Boolean(busy)}
                    type="submit"
                  >
                    {busy === "rotate"
                      ? "Seedcsere..."
                      : "Seedpár cseréje és a régi felfedése"}
                  </button>
                </form>

                {previousSeed && (
                  <section className="pf-card">
                    <h2>Legutóbb felfedett seedpár</h2>
                    <dl className="pf-seed-data">
                      <dt>Szerverseed</dt>
                      <dd>{previousSeed.serverSeed}</dd>
                      <dt>Korábban közzétett hash</dt>
                      <dd>{previousSeed.serverSeedHash}</dd>
                      <dt>Kliensseed</dt>
                      <dd>{previousSeed.clientSeed}</dd>
                      <dt>Felhasznált körök száma</dt>
                      <dd>{previousSeed.finalNonce}</dd>
                    </dl>
                  </section>
                )}
              </>
            )}
          </>
        ) : !user ? (
          <p>
            <Link to="/login">
              Jelentkezz be a saját köreid ellenőrzéséhez.
            </Link>
          </p>
        ) : (
          <>
            <form className="pf-card" onSubmit={handleVerify}>
              <h2>Korábbi játékkör ellenőrzése</h2>
              <p>
                Először cseréld le a körhöz tartozó aktív seedpárt. A játék
                típusát a rendszer automatikusan felismeri.
              </p>
              <label htmlFor="pf-history-id">Játékelőzmény azonosítója</label>
              <input
                id="pf-history-id"
                value={historyId}
                required
                maxLength={24}
                disabled={Boolean(busy)}
                onChange={(event) => {
                  setHistoryId(event.target.value);
                  setVerification(null);
                }}
              />
              <button
                className="pf-primary"
                type="submit"
                disabled={Boolean(busy)}
              >
                {busy === "verify" ? "Ellenőrzés..." : "Játékkör ellenőrzése"}
              </button>
              <Link to="/games/history">Játéktörténet megnyitása</Link>
            </form>

            {verification && (
              <section className="pf-card" aria-live="polite">
                <h2
                  className={
                    verification.verified ? "pf-success" : "pf-failure"
                  }
                >
                  {verification.verified
                    ? "Az ellenőrzés sikeres"
                    : "Az ellenőrzés eltérést talált"}
                </h2>
                <p>
                  A mentett kört a szerver a felfedett seedből újraszámította.
                </p>
                <ul className="pf-checks">
                  {Object.entries(CHECK_LABELS)
                    .filter(([key]) => typeof verification[key] === "boolean")
                    .map(([key, label]) => (
                      <li key={key}>
                        <span>{label}</span>
                        <strong
                          className={
                            verification[key] ? "pf-success" : "pf-failure"
                          }
                        >
                          {verification[key] ? "Egyezik" : "Eltér"}
                        </strong>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default ProvablyFairPage;
