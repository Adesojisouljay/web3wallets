import { getEthBalance } from "./eth/index.js";
import { getBtcBalance } from "./btc/index.js";
import { getSolBalance } from "./sol/index.js";
import { getTronBalance, getTrc20Balance } from "./tron/index.js";
import { getAptosBalance } from "./aptos/index.js";
import { getErc20Balance } from "./eth/index.js";

export async function getWalletBalance(chain, address) {
  switch (chain) {
    case "ETH":
      return getEthBalance(address, process.env.ETH_RPC_URL);
    case "BNB":
      return getEthBalance(address, process.env.BNB_RPC_URL);
    case "BASE":
      return getEthBalance(address, process.env.BASE_RPC_URL || "https://mainnet.base.org");
    case "POLYGON":
      return getEthBalance(address, process.env.POLYGON_RPC_URL || "https://polygon-rpc.com");
    case "ARBITRUM":
      return getEthBalance(address, process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc");
    case "BTC":
      return getBtcBalance(address);
    case "SOL":
      return getSolBalance(address);
    case "TRON":
      return getTronBalance(address);
    case "USDT_TRC20":
      return getTrc20Balance(address);
    case "USDT_BEP20":
      return getErc20Balance(address, "0x55d398326f99059fF775485246999027B3197955", process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/");
    case "USDT_ERC20":
      return getErc20Balance(address, "0xdAC17F958D2ee523a2206206994597C13D831ec7", process.env.ETH_RPC_URL || "https://rpc.ankr.com/eth");
    case "APTOS":
      return getAptosBalance(address);
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
