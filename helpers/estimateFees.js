import { estimateEthFee } from "./eth/index.js";
import { estimateSolFee } from "./sol/index.js";
import { estimateTronFee } from "./tron/index.js";
import { estimateAptosFee } from "./aptos/index.js";

export async function estimateFee(chain, payload) {
  switch (chain) {
    case "ETH":
    case "BNB":
      return estimateEthFee(payload);

    case "SOL":
      return estimateSolFee(payload);

    case "TRON":
      return estimateTronFee(payload);

    case "APTOS":
      return estimateAptosFee(payload);

    case "BTC":
      return {
        chain: "BTC",
        fee: (250 * 2) / 100000000
      };

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
