import axios from "axios";
import NodeCache from "node-cache";

// Initialize cache with a 5 minute Time To Live (TTL) for prices
const priceCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

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
  SOL_USDT: "tether",
};

export async function getPrices(chains = []) {
  const ids = chains
    .map((c) => COINGECKO_IDS[c])
    .filter(Boolean)
    .join(",");

  if (!ids) return {};

  const cacheKey = `prices-${ids}`;
  const cachedData = priceCache.get(cacheKey);

  if (cachedData) {

    return cachedData;
  }

  const url = "https://api.coingecko.com/api/v3/simple/price";

  let data = {};
  try {
    const response = await axios.get(url, {
      params: {
        ids,
        vs_currencies: "usd",
        include_24hr_change: true,
      },
      timeout: 15000,
    });
    data = response.data;
  } catch (err) {
    console.warn("Price fetch failed or rate limited:", err.message);
    // If request fails but we have a slightly older cached version, we could return it here.
    // For now, return empty as before.
    return {};
  }

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

  // Store the fetched and normalized prices in the cache for 5 minutes
  priceCache.set(cacheKey, prices);

  return prices;
}
