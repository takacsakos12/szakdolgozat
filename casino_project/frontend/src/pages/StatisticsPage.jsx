import { useEffect, useState } from "react";

import { getTheoreticalRtp } from "../api/statisticsApi";

import "./StatisticsPage.css";

const GAMES = {
  ROULETTE: {
    label: "Roulette",

    bets: {
      STRAIGHT: "Egy szám",
      SPLIT: "Két szám",
      TRIO: "Három szám a nullával",
      STREET: "Egy sor",
      CORNER: "Négyzet",
      FIRST_FOUR: "Első négy szám",
      SIX_LINE: "Két sor",

      FIRST_DOZEN: "Első tucat",
      SECOND_DOZEN: "Második tucat",
      THIRD_DOZEN: "Harmadik tucat",

      FIRST_COLUMN: "Első oszlop",
      SECOND_COLUMN: "Második oszlop",
      THIRD_COLUMN: "Harmadik oszlop",

      RED: "Piros",
      BLACK: "Fekete",
      EVEN: "Páros",
      ODD: "Páratlan",
      LOW: "1–18",
      HIGH: "19–36",
    },
  },

  BACCARAT: {
    label: "Baccarat",

    bets: {
      PLAYER: "Player",
      BANKER: "Banker",
      TIE: "Tie",
      PLAYER_PAIR: "Player Pair",
      BANKER_PAIR: "Banker Pair",
      EITHER_PAIR: "Either Pair",
      PERFECT_PAIR: "Perfect Pair",
    },
  },
};

const BACCARAT_EXPLANATIONS = {
  PLAYER:
    "Megnéztük, milyen gyakran nyer a Player, és milyen gyakran " +
    "lesz döntetlen. Nyeréskor a tét kétszerese jár vissza, " +
    "döntetlennél pedig az eredeti tét.",

  BANKER:
    "Megnéztük, milyen gyakran nyer a Banker. Nyeréskor az " +
    "5%-os nyereményjutalék miatt a tét 1,95-szorosa jár vissza. " +
    "Döntetlennél visszakapjuk az eredeti tétet.",

  TIE:
    "Megszámoltuk a döntetlenhez vezető eseteket. A fogadás " +
    "ilyenkor az eredeti téttel együtt kilencszeres jóváírást ad.",

  PLAYER_PAIR:
    "A Player első két lapjának azonos rangúnak kell lennie. " +
    "Az első lap után 415 lapból 31 azonos rangú marad. " +
    "Ezt az arányt a tizenkétszeres teljes jóváírással " +
    "számoltuk össze.",

  BANKER_PAIR:
    "A Banker első két lapjának azonos rangúnak kell lennie. " +
    "A pár esélye ugyanakkora, mint a Player Pair esetén. " +
    "Nyeréskor az eredeti téttel együtt tizenkétszeres jóváírás jár.",

  EITHER_PAIR:
    "Az első négy kiosztott lapnál megvizsgáltuk, hogy legalább " +
    "az egyik oldalon van-e pár. A mindkét oldalon párt adó " +
    "eseteket egyszer számoltuk. Nyeréskor hatszoros jóváírás jár.",

  PERFECT_PAIR:
    "Az első négy kiosztott lapnál az azonos rangú és " +
    "kártyaszínű párokat kerestük. Legalább az egyik oldalon " +
    "ilyen pár szükséges. Nyeréskor huszonhatszoros jóváírás jár.",
};

