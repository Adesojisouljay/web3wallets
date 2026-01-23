import { sendEth } from "./eth/index.js";
import { sendSol } from "./sol/index.js";
import { sendTron } from "./tron/index.js";
import { sendAptos } from "./aptos/index.js";

export async function sendCoin(chain, payload) {
  switch (chain) {
    case "ETH":
    case "BNB":
      return sendEth(payload);

    case "SOL":
      return sendSol(payload);

    case "TRON":
      return sendTron(payload);

    case "APTOS":
      return sendAptos(payload);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
