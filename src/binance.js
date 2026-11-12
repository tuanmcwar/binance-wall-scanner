
import axios from "axios";
import { config } from "./config.js";

const api = axios.create({
  baseURL: config.rest,
  timeout: 20000
});

export async function getSymbols() {
  const { data } = await api.get(
    "/fapi/v1/exchangeInfo"
  );

  return data.symbols
    .filter(s =>
      s.contractType === "PERPETUAL" &&
      s.status === "TRADING" &&
      s.quoteAsset === "USDT" &&
      s.marginAsset === "USDT"
    )
    .map(s => s.symbol)
    .sort();
}

export async function getDepth(symbol) {
  const { data } = await api.get(
    "/fapi/v1/depth",
    {
      params: {
        symbol,
        limit: config.depthLimit
      }
    }
  );

  return data;
}
