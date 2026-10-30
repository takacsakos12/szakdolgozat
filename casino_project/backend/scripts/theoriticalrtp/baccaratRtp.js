const assert = require("node:assert/strict");

const config = require("../../config/baccaratConfig");
const engine = require("../../services/baccarat/baccaratEngine");

/*
 * Az azonos tulajdonságú lapokat egy csoportba vonjuk.
 *
 * Főfogadásnál csak a pontérték számít:
 * a 10, JACK, QUEEN és KING egyaránt nulla pontot ér.
 *
 * Mellékfogadásnál a rangot és a kártyaszínt is megőrizzük,
 * mert például két kőr király Perfect Pairt alkothat.
 *
 * A card egy képviselőlap, a remaining pedig azt jelzi,
 * hány fizikai lapot képvisel még az adott csoport.
 */
function groupCards(shoe, keyForCard) {
  const groups = new Map();

  for (const card of shoe) {
    const key = keyForCard(card);

    if (!groups.has(key)) {
      groups.set(key, {
        card,
        remaining: 0,
      });
    }

    groups.get(key).remaining++;
  }

  return [...groups.values()];
}

/*
 * Egy fogadáscsoport pontos eredményeloszlását számítja ki.
 *
 * length: hány egymást követő lapot vizsgálunk.
 * keyForCard: mely tulajdonságok alapján vonhatók össze a lapok.
 * getHands: hogyan keletkezik a lapokból Player és Banker kéz.
 *
 * Nincs véletlen mintavétel: minden lehetséges csoportsorrendet
 * végigjárunk, és a fizikai példányszámokkal súlyozzuk.
 */
function calculateGroup(shoe, types, length, keyForCard, getHands) {
  // A fogadásokat ugyanaz az engine-függvény készíti elő,
  // amelyet a tényleges játék is használ.
  // Minden típust külön, a konfigurált minimumtéttel vizsgálunk.
  const bets = types.flatMap(
    (type) =>
      engine.prepareBaccaratBets([
        {
          type,
          amount: config.MIN_BET,
        },
      ]).preparedBets,
  );

  /*
   * Fogadásonként összegyűjtjük:
   * - a nyerő fizikai lapsorrendek számát;
   * - a tétvisszaadással végződő lapsorrendek számát;
   * - az összes lapsorrendhez tartozó teljes jóváírást.
   *
   * A BigInt nagy egész számokat is pontosan tárol.
   * A 0n ezért BigInt-nullát jelent.
   */
  const totals = Object.fromEntries(
    bets.map((bet) => [
      bet.type,
      {
        amount: bet.amount,
        wins: 0n,
        pushes: 0n,
        returnedCents: 0n,
      },
    ]),
  );

  const groups = groupCards(shoe, keyForCard);
  const sequence = new Array(length);

  let totalCases = 0n;
  let sequences = 0;

  /*
   * Rekurzívan felépítjük a lehetséges lapsorrendeket.
   *
   * depth: hány helyet töltöttünk már ki.
   * weight: az eddig kiválasztott csoportsorrend hány
   * különböző fizikai lapsorrendet képvisel.
   *
   * Például az első két nulla értékű lap választásához
   * nyolc paklinál 128 * 127 fizikai lappár tartozik.
   */
  function visit(depth, weight) {
    if (depth === length) {
      const { playerHand, bankerHand } = getHands(sequence);

      // A jóváírásokat nem külön képlettel másoljuk le:
      // a saját engine kiértékelőjét használjuk.
      const evaluatedBets = engine.evaluateBets(bets, playerHand, bankerHand);

      for (const bet of evaluatedBets) {
        const row = totals[bet.type];

        if (bet.isWinner) {
          row.wins += weight;
        }

        if (bet.isPush) {
          row.pushes += weight;
        }

        /*
         * A jóváírást század CR-ben tároljuk, így például
         * az 1,95 CR pontosan 195 egész egységként kezelhető.
         *
         * Az ellenőrzés biztosítja, hogy a kerekítés csak
         * apró lebegőpontos eltérést javítson ki.
         */
        const cents = Math.round(bet.winAmount * 100);

        assert.ok(Number.isSafeInteger(cents));

        assert.ok(Math.abs(bet.winAmount * 100 - cents) < 0.000001);

        row.returnedCents += weight * BigInt(cents);
      }

      totalCases += weight;
      sequences++;

      return;
    }

    for (const group of groups) {
      const choices = group.remaining;

      if (choices === 0) {
        continue;
      }

      sequence[depth] = group.card;

      // Visszatevés nélküli osztás:
      // az adott csoportból eggyel kevesebb lap marad.
      group.remaining--;

      visit(depth + 1, weight * BigInt(choices));

      // A következő lehetséges választás vizsgálata előtt
      // visszaállítjuk az eredeti darabszámot.
      group.remaining++;
    }
  }

  assert.ok(shoe.length >= length);

  visit(0, 1n);

  /*
   * Ellenőrizzük a felsorolás teljességét.
   *
   * N lapból k sorrendben kiválasztott lap lehetőségeinek száma:
   * N * (N - 1) * ... * (N - k + 1).
   *
   * Ennek egyeznie kell az összegzett súlyokkal.
   */
  let expectedCases = 1n;

  for (let index = 0; index < length; index++) {
    expectedCases *= BigInt(shoe.length - index);
  }

  assert.equal(totalCases, expectedCases);

  return {
    sequences,
    totalCases: totalCases.toString(),

    bets: Object.entries(totals).map(([type, row]) => {
      // Minden fizikai esethez egy ugyanakkora fogadás tartozik.
      const wageredCents = totalCases * BigInt(row.amount) * 100n;

      /*
       * Az elméleti RTP az összes lehetséges eset teljes
       * jóváírásának és teljes tétjének hányadosa.
       *
       * Number-re csak a megjelenítendő százalék számításakor
       * váltunk; a mögöttes egész darabszámokat megőrizzük.
       */
      const rtpPercent =
        (Number(row.returnedCents) / Number(wageredCents)) * 100;

      return {
        type,

        winPercent: (Number(row.wins) / Number(totalCases)) * 100,

        pushPercent: (Number(row.pushes) / Number(totalCases)) * 100,

        rtpPercent,
        houseEdgePercent: 100 - rtpPercent,

        // A BigInt értékeket stringként adjuk vissza,
        // hogy később JSON-ban is továbbíthatók legyenek.
        totalCases: totalCases.toString(),
        winningCases: row.wins.toString(),
        pushCases: row.pushes.toString(),
        returnedCents: row.returnedCents.toString(),
        wageredCents: wageredCents.toString(),
      };
    }),
  };
}

