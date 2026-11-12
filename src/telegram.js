
import axios from "axios";
import { config } from "./config.js";

// Format số
const fmt = (value, digits = 2) =>
  Number(value).toLocaleString("en-US", {
    maximumFractionDigits: digits
  });

export async function sendToTelegram(wall) {
  // Phân biệt BUY WALL và SELL WALL
  const side =
    wall.side === "BUY"
      ? "🟢 BUY WALL"
      : "🔴 SELL WALL";

  // Trạng thái Wall: NEW hoặc REPEAT
  const repeatCount = Number(wall.repeatCount) || 1;

  const coinGlassUrl =
  `https://www.coinglass.com/tv/vi/Binance_${wall.symbol}`;

  const wallStatus =
    repeatCount > 1
      ? `🔁 REPEAT ×${repeatCount}`
      : "🆕 NEW WALL";

  // Nội dung tin nhắn Telegram
  const message = [
    "🚨 BINANCE FUTURES WALL ALERT",
    "",
    `🪙 Coin: ${wall.symbol}`,
    side,
    wallStatus,
    "",
    "💰 WALL INFORMATION",
    `💰 Giá Wall: <code>${wall.price}</code>`,
    `📦 Khối lượng: ${fmt(wall.qty, 6)}`,
    `💵 Giá trị: ${fmt(wall.usdt)} USDT`,
    `📊 Gấp trung bình: ${fmt(wall.ratio)} lần`,
    `📉 Trung bình/mức: ${fmt(wall.averageUSDT)} USDT`,
    "",
    "📍 PRICE POSITION",
    `📍 Khoảng cách giá: ${
      wall.distancePercent >= 0 ? "+" : ""
    }${fmt(wall.distancePercent)}%`,
    "",
    `🔗 https://www.coinglass.com/tv/vi/Binance_${wall.symbol}`,
    "⚠️ Snapshot lệnh chờ, không phải giao dịch đã khớp."
  ].join("\n");

  // Nếu chưa cấu hình Telegram thì in ra console
  if (
    !config.telegramToken ||
    !config.telegramChatId
  ) {
    console.log(message);
    return;
  }

  // Telegram Bot API
  const url =
    `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;

  // Gửi tin nhắns
  const { data } = await axios.post(
    url,
    {
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: "HTML"
    },
    {
      timeout: 15000
    }
  );

  // Kiểm tra kết quả gửi
  if (!data.ok) {
    throw new Error("Telegram send failed");
  }
}
