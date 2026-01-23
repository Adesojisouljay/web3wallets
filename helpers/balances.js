import { getEthBalance } from "./eth/index.js";
import { getBtcBalance } from "./btc/index.js";
import { getSolBalance } from "./sol/index.js";
import { getTronBalance } from "./tron/index.js";
import { getAptosBalance } from "./aptos/index.js";

export async function getWalletBalance(chain, address) {
  switch (chain) {
    case "ETH":
      return getEthBalance(address);
    case "BNB":
      return getEthBalance(address);
    case "BTC":
      return getBtcBalance(address);
    case "SOL":
      return getSolBalance(address);
    case "TRON":
      return getTronBalance(address);
    case "APTOS":
      return getAptosBalance(address);
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
