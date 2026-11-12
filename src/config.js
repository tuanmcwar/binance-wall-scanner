
import "dotenv/config";

export const config = {
  rest:
    process.env.BINANCE_REST ||
    "https://fapi.binance.com",

  depthLimit: Number(
    process.env.DEPTH_LIMIT || 500
  ),

  multiplier: Number(
    process.env.WALL_MULTIPLIER || 50
  ),

  minUSDT: Number(
    process.env.MIN_WALL_USDT || 100000
  ),

  rangePercent: Number(
    process.env.PRICE_RANGE_PERCENT || 5
  ),

  minLevels: Number(
    process.env.MIN_LEVELS || 20
  ),

  scanInterval: Number(
    process.env.SCAN_INTERVAL_MS || 120000
  ),

  requestDelay: Number(
    process.env.REQUEST_DELAY_MS || 1000
  ),

  cooldown: Number(
    process.env.ALERT_COOLDOWN_MS || 300000
  ),

  telegramToken:
    process.env.TELEGRAM_BOT_TOKEN,

  telegramChatId:
    process.env.TELEGRAM_CHAT_ID
};
