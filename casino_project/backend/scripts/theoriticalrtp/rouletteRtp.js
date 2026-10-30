const assert = require("node:assert/strict");

const {
  CONFIG_VERSION,
  BET_TYPES,
  ROULETTE_POSITIONS,
  EUROPEAN_WHEEL_ORDER,
  MIN_BET_AMOUNT,
} = require("../../config/rouletteConfig");

const {
  prepareRouletteBets,
  playRouletteGame,
} = require("../../services/roulette/rouletteEngine");

function calculateRouletteRtp() {
  const outcomes = [...EUROPEAN_WHEEL_ORDER];

  // Az európai keréken minden 0–36 közötti szám egyszer szerepel.
  assert.equal(outcomes.length, 37);
  assert.equal(new Set(outcomes).size, 37);

  for (let number = 0; number <= 36; number++) {
    assert.ok(outcomes.includes(number));
  }

  const outcomeProbability = 1 / outcomes.length;
  const betAmount = MIN_BET_AMOUNT;

  const results = [];

  for (const [type, betConfig] of Object.entries(BET_TYPES)) {
    // Belső fogadásnál minden lehetséges pozíciót megvizsgálunk.
    // Külső fogadásnál a számokat az engine rendeli a típushoz.
    const positions = ROULETTE_POSITIONS[type] ?? [[]];

    const positionResults = [];

    for (const numbers of positions) {
      const { preparedBets, totalBetAmount } = prepareRouletteBets([
        {
          type,
          numbers: [...numbers],
          amount: betAmount,
        },
      ]);

      let winningOutcomes = 0;
      let pushOutcomes = 0;
      let expectedWin = 0;

      for (const winningNumber of outcomes) {
        // A véletlengenerátor helyett sorban megadjuk az összes
        // eredményt. A kifizetést továbbra is az engine számolja.
        const result = playRouletteGame({
          preparedBets,
          totalBetAmount,

          randomInt: (range) => {
            assert.equal(range, outcomes.length);

            return winningNumber;
          },
        });

        assert.equal(result.winningNumber, winningNumber);
        assert.equal(result.cost, totalBetAmount);

        if (result.bets[0].isWinner) {
          winningOutcomes++;
        } else if (result.totalWin === result.cost) {
          // Push: nyerés nélkül visszajár az eredeti tét.
          pushOutcomes++;
        }

        // Várható jóváírás = az egyes jóváírások
        // valószínűséggel súlyozott összege.
        expectedWin += result.totalWin * outcomeProbability;
      }

      const rtpPercent = (expectedWin / totalBetAmount) * 100;

      positionResults.push({
        numbers: [...numbers],
        winningOutcomes,
        pushOutcomes,

        winProbabilityPercent: (winningOutcomes / outcomes.length) * 100,

        pushProbabilityPercent: (pushOutcomes / outcomes.length) * 100,

        expectedWin,
        rtpPercent,
        houseEdgePercent: 100 - rtpPercent,
      });
    }

    const reference = positionResults[0];

    // Ugyanazon fogadástípus minden pozíciójának azonos
    // nyerési esélyt és RTP-t kell adnia.
    for (const position of positionResults) {
      assert.equal(
        position.winningOutcomes,
        reference.winningOutcomes,
        `${type}: eltérő nyerési esély a pozíciók között.`,
      );

      assert.ok(
        Math.abs(position.rtpPercent - reference.rtpPercent) < 1e-9,
        `${type}: eltérő RTP a pozíciók között.`,
      );
    }

    results.push({
      type,
      payout: betConfig.payout,
      positionCount: positions.length,
      winningOutcomes: reference.winningOutcomes,
      winProbabilityPercent: reference.winProbabilityPercent,
      pushProbabilityPercent: reference.pushProbabilityPercent,
      expectedWin: reference.expectedWin,
      rtpPercent: reference.rtpPercent,
      houseEdgePercent: reference.houseEdgePercent,

      // Ezek később a részletes matematikai bemutatáshoz
      // vagy további ellenőrzésekhez is használhatók.
      positions: positionResults,
    });
  }

  return {
    configVersion: CONFIG_VERSION,
    method: "EXACT_OUTCOME_ENUMERATION",
    outcomeCount: outcomes.length,
    betAmount,
    results,
  };
}

if (require.main === module) {
  const report = calculateRouletteRtp();

  console.log(`Konfiguráció: ${report.configVersion}`);
  console.log(`Lehetséges eredmények: ${report.outcomeCount}`);
  console.log(`Vizsgált tét: ${report.betAmount} CR\n`);

  console.table(
    report.results.map((result) => ({
      típus: result.type,
      pozíciók: result.positionCount,
      "Nyerő eredmények": result.winningOutcomes,
      Kifizetés: `${result.payout}:1`,
      "Találat %": result.winProbabilityPercent.toFixed(8),
      "Tétvisszaadás %": result.pushProbabilityPercent.toFixed(8),
      "RTP %": result.rtpPercent.toFixed(8),
      "Házelőny %": result.houseEdgePercent.toFixed(8),
    })),
  );

  console.log("\nMinden fogadási pozíció ellenőrzése sikeresen lefutott.");
}

module.exports = {
  calculateRouletteRtp,
};