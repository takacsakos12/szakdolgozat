const {
  ROW_COUNT,
  REEL_COUNT,
  SYMBOLS,
  MAX_WIN_MULTIPLIER,
  BONUS_BUY_COST_MULTIPLIER,
  FEATURE_SPIN_COST_MULTIPLIER,
  PAYTABLE,
  SCATTER_PAYTABLE,
  BOOK_BONUS,
  PAYLINES,
  REEL_STRIPS,
  BONUS_REEL_STRIPS_BY_SYMBOL,
  FEATURE_SPIN_REEL_STRIPS_BY_SYMBOL,
} = require("../config/slotConfig");

function generateGrid(
  random = Math.random,
  reelStrips = REEL_STRIPS
) {
  const grid = Array.from(
    { length: ROW_COUNT },
    () =>
      Array(REEL_COUNT).fill(null)
  );

  for (
    let reelIndex = 0;
    reelIndex < REEL_COUNT;
    reelIndex += 1
  ) {
    const strip =
      reelStrips[reelIndex];

    const stopIndex =
      Math.floor(
        random() * strip.length
      );

    for (
      let rowIndex = 0;
      rowIndex < ROW_COUNT;
      rowIndex += 1
    ) {
      grid[rowIndex][reelIndex] =
        strip[
          (
            stopIndex +
            rowIndex
          ) % strip.length
        ];
    }
  }

  return grid;
}

function countMatchingSymbols(
  lineSymbols,
  targetSymbol
) {
  let matchCount = 0;

  for (const symbol of lineSymbols) {
    const matchesTarget =
      symbol === targetSymbol;

    const isWild =
      symbol === SYMBOLS.WILD;

    if (
      !matchesTarget &&
      !isWild
    ) {
      break;
    }

    matchCount += 1;
  }

  return matchCount;
}

function evaluatePayline(
  grid,
  payline,
  payoutUnit
) {
  const lineSymbols =
    payline.map(
      (rowIndex, reelIndex) =>
        grid[rowIndex][reelIndex]
    );

  let bestWin = null;

  for (
    const [
      targetSymbol,
      payouts,
    ] of Object.entries(PAYTABLE)
  ) {
    const matchCount =
      countMatchingSymbols(
        lineSymbols,
        targetSymbol
      );

    const multiplier =
      payouts[matchCount];

    if (!multiplier) {
      continue;
    }

    const winAmount =
      multiplier * payoutUnit;

    if (
      !bestWin ||
      winAmount >
        bestWin.winAmount
    ) {
      bestWin = {
        symbol: targetSymbol,
        matchCount,
        multiplier,
        winAmount,
        lineSymbols,
      };
    }
  }

  return bestWin;
}

function countSymbol(
  grid,
  targetSymbol
) {
  return grid
    .flat()
    .filter(
      (symbol) =>
        symbol === targetSymbol
    )
    .length;
}

function evaluateGrid(
  grid,
  totalBet
) {
  const lineWins = [];

  PAYLINES.forEach(
    (payline, lineIndex) => {
      const win =
        evaluatePayline(
          grid,
          payline,
          totalBet
        );

      if (win) {
        lineWins.push({
          lineIndex:
            lineIndex + 1,
          ...win,
        });
      }
    }
  );

  const scatterCount =
    countSymbol(
      grid,
      SYMBOLS.SCATTER
    );

  const scatterMultiplier =
    SCATTER_PAYTABLE[
      scatterCount
    ] || 0;

  const scatterWin =
    scatterMultiplier *
    totalBet;

  const lineWinTotal =
    lineWins.reduce(
      (sum, win) =>
        sum + win.winAmount,
      0
    );

  return {
    totalWin:
      lineWinTotal +
      scatterWin,

    lineWinTotal,
    scatterWin,
    scatterCount,
    lineWins,
  };
}

function selectExpandableSymbol(
  random
) {
  const symbols =
    BOOK_BONUS
      .expandableSymbols;

  return symbols[
    Math.floor(
      random() *
      symbols.length
    )
  ];
}

function validateSelectedSymbol(
  selectedSymbol
) {
  if (
    !BOOK_BONUS
      .expandableSymbols
      .includes(selectedSymbol)
  ) {
    throw new Error(
      "A kiválasztott bővülő szimbólum nem érvényes."
    );
  }
}

