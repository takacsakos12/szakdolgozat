const { Worker, isMainThread, parentPort } = require("node:worker_threads");

if (!isMainThread) {
  try {
    const {
      calculateRouletteRtp,
    } = require("../scripts/theoriticalrtp/rouletteRtp");

    const {
      calculateBaccaratRtp,
    } = require("../scripts/theoriticalrtp/baccaratRtp");

    const roulette = calculateRouletteRtp();
    const baccarat = calculateBaccaratRtp();

    // A két számítóprogram eltérő nevű listáját egységesítjük.
    const reports = {
      ROULETTE: {
        ...roulette,
        results: roulette.results ?? roulette.bets,
      },

      BACCARAT: {
        ...baccarat,
        results: baccarat.results ?? baccarat.bets,
      },
    };

    for (const report of Object.values(reports)) {
      if (!Array.isArray(report.results)) {
        throw new Error(
          "A számítás eredményéből hiányzik a fogadások listája.",
        );
      }
    }

    parentPort.postMessage({ reports });
  } catch (error) {
    parentPort.postMessage({
      error: error.stack ?? error.message,
    });
  }
} else {
  const express = require("express");

  const statisticsRoutes = express.Router();

  let started = false;

  let calculation = {
    status: "loading",
    reports: {},
  };

  function setCalculationError(error) {
    console.error("RTP-számítási hiba:", error);

    calculation = {
      status: "error",
      reports: {},
    };
  }

  function startRtpCalculation() {
    if (started) {
      return;
    }

    started = true;

    console.log("A Roulette és Baccarat RTP-számítása elindult.");

    try {
      const worker = new Worker(__filename);

      worker.on("message", (message) => {
        if (message.error) {
          setCalculationError(message.error);
          return;
        }

        calculation = {
          status: "ready",
          reports: message.reports,
        };

        console.log("A Roulette és Baccarat RTP-számítása elkészült.");
      });

      worker.on("error", setCalculationError);

      worker.on("exit", (code) => {
        if (calculation.status === "loading") {
          setCalculationError(
            `A számítás eredmény nélkül állt le. Kilépési kód: ${code}`,
          );
        }
      });
    } catch (error) {
      setCalculationError(error);
    }
  }

  statisticsRoutes.get("/theoretical-rtp", (req, res) => {
    res.set("Cache-Control", "no-store");

    if (calculation.status === "error") {
      return res.status(500).json({
        message:
          "Az RTP-számítás nem sikerült. A részletek a backend konzoljában láthatók.",
      });
    }

    return res.json(calculation);
  });

  module.exports = {
    statisticsRoutes,
    startRtpCalculation,
  };
}
