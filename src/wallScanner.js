
import { config } from "./config.js";

function parseLevels(rawLevels) {
  if (!Array.isArray(rawLevels)) {
    return [];
  }

  return rawLevels
    .map(([price, quantity]) => ({
      price: Number(price),
      qty: Number(quantity),
      usdt: Number(price) * Number(quantity)
    }))
    .filter(level =>
      Number.isFinite(level.price) &&
      Number.isFinite(level.qty) &&
      Number.isFinite(level.usdt) &&
      level.price > 0 &&
      level.qty > 0 &&
      level.usdt > 0
    );
}

function detectWalls(levels, side, midPrice) {
  const range = config.rangePercent / 100;

  const minPrice = midPrice * (1 - range);
  const maxPrice = midPrice * (1 + range);

  const nearby = levels.filter(level =>
    level.price >= minPrice &&
    level.price <= maxPrice
  );

  if (nearby.length < config.minLevels) {
    return [];
  }

  const totalUSDT = nearby.reduce(
    (sum, level) => sum + level.usdt,
    0
  );

  const walls = [];

  for (const level of nearby) {
    if (level.usdt < config.minUSDT) {
      continue;
    }

    const remainingCount = nearby.length - 1;

    if (remainingCount <= 0) {
      continue;
    }

    // Loại trừ chính Wall đang xét
    // khỏi giá trị trung bình.
    const remainingUSDT =
      totalUSDT - level.usdt;

    if (remainingUSDT <= 0) {
      continue;
    }

    const averageUSDT =
      remainingUSDT / remainingCount;

    if (averageUSDT <= 0) {
      continue;
    }

    const ratio =
      level.usdt / averageUSDT;

    if (ratio >= config.multiplier) {
      walls.push({
        side,
        price: level.price,
        qty: level.qty,
        usdt: level.usdt,
        ratio,
        averageUSDT,
        distancePercent:
          ((level.price - midPrice) / midPrice) *
          100
      });
    }
  }

  return walls;
}

export function scanWalls(symbol, snapshot) {
  if (
    !snapshot ||
    !Array.isArray(snapshot.bids) ||
    !Array.isArray(snapshot.asks)
  ) {
    return [];
  }

  const bids = parseLevels(snapshot.bids);
  const asks = parseLevels(snapshot.asks);

  if (!bids.length || !asks.length) {
    return [];
  }

  const bestBid = Math.max(
    ...bids.map(level => level.price)
  );

  const bestAsk = Math.min(
    ...asks.map(level => level.price)
  );

  if (
    !Number.isFinite(bestBid) ||
    !Number.isFinite(bestAsk) ||
    bestBid >= bestAsk
  ) {
    return [];
  }

  const midPrice =
    (bestBid + bestAsk) / 2;

  return [
    ...detectWalls(bids, "BUY", midPrice),
    ...detectWalls(asks, "SELL", midPrice)
  ]
    .map(wall => ({
      ...wall,
      symbol,
      bestBid,
      bestAsk,
      midPrice,
      rangePercent: config.rangePercent
    }))
    .sort((a, b) => b.ratio - a.ratio);
}
