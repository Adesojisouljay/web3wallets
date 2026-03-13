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

export async function getSolTokenBalance(address, mintAddress) {
  const pubKey = new PublicKey(address);
  const mintPubKey = new PublicKey(mintAddress);

  for (const rpc of SOLANA_RPCS) {
    try {
      const conn = new Connection(rpc, {
        commitment: "confirmed",
      });

      const response = await conn.getParsedTokenAccountsByOwner(pubKey, {
        mint: mintPubKey,
      });

      const accounts = response.value;
      if (accounts.length === 0) return 0;

      // Sum up balances if multiple accounts exist (rare for standard users)
      let totalBalance = 0;
      for (const acc of accounts) {
        totalBalance += acc.account.data.parsed.info.tokenAmount.uiAmount || 0;
      }

      return totalBalance;
    } catch (err) {
      console.warn(`[SOL Token Balance Fallback] ${rpc} failed:`, err.message);
      continue;
    }
  }

  console.error(`[SOL Token All RPCs Failed] ${address} for mint ${mintAddress}`);
  return 0; // Return 0 instead of throwing for better UX
}

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

export async function sendSolToken({ privateKey, to, amount, mintAddress }) {
  // Use a reliable RPC for sending
  const connection = new Connection(
    SOLANA_RPCS[0] || "https://api.mainnet-beta.solana.com"
  );

  const sender = Keypair.fromSecretKey(bs58.decode(privateKey));
  const mintPubKey = new PublicKey(mintAddress);
  const destPubKey = new PublicKey(to);
  const tokenProgramId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const ataProgramId = new PublicKey("ATokenGPvbdQxrXJvGfsCSGDbqzJuLS6mYGGZAKiT16");

  // Helper to find Associated Token Account
  const findAta = (owner, mint) => {
    return PublicKey.findProgramAddressSync(
      [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
      ataProgramId
    )[0];
  };

  const fromTokenAccount = findAta(sender.publicKey, mintPubKey);
  const toTokenAccount = findAta(destPubKey, mintPubKey);

  const tx = new Transaction();

  // Check if destination ATA exists, if not, create it
  try {
    const accInfo = await connection.getAccountInfo(toTokenAccount);
    if (!accInfo) {
      // Use official spl-token helper to avoid layout issues
      const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");

      tx.add(
        createAssociatedTokenAccountInstruction(
          sender.publicKey, // payer
          toTokenAccount,   // ata
          destPubKey,       // owner
          mintPubKey        // mint
        )
      );
    }
  } catch (e) {
    console.warn("Could not check/create destination ATA:", e.message);
  }

  // Token transfer instruction
  // Data layout: [instruction_index, amount_u64]
  // instruction_index 3 = Transfer (not TransferChecked)
  // For Transfer, we need 3 keys: source, destination, owner
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(3, 0);
  // USDT on SOL has 6 decimals, so amount * 1e6
  const decimals = mintAddress === "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" ? 6 : 9;
  const sunAmount = Math.floor(amount * Math.pow(10, decimals));
  instructionData.writeBigUInt64LE(BigInt(sunAmount), 1);

  const { TransactionInstruction } = await import("@solana/web3.js");
  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
        { pubkey: toTokenAccount, isSigner: false, isWritable: true },
        { pubkey: sender.publicKey, isSigner: true, isWritable: false },
      ],
      programId: tokenProgramId,
      data: instructionData,
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
