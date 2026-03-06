// import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

const SOLANA_RPCS = [
  process.env.SOL_RPC_URL,
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://rpc.ankr.com/solana",
  "https://solana.publicnode.com"
].filter(Boolean);

export async function getSolBalance(address) {
  const pubKey = new PublicKey(address);

  for (const rpc of SOLANA_RPCS) {
    try {
      const conn = new Connection(rpc, {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 15000
      });

      const lamports = await Promise.race([
        conn.getBalance(pubKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
      ]);

      const solBalance = lamports / 1e9;
      return solBalance;
    } catch (err) {
      console.warn(`[SOL Balance Fallback] ${rpc} failed:`, err.message);
      continue;
    }
  }

  console.error(`[SOL All RPCs Failed] ${address}`);
  throw new Error("All RPCs failed");
}

export async function sendSol({ privateKey, to, amount }) {
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com"
  );

  const sender = Keypair.fromSecretKey(bs58.decode(privateKey));

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: new PublicKey(to),
      lamports: amount * 1e9,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [sender]
  );

  return {
    hash: signature,
    chain: "SOL",
  };
}

export async function estimateSolFee() {
  // Solana fees are mostly flat
  const feeLamports = 5000; // typical transfer fee
  return {
    chain: "SOL",
    feeSol: feeLamports / 1e9,
    feeLamports,
    fee: feeLamports / 1e9,
  };
}
