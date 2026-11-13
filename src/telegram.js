
import axios from "axios";
import { config } from "./config.js";

// Định dạng số
const fmt = (value, digits = 2) =>
  Number(value).toLocaleString("en-US", {
    maximumFractionDigits: digits
  });

export async function sendToTelegram(wall) {
  // Trạng thái Wall
  const repeat = Number(wall.repeatCount) || 1;

  const status =
    repeat > 1
      ? `🔁 REPEAT ×${repeat}`
      : "🆕 NEW WALL";

  // BUY / SELL WALL
  const side =
    wall.side === "BUY"
      ? "🟢 BUY WALL"
      : "🔴 SELL WALL";

  // Giá Wall để hiển thị và sao chép
  const priceText = String(wall.priceText ?? wall.price);

  // Link CoinGlass Binance
  const chart =
    `https://www.coinglass.com/tv/vi/Binance_${wall.symbol}`;

  // Nội dung Telegram
  const message = [
    "🚨 BINANCE FUTURES WALL ALERT",
    "",
    `🪙 Coin: ${wall.symbol}`,
    side,
    status,
    "",
    "💰 WALL-INFORMATION",
    `💰 Giá Wall: <code>${priceText}</code>`,
    `📦 Khối lượng: ${fmt(wall.qty, 6)}`,
    `💵 Giá trị: ${fmt(wall.usdt)} USDT`,
    `📊 Gấp trung bình: ${fmt(wall.ratio)} lần`,
    `📉 Trung bình/mức: ${fmt(wall.averageUSDT)} USDT`,
    "",
    "📍 PRICE POSITION",
    `📍 Khoảng cách giá: ${
      wall.distancePercent >= 0 ? "+" : ""
    }${fmt(wall.distancePercent)}%`,
    ...(wall.depth != null
      ? [`📊 Depth: ${wall.depth}`]
      : []),
    "",
    "⚠️ Snapshot lệnh chờ, không phải giao dịch đã khớp."
  ].join("\n");

  // Nút Telegram
  
const replyMarkup = {
  inline_keyboard: [
    [
      {
        text: "📋 Copy giá Wall",
        copy_text: {
          text: priceText
        }
      },
      {
        text: "📈 Xem biểu đồ CoinGlass",
        url: chart
      }
    ]
  ]
};


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

  try {
    const { data } = await axios.post(
      url,
      {
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      },
      {
        timeout: 15000
      }
    );

    if (!data.ok) {
      throw new Error(
        data.description || "Telegram send failed"
      );
    }
  } catch (error) {
    const detail =
      error.response?.data?.description ||
      error.message;

    throw new Error(`Telegram error: ${detail}`);
  }
}