function formatNumber(value, digits = 2) {
  return value.toLocaleString("hu-HU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Csak azonos játékhoz, fogadáshoz és konfigurációhoz
// tartozó szimulációkat egyesítünk.
function summarizeSimulations(results, gameType, betType, configVersion) {
  if (!configVersion || !Array.isArray(results)) {
    return null;
  }

  const matching = results.filter(
    (result) =>
      result.gameType === gameType &&
      result.betType === betType &&
      result.configVersion === configVersion &&
      Number.isSafeInteger(result.roundCount) &&
      result.roundCount > 0 &&
      Number.isFinite(result.totalWager) &&
      result.totalWager > 0 &&
      Number.isFinite(result.totalWin) &&
      result.totalWin >= 0,
  );

  if (matching.length === 0) {
    return null;
  }

  const totals = matching.reduce(
    (sum, result) => ({
      rounds: sum.rounds + result.roundCount,
      wager: sum.wager + result.totalWager,
      win: sum.win + result.totalWin,
    }),
    {
      rounds: 0,
      wager: 0,
      win: 0,
    },
  );

  return {
    rounds: totals.rounds,
    rtpPercent: (totals.win / totals.wager) * 100,
  };
}

function StatisticsPage({ simulationResults = [] }) {
  const [gameType, setGameType] = useState("ROULETTE");
  const [betType, setBetType] = useState("STRAIGHT");

  const [theoreticalReports, setTheoreticalReports] = useState({});
  const [isLoadingRtp, setIsLoadingRtp] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    let timerId;

    setIsLoadingRtp(true);
    setErrorMessage("");

    async function loadTheoreticalRtp() {
      try {
        const response = await getTheoreticalRtp();

        if (!active) {
          return;
        }

        if (response.status === "loading") {
          // A lekérdezés nem indít új számítást.
          // Csak megvárjuk a backend eredményét.
          timerId = window.setTimeout(loadTheoreticalRtp, 2000);
          return;
        }

        if (
          response.status !== "ready" ||
          !Array.isArray(response.reports?.ROULETTE?.results) ||
          !Array.isArray(response.reports?.BACCARAT?.results)
        ) {
          throw new Error("Az RTP-adatok formátuma nem megfelelő.");
        }

        setTheoreticalReports(response.reports);
        setIsLoadingRtp(false);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error.message || "Nem sikerült betölteni az RTP-adatokat.",
        );

        setIsLoadingRtp(false);
      }
    }

    loadTheoreticalRtp();

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [reloadCount]);

  const game = GAMES[gameType];
  const report = theoreticalReports[gameType];

  const theoretical = report?.results?.find(
    (result) => result.type === betType,
  );

  const theoreticalRtp = Number.isFinite(theoretical?.rtpPercent)
    ? theoretical.rtpPercent
    : null;

  const simulation = summarizeSimulations(
    simulationResults,
    gameType,
    betType,
    report?.configVersion,
  );

  const difference =
    theoreticalRtp !== null && simulation
      ? simulation.rtpPercent - theoreticalRtp
      : null;

  function handleGameChange(nextGame) {
    setGameType(nextGame);
    setBetType(Object.keys(GAMES[nextGame].bets)[0]);
  }

  function handleReload() {
    setReloadCount((current) => current + 1);
  }

  return (
    <main className="statistics-page">
      <div className="statistics-container">
        <header className="statistics-header">
          <span className="statistics-eyebrow">KASZINÓANALITIKA</span>

          <h1>A számok mögött</h1>

          <p>
            Hogyan számoltuk ki a hosszú távú visszafizetést, és mennyire
            közelítik ezt a szimulációk?
          </p>
        </header>

        {isLoadingRtp && (
          <p className="statistics-status" role="status">
            Az RTP-adatok betöltése folyamatban. Ha a backend most indult, a
            számítás még némi időt igényelhet.
          </p>
        )}

        {errorMessage && (
          <div
            className="statistics-status statistics-status-error"
            role="alert"
          >
            <p>{errorMessage}</p>

            <button
              type="button"
              className="button button-ghost"
              onClick={handleReload}
            >
              Betöltés újra
            </button>
          </div>
        )}

        <section className="statistics-panel" aria-label="RTP összehasonlítása">
          <div className="statistics-filters">
            <div>
              <label htmlFor="statistics-game">Játék</label>

              <select
                id="statistics-game"
                value={gameType}
                onChange={(event) => handleGameChange(event.target.value)}
              >
                {Object.entries(GAMES).map(([type, item]) => (
                  <option key={type} value={type}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="statistics-bet">Fogadás</label>

              <select
                id="statistics-bet"
                value={betType}
                onChange={(event) => setBetType(event.target.value)}
              >
                {Object.entries(game.bets).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="statistics-metrics">
            <div className="statistics-metric statistics-metric-primary">
              <span>Számított RTP</span>

              <strong>
                {theoreticalRtp === null
                  ? "—"
                  : `${formatNumber(theoreticalRtp)}%`}
              </strong>

              <small>
                {isLoadingRtp
                  ? "Betöltés folyamatban"
                  : theoreticalRtp === null
                    ? "Nincs elérhető eredmény"
                    : "A saját számítóprogram eredménye"}
              </small>
            </div>

            <div className="statistics-metric">
              <span>Szimulációs RTP</span>

              <strong>
                {simulation ? `${formatNumber(simulation.rtpPercent)}%` : "—"}
              </strong>

              <small>
                {simulation
                  ? `${simulation.rounds.toLocaleString("hu-HU")} kör alapján`
                  : "Nincs betöltött mérés"}
              </small>
            </div>

            <div className="statistics-metric">
              <span>Eltérés</span>

              <strong>
                {difference === null
                  ? "—"
                  : `${difference > 0 ? "+" : ""}${formatNumber(difference)}`}
              </strong>

              <small>
                {difference === null ? "Mérés után számítható" : "százalékpont"}
              </small>
            </div>
          </div>

          <p className="statistics-rtp-note">
            Az RTP a hosszú távú visszafizetés aránya. Például 97%-nál minden
            összesen feltett 100 CR-ből átlagosan 97 CR jár vissza. Ez nem a
            nyerés esélye, és nem ígéret a következő kör eredményére.
          </p>
        </section>

        <section className="statistics-panel">
          <span className="statistics-eyebrow">A SZÁMÍTÁS MENETE</span>

          <h2>Hogyan számoltuk?</h2>

          <p className="statistics-explanation">
            {gameType === "ROULETTE"
              ? "A program minden megengedett fogadási pozíciónál " +
                "végigvizsgálta mind a 37 lehetséges számot. " +
                "Összeadta az ezekre járó jóváírásokat, majd " +
                "összevetette az összes feltett tét összegével."
              : BACCARAT_EXPLANATIONS[betType]}
          </p>

          {theoreticalRtp !== null && (
            <div className="statistics-takeaway">
              <span>
                {game.bets[betType]} fogadásnál minden összesen feltett 100
                CR-re
              </span>

              <strong>
                átlagosan {formatNumber(theoreticalRtp)} CR jár vissza
              </strong>
            </div>
          )}

          <details className="statistics-details">
            <summary>Számítás részletei</summary>

            {gameType === "ROULETTE" ? (
              <>
                <p>
                  Egy számra tett 1 CR-os fogadásnál a 37 számból egy nyer.
                  Találatkor az eredeti téttel együtt 36 CR jár vissza.
                </p>

                <p>
                  Képzeljünk el 37 kört, ahol minden szám egyszer érkezik.
                  Összesen 37 CR-t tettünk fel, és 36 CR-t kaptunk vissza. A
                  36-ot 37-tel elosztva körülbelül 97,30%-ot kapunk.
                </p>

                <p>
                  A többi fogadás több számot fed le, de kisebb összeget fizet.
                  A jelenlegi szabályokkal ugyanaz a visszafizetési arány
                  adódik.
                </p>

                <p>
                  A valódi játékban a számok nem ilyen szabályos sorrendben
                  érkeznek. Ez a példa a hosszú távú átlagot szemlélteti.
                </p>
              </>
            ) : (
              <>
                <p>
                  Minden kör új, nyolcpaklis, 416 lapos cipőből indul. Egy körön
                  belül a lapokat nem tesszük vissza, így minden húzás után
                  kevesebb lap marad.
                </p>

                <p>
                  Például az első húzás előtt 32 ász van a 416 lap között. Ha
                  ászt húztunk, utána már csak 31 ász marad a 415 lap között.
                </p>

                <p>
                  A program figyelembe veszi a lapok gyakoriságát és az
                  automatikus harmadiklap-szabályokat. A ritkább és gyakoribb
                  kiosztásokat nem azonos súllyal számolja.
                </p>

                <p>
                  A főfogadásokhoz a teljes kör eredményét vizsgáljuk. A
                  párokhoz az első két-két lap rangját, Perfect Pair esetén a
                  kártyaszínét is ellenőrizzük.
                </p>

                <p>
                  A megfelelő esetek arányát a kifizetéssel együtt használjuk.
                  Player és Banker fogadásnál a döntetlenkor visszaadott tétet
                  is beleszámítjuk.
                </p>
              </>
            )}

            {report?.configVersion && (
              <p className="statistics-version">
                Konfiguráció: {report.configVersion}
              </p>
            )}
          </details>
        </section>

        <aside className="statistics-footer-note">
          A szimuláció eredménye a véletlen miatt eltérhet a számított értéktől.
          Több kör általában pontosabb becslést ad, de a mért arány közben
          ingadozhat.
        </aside>
      </div>
    </main>
  );
}

export default StatisticsPage;