function expandBookSymbol(
  grid,
  expandingSymbol
) {
  const expandedGrid =
    grid.map(
      (row) => [...row]
    );

  const reelsWithSymbol = [];

  for (
    let reelIndex = 0;
    reelIndex < REEL_COUNT;
    reelIndex += 1
  ) {
    const hasSymbol =
      grid.some(
        (row) =>
          row[reelIndex] ===
          expandingSymbol
      );

    if (hasSymbol) {
      reelsWithSymbol.push(
        reelIndex
      );
    }
  }

  const hasWinningReelCount =
    Boolean(
      PAYTABLE[
        expandingSymbol
      ]?.[
        reelsWithSymbol.length
      ]
    );

  if (!hasWinningReelCount) {
    return {
      grid: expandedGrid,
      expandedReels: [],
    };
  }

  for (
    const reelIndex
    of reelsWithSymbol
  ) {
    for (
      let rowIndex = 0;
      rowIndex < ROW_COUNT;
      rowIndex += 1
    ) {
      expandedGrid[
        rowIndex
      ][reelIndex] =
        expandingSymbol;
    }
  }

  return {
    grid: expandedGrid,
    expandedReels:
      reelsWithSymbol,
  };
}

function evaluateExpandedSpin({
  originalGrid,
  expandingSymbol,
  totalBet,
}) {
  const expansion =
    expandBookSymbol(
      originalGrid,
      expandingSymbol
    );

  const originalEvaluation =
    evaluateGrid(
      originalGrid,
      totalBet
    );

  const expandingReelCount =
    expansion
      .expandedReels
      .length;

  const expandingMultiplier =
    PAYTABLE[
      expandingSymbol
    ]?.[
      expandingReelCount
    ] || 0;

  /*A bővülő szimbólum az érintett tárcsák elhelyezkedésétőlfüggetlenül mind a tíz nyerővonalon fizet.*/
  const expandingWin =
    expandingMultiplier *
    totalBet *
    PAYLINES.length;

  /*A normál nyerővonalakat és Scattereket az eredeti rácson értékeljük. A bővülő szimbólum nyereményét külön adjuk hozzá.*/
  return {
    originalGrid,
    grid: expansion.grid,

    expandedReels:
      expansion.expandedReels,

    lineWins:
      originalEvaluation.lineWins,

    lineWinTotal:
      originalEvaluation
        .lineWinTotal,

    expandingReelCount,
    expandingMultiplier,
    expandingWin,

    scatterCount:
      originalEvaluation
        .scatterCount,

    scatterWin:
      originalEvaluation
        .scatterWin,

    totalWin:
      originalEvaluation
        .totalWin +
      expandingWin,
  };
}

function playBookBonus({
  totalBet,
  random = Math.random,
  maxWinAmount = Infinity,
  selectedSymbol = null,
  useFeatureReels = false,
  allowRetrigger = true,
}) {
  const expandingSymbol =
    selectedSymbol ||
    selectExpandableSymbol(
      random
    );

  validateSelectedSymbol(
    expandingSymbol
  );

  const reelStrips =
    useFeatureReels
      ? BONUS_REEL_STRIPS_BY_SYMBOL[
          expandingSymbol
        ]
      : REEL_STRIPS;

  const freeSpinResults = [];

  let remainingFreeSpins =
    BOOK_BONUS
      .initialFreeSpins;

  let totalFreeSpins = 0;
  let retriggerCount = 0;
  let totalWin = 0;
  let uncappedTotalWin = 0;
  let maxWinApplied = false;

  while (
    remainingFreeSpins > 0 &&
    totalWin < maxWinAmount
  ) {
    remainingFreeSpins -= 1;
    totalFreeSpins += 1;

    const originalGrid =
      generateGrid(
        random,
        reelStrips
      );

    const evaluated =
      evaluateExpandedSpin({
        originalGrid,
        expandingSymbol,
        totalBet,
      });

    if (
      allowRetrigger &&
      evaluated.scatterCount >=
        BOOK_BONUS
          .triggerScatterCount
    ) {
      remainingFreeSpins +=
        BOOK_BONUS
          .retriggerFreeSpins;

      retriggerCount += 1;
    }

    const remainingCapacity =
      maxWinAmount -
      totalWin;

    const creditedWin =
      Math.min(
        evaluated.totalWin,
        remainingCapacity
      );

    uncappedTotalWin +=
      evaluated.totalWin;

    totalWin += creditedWin;

    const spinWasCapped =
      creditedWin <
      evaluated.totalWin;

    maxWinApplied ||=
      spinWasCapped;

    freeSpinResults.push({
      spinNumber:
        totalFreeSpins,

      ...evaluated,

      uncappedWin:
        evaluated.totalWin,

      totalWin:
        creditedWin,

      maxWinApplied:
        spinWasCapped,
    });
  }

  return {
    type: "BOOK",
    expandingSymbol,

    initialFreeSpins:
      BOOK_BONUS
        .initialFreeSpins,

    totalFreeSpins,
    retriggerCount,
    totalWin,
    uncappedTotalWin,
    maxWinApplied,
    freeSpinResults,
  };
}