function calculateBaccaratRtp() {
  const mainTypes = ["PLAYER", "BANKER", "TIE"];

  const sideTypes = [
    "PLAYER_PAIR",
    "BANKER_PAIR",
    "EITHER_PAIR",
    "PERFECT_PAIR",
  ];

  /*
   * Ha új fogadás kerül a konfigurációba, álljon le a program,
   * hogy ne adjon észrevétlenül hiányos jelentést.
   *
   * Egy új Bonus fogadás például a végső kézértékektől is
   * függhet, ezért más felsorolást igényelhet.
   */
  assert.deepEqual(Object.keys(config.BET_TYPES).sort(), [...mainTypes].sort());

  assert.deepEqual(Object.keys(config.SIDE_BETS).sort(), [...sideTypes].sort());

  // A készlet méretét és összetételét a saját engine adja.
  const shoe = engine.createShoe();

  /*
   * FŐFOGADÁSOK
   *
   * Legfeljebb hat lap fogyhat el egy körben.
   * Mindig hat helyet vizsgálunk, de az engine csak annyit
   * használ fel, amennyit a szabályok megkövetelnek.
   *
   * A fel nem használt ötödik vagy hatodik lap nem változtatja
   * meg az eredményt. Így az összes eset egységesen számolható.
   *
   * A főfogadásoknál elegendő a pontérték szerinti csoportosítás.
   */
  const main = calculateGroup(
    shoe,
    mainTypes,
    6,
    (card) => config.CARD_VALUES[card.rank],

    (sequence) => {
      const dealt = engine.dealBaccaratHands(sequence);

      assert.ok(dealt.nextCardIndex >= 4 && dealt.nextCardIndex <= 6);

      return dealt;
    },
  );

  /*
   * MELLÉKFOGADÁSOK
   *
   * A jelenlegi négy mellékfogadás csak a kezdő két-két
   * laptól függ, ezért itt négy lapot kell felsorolni.
   *
   * Az osztási sorrend:
   * Player, Banker, Player, Banker.
   *
   * A rangot és a kártyaszínt is megtartjuk, mert a párok
   * felismeréséhez a pontérték önmagában nem elegendő.
   */
  const side = calculateGroup(
    shoe,
    sideTypes,
    4,
    (card) => `${card.rank}:${card.suit}`,

    (sequence) => ({
      playerHand: [sequence[0], sequence[2]],

      bankerHand: [sequence[1], sequence[3]],
    }),
  );

  return {
    configVersion: config.CONFIG_VERSION,
    cardCount: shoe.length,

    mainSequences: main.sequences,
    sideSequences: side.sequences,

    bets: [...main.bets, ...side.bets],
  };
}

// Közvetlen futtatáskor kiírjuk a jelentést.
if (require.main === module) {
  const report = calculateBaccaratRtp();

  console.log("Baccarat –", report.configVersion);
  console.log("Lapok:", report.cardCount);

  console.log("Főfogadási sorrendek:", report.mainSequences);

  console.log("Mellékfogadási sorrendek:", report.sideSequences);

  console.table(
    report.bets.map((row) => ({
      type: row.type,

      "Találat %": row.winPercent.toFixed(8),

      "Tétvisszaadás %": row.pushPercent.toFixed(8),

      "RTP %": row.rtpPercent.toFixed(8),

      "Házelőny %": row.houseEdgePercent.toFixed(8),
    })),
  );
}

module.exports = {
  calculateBaccaratRtp,
};