import { sendEth, sendErc20 } from "./eth/index.js";
import { sendSol, sendSolToken } from "./sol/index.js";
import { sendTron, sendTrc20 } from "./tron/index.js";
import { sendAptos } from "./aptos/index.js";

export async function sendCoin(chain, payload) {
  switch (chain) {
    case "ETH":
    case "BNB":
      return sendEth(payload);

    case "USDT_BEP20":
      return sendErc20({
        ...payload,
        rpcUrl: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org",
        contractAddress: "0x55d398326f99059ff775485246999027b3197955"
      });

    case "USDT_ERC20":
      return sendErc20({
        ...payload,
        rpcUrl: process.env.ETH_RPC_URL || "https://eth.drpc.org",
        contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7"
      });

    case "SOL":
      return sendSol(payload);

    case "SOL_USDT":
      return sendSolToken({
        ...payload,
        mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
      });

    case "TRON":
      return sendTron(payload);

    case "USDT_TRC20":
      return sendTrc20({
        ...payload,
        contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
      });

    case "APTOS":
      return sendAptos(payload);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
