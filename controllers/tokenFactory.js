import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from "bs58";
import { getWalletForChain } from "../helpers/getWallet.js";

// Keep ABI and BIN loaded in memory
const ABI_PATH = path.resolve(process.cwd(), "contracts/StandardToken.abi");
const BIN_PATH = path.resolve(process.cwd(), "contracts/StandardToken.bin");

let tokenAbi = "";
let tokenBin = "";

try {
  tokenAbi = fs.readFileSync(ABI_PATH, "utf-8");
  tokenBin = fs.readFileSync(BIN_PATH, "utf-8");
} catch (error) {
  console.error("Failed to load StandardToken ABI/BIN:", error);
}

export const deployToken = async (req, res) => {
  try {
    const { mnemonic, rpcUrl, chain, name, ticker, initialSupply, decimals = 18 } = req.body;

    if (!mnemonic || !rpcUrl || !name || !ticker || !initialSupply || !chain) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: mnemonic, rpcUrl, chain, name, ticker, initialSupply"
      });
    }

    if (chain === "SOL") {
      const walletData = await getWalletForChain("SOL", mnemonic);
      const secretKey = bs58.decode(walletData.privateKey);
      const payer = Keypair.fromSecretKey(secretKey);

      const connection = new Connection(rpcUrl, "confirmed");
      const solDecimals = 9; // Solana standard token decimals

      console.log(`[TokenFactory] Deploying SPL Token on Solana (${rpcUrl})...`);

      // 1. Create Mint
      const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, solDecimals);

      // 2. Create Associated Token Account for payer
      const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);

      // 3. Mint initial supply
      const amount = BigInt(initialSupply) * BigInt(Math.pow(10, solDecimals));
      const txHash = await mintTo(connection, payer, mint, tokenAccount.address, payer, amount);

      console.log(`[TokenFactory] Solana Mint created: ${mint.toBase58()}`);

      return res.status(200).json({
        success: true,
        message: "SPL Token deployed successfully",
        contractAddress: mint.toBase58(),
        deployerAddress: payer.publicKey.toBase58(),
        transactionHash: txHash
      });
    }

    // --- EVM DEPLOYMENT ---
    if (!tokenAbi || !tokenBin) {
      return res.status(500).json({
        success: false,
        message: "Server missing smart contract build files."
      });
    }

    // 1. Get the deployer's private key
    const walletData = await getWalletForChain("ETH", mnemonic);
    const privateKey = walletData.privateKey;
    if (!privateKey) throw new Error("Could not derive private key.");

    // 2. Connect to the specified blockchain network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 3. Setup Contract Factory
    const factory = new ethers.ContractFactory(tokenAbi, tokenBin, wallet);

    console.log(`[TokenFactory] Deploying ${name} (${ticker}) on ${rpcUrl}...`);

    // 4. Deploy the Contract (passing constructor args)
    const contract = await factory.deploy(name, ticker, initialSupply, decimals);
    
    // Wait for the transaction to be mined
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`[TokenFactory] Deployed successfully at: ${contractAddress}`);

    return res.status(200).json({
      success: true,
      message: "Token deployed successfully",
      contractAddress,
      deployerAddress: wallet.address,
      transactionHash: contract.deploymentTransaction().hash
    });

  } catch (error) {
    console.error("Token Deployment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to deploy token"
    });
  }
};
