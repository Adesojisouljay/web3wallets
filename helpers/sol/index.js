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

const connection = new Connection(clusterApiUrl("mainnet-beta"));

export async function getSolBalance(address) {
  const pubKey = new PublicKey(address);
  const lamports = await connection.getBalance(pubKey);
  return lamports / 1e9;
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
  };
}
