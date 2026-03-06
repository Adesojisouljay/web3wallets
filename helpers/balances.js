import { getEthBalance } from "./eth/index.js";
import { getBtcBalance } from "./btc/index.js";
import { getSolBalance } from "./sol/index.js";
import { getTronBalance, getTrc20Balance } from "./tron/index.js";
import { getAptosBalance } from "./aptos/index.js";
import { getErc20Balance } from "./eth/index.js";
import NodeCache from "node-cache";

// Initialize cache with a 3 minute Time To Live (TTL)
const balanceCache = new NodeCache({ stdTTL: 180, checkperiod: 200 });

export async function getWalletBalance(chain, address) {
  // 1. Create a unique cache key for this chain + address combination
  const cacheKey = `${chain}-${address}`;

  // 2. Check if we already have this balance cached
  const cachedBalance = balanceCache.get(cacheKey);
  if (cachedBalance !== undefined) {

    return cachedBalance;
  }

  // 3. If not in cache, fetch it from the blockchain
  let balance;
  switch (chain) {
    case "ETH":
    case "BNB":
    case "BASE":
    case "POLYGON":
    case "ARBITRUM":
      balance = await getEthBalance(address, chain);
      break;
    case "BTC":
      balance = await getBtcBalance(address);
      break;
    case "SOL":
      balance = await getSolBalance(address);
      break;
    case "TRON":
      balance = await getTronBalance(address);
      break;
    case "USDT_TRC20":
      balance = await getTrc20Balance(address);
      break;
    case "USDT_BEP20":
      balance = await getErc20Balance(address, "0x55d398326f99059fF775485246999027B3197955", "BNB");
      break;
    case "USDT_ERC20":
      balance = await getErc20Balance(address, "0xdAC17F958D2ee523a2206206994597C13D831ec7", "ETH");
      break;
    case "APTOS":
      balance = await getAptosBalance(address);
      break;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }

  // 4. Store the freshly fetched balance in the cache before returning
  balanceCache.set(cacheKey, balance);
  return balance;
}