function spin({
  totalBet = 1,
  random = Math.random,
  playBonus = true,
} = {}) {
  if (
    !Number.isFinite(totalBet) ||
    totalBet <= 0
  ) {
    throw new Error(
      "A teljes tétnek pozitív számnak kell lennie."
    );
  }

  const grid =
    generateGrid(random);

  const maximumWinAmount =
    totalBet *
    MAX_WIN_MULTIPLIER;

  const baseResult =
    evaluateGrid(
      grid,
      totalBet
    );

  const uncappedBaseGameWin =
    baseResult.totalWin;

  const baseGameWin =
    Math.min(
      uncappedBaseGameWin,
      maximumWinAmount
    );

  const bonusTriggered =
    baseResult.scatterCount >=
    BOOK_BONUS
      .triggerScatterCount;

  /*
   * A bővülő szimbólumot
   * a bónusz minden esetben
   * véletlenszerűen választja.
   */
  const bonus =
    bonusTriggered &&
    playBonus
      ? playBookBonus({
          totalBet,
          random,

          maxWinAmount:
            maximumWinAmount -
            baseGameWin,

          useFeatureReels: true,
        })
      : null;

  const bonusWin =
    bonus?.totalWin || 0;

  const totalWin =
    baseGameWin +
    bonusWin;

  return {
    grid,
    totalBet,

    ...baseResult,

    totalWin,
    baseGameWin,
    uncappedBaseGameWin,
    bonusWin,
    bonusTriggered,
    bonus,
    maximumWinAmount,

    maxWinReached:
      totalWin >=
      maximumWinAmount,
  };
}

function featureSpin({
  totalBet = 1,
  selectedSymbol,
  random = Math.random,
} = {}) {
  if (
    !Number.isFinite(totalBet) ||
    totalBet <= 0
  ) {
    throw new Error(
      "A teljes tétnek pozitív számnak kell lennie."
    );
  }

  validateSelectedSymbol(
    selectedSymbol
  );

  const featureCost =
    totalBet *
    FEATURE_SPIN_COST_MULTIPLIER;

  const maximumWinAmount =
    totalBet *
    MAX_WIN_MULTIPLIER;

  const expandingSymbol =
    selectedSymbol;

  const reelStrips =
    FEATURE_SPIN_REEL_STRIPS_BY_SYMBOL[
      expandingSymbol
    ];

  const originalGrid =
    generateGrid(
      random,
      reelStrips
    );

  const evaluated =
    evaluateExpandedSpin({
      originalGrid,
      expandingSymbol,
      totalBet,
    });

  const uncappedWin =
    evaluated.totalWin;

  const totalWin =
    Math.min(
      uncappedWin,
      maximumWinAmount
    );

  return {
    totalBet,
    featureCost,
    expandingSymbol,

    ...evaluated,

    totalWin,
    uncappedWin,
    maximumWinAmount,

    maxWinReached:
      totalWin >=
      maximumWinAmount,
  };
}

function buyBookBonus({
  totalBet = 1,
  random = Math.random,
  forcedSymbol = null,
} = {}) {
  if (
    !Number.isFinite(totalBet) ||
    totalBet <= 0
  ) {
    throw new Error(
      "A teljes tétnek pozitív számnak kell lennie."
    );
  }

  /* A forcedSymbol kizárólag statisztikai vizsgálathoz használható. A játék normálműködésében null marad.*/
  if (forcedSymbol !== null) {
    validateSelectedSymbol(
      forcedSymbol
    );
  }

  const purchaseCost =
    totalBet *
    BONUS_BUY_COST_MULTIPLIER;

  const maximumWinAmount =
    totalBet *
    MAX_WIN_MULTIPLIER;

  const bonus =
    playBookBonus({
      totalBet,
      random,
      maxWinAmount:
        maximumWinAmount,

      selectedSymbol:
        forcedSymbol,

      useFeatureReels: true,
      allowRetrigger: true,
    });

  return {
    totalBet,
    purchaseCost,

    expandingSymbol:
      bonus.expandingSymbol,

    totalWin:
      bonus.totalWin,

    bonus,
    maximumWinAmount,

    maxWinReached:
      bonus.totalWin >=
      maximumWinAmount,
  };
}

module.exports = {
  generateGrid,
  evaluatePayline,
  evaluateGrid,
  expandBookSymbol,
  playBookBonus,
  featureSpin,
  buyBookBonus,
  spin,
};