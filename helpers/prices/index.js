import axios from "axios";

const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  TRON: "tron",
  APTOS: "aptos",
  BASE: "ethereum",
  POLYGON: "matic-network",
  ARBITRUM: "ethereum",
  USDT_TRC20: "tether",
  USDT_BEP20: "tether",
  USDT_ERC20: "tether",
};

export async function getPrices(chains = []) {
  const ids = chains
    .map((c) => COINGECKO_IDS[c])
    .filter(Boolean)
    .join(",");

  if (!ids) return {};

  const url = "https://api.coingecko.com/api/v3/simple/price";

  const { data } = await axios.get(url, {
    params: {
      ids,
      vs_currencies: "usd",
      include_24hr_change: true,
    },
  });

  // Normalize back to chain symbols
  const prices = {};

  for (const [chain, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]) {
      prices[chain] = {
        usd: data[id].usd,
        change24h: data[id].usd_24h_change,
      };
    }
  }

  return prices;
}
