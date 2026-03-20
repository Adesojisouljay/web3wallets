import { estimateEthFee } from "./eth/index.js";
import { estimateSolFee } from "./sol/index.js";
import { estimateTronFee, estimateTrc20Fee } from "./tron/index.js";
import { estimateAptosFee } from "./aptos/index.js";

export async function estimateFee(chain, payload) {
  switch (chain) {
    case "ETH":
    case "BNB":
      return estimateEthFee(payload);

    case "SOL":
    case "SOL_USDT":
      return estimateSolFee(payload);

    case "TRON":
      return estimateTronFee(payload);

    case "APTOS":
      return estimateAptosFee(payload);

    case "USDT_TRC20":
      return estimateTrc20Fee(payload);

    case "BTC":
      return {
        chain: "BTC",
        fee: (250 * 2) / 100000000
      };

    case "DOGE":
      return {
        chain: "DOGE",
        fee: 1.0 // Standard minimum network fee for Dogecoin
      };

    case "LTC":
      return {
        chain: "LTC",
        fee: 0.001 // Standard minimum network fee for Litecoin
      };

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
