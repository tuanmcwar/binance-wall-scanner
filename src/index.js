
import { config } from "./config.js";
import {
  getSymbols,
  getDepth
} from "./binance.js";
import { scanWalls } from "./wallScanner.js";
import { sendToTelegram } from "./telegram.js";

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const alertHistory = new Map();

const wallRepeatHistory = new Map();

function getWallRepeatInfo(wall) {
  const key = `${wall.symbol}:${wall.side}:${wall.price}`;

  const count = (wallRepeatHistory.get(key) || 0) + 1;

  return { key, count };
}

let running = true;

process.on("SIGINT", () => {
  running = false;
});

process.on("SIGTERM", () => {
  running = false;
});

function getAlertKey(wall) {
  return [
    wall.symbol,
    wall.side,
    wall.price
  ].join(":");
}

function canAlert(wall) {
  const key = getAlertKey(wall);
  const lastAlert = alertHistory.get(key);

  if (lastAlert === undefined) {
    return true;
  }

  return (
    Date.now() - lastAlert >= config.cooldown
  );
}

function markAlerted(wall) {
  alertHistory.set(
    getAlertKey(wall),
    Date.now()
  );
}

function cleanAlertHistory() {
  const now = Date.now();

  for (const [key, timestamp] of alertHistory) {
    if (now - timestamp >= config.cooldown) {
      alertHistory.delete(key);
    }
  }
}

async function scanMarket() {
  const symbols = await getSymbols();

  console.log(
    `\n🔍 Bắt đầu quét ${symbols.length} coin`
  );

  let scanned = 0;
  let alerts = 0;
  let errors = 0;

  for (const symbol of symbols) {
    if (!running) break;

    try {
      const snapshot = await getDepth(symbol);

      const walls = scanWalls(
        symbol,
        snapshot
      );

      for (const wall of walls) {
        if (!canAlert(wall)) {
          continue;
        }

        // Gửi ngay, không kiểm tra persistence.
        const repeatInfo = getWallRepeatInfo(wall);

await sendToTelegram({
  ...wall,
  repeatCount: repeatInfo.count
});

// Chỉ tăng số lần sau khi gửi Telegram thành công.
wallRepeatHistory.set(
  repeatInfo.key,
  repeatInfo.count
);

markAlerted(wall);
alerts++;

        console.log(
          `🚨 ${symbol} ${wall.side} | ` +
          `${wall.ratio.toFixed(2)}x | ` +
          `${wall.usdt.toFixed(2)} USDT`
        );
      }
    } catch (error) {
      errors++;

      const status = error.response?.status;

      console.error(
        `❌ ${symbol}: ${error.message}`
      );

      if (status === 451) {
        throw new Error(
          "HTTP 451: Binance chặn khu vực IP server"
        );
      }

      if (status === 429 || status === 418) {
        const retryAfter = Number(
          error.response?.headers?.["retry-after"]
        );

        const waitMs =
          Number.isFinite(retryAfter) &&
          retryAfter > 0
            ? retryAfter * 1000
            : status === 418
              ? 120000
              : 65000;

        console.log(
          `⏳ Rate limit: chờ ${waitMs}ms`
        );

        await sleep(waitMs);
      }
    }

    scanned++;

    if (scanned % 50 === 0) {
      console.log(
        `📊 ${scanned}/${symbols.length} | ` +
        `Alerts: ${alerts} | Errors: ${errors}`
      );
    }

    if (running) {
      await sleep(config.requestDelay);
    }
  }

  cleanAlertHistory();

  console.log(
    `✅ Hoàn thành: ${scanned}/${symbols.length} | ` +
    `Alerts: ${alerts} | Errors: ${errors}`
  );
}

async function main() {
  console.log(
    "🚀 BINANCE FUTURES WALL SCANNER V1"
  );

  console.log(
    `📊 Depth: ${config.depthLimit}`
  );

  console.log(
    `💵 Wall >= ${config.minUSDT} USDT`
  );

  console.log(
    `📈 Ratio >= ${config.multiplier}x`
  );

  console.log(
    `📍 Range: ±${config.rangePercent}%`
  );

  console.log(
    `⏱️ Delay: ${config.requestDelay}ms`
  );

  while (running) {
    try {
      await scanMarket();
    } catch (error) {
      console.error(
        `❌ Scan error: ${error.message}`
      );

      if (error.message.includes("HTTP 451")) {
        console.error(
          "Không thể tiếp tục quét với IP hiện tại."
        );
        break;
      }
    }

    if (running) {
      console.log(
        `⏳ Nghỉ ${config.scanInterval / 1000} giây`
      );

      await sleep(config.scanInterval);
    }
  }

  console.log("Scanner stopped.");
}

main().catch(error => {
  console.error("FATAL:", error);
  process.exitCode = 1;
});
