import { ethers } from "ethers";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer, getMint } from "@solana/spl-token";
import bs58 from "bs58";
import { getWalletForChain } from "../helpers/getWallet.js";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
];

export const relayTokenTransfer = async (req, res) => {
  try {
    const { mnemonic, rpcUrl, chain, tokenAddress, recipientAddress, amount } = req.body;

    if (!mnemonic || !rpcUrl || !tokenAddress || !recipientAddress || !amount || !chain) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: mnemonic, rpcUrl, chain, tokenAddress, recipientAddress, amount"
      });
    }

    if (chain === "SOL") {
      const walletData = await getWalletForChain("SOL", mnemonic);
      const secretKey = bs58.decode(walletData.privateKey);
      const payer = Keypair.fromSecretKey(secretKey);

      const connection = new Connection(rpcUrl, "confirmed");
      const mintPublicKey = new PublicKey(tokenAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      // Get decimals
      const mintInfo = await getMint(connection, mintPublicKey);
      const formattedAmount = BigInt(amount) * BigInt(Math.pow(10, mintInfo.decimals));

      // Get or create Token Accounts for both sender and receiver
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mintPublicKey, payer.publicKey);
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mintPublicKey, recipientPublicKey);

      console.log(`[TokenRelayer] Relaying ${amount} SPL tokens to ${recipientAddress} on Solana...`);

      // Execute transfer
      const txHash = await transfer(
        connection,
        payer,
        senderTokenAccount.address,
        recipientTokenAccount.address,
        payer.publicKey,
        formattedAmount
      );

      console.log(`[TokenRelayer] Transfer successful! Hash: ${txHash}`);

      return res.status(200).json({
        success: true,
        message: "SPL Token transfer relayed successfully",
        transactionHash: txHash,
        from: payer.publicKey.toBase58(),
        to: recipientAddress,
        amount
      });
    }

    // --- EVM RELAYER ---
    // 1. Get the relayer's private key
    const walletData = await getWalletForChain("ETH", mnemonic);
    const privateKey = walletData.privateKey;
    if (!privateKey) throw new Error("Could not derive private key.");

    // 2. Connect to the specified blockchain network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 3. Connect to the ERC20 Token Contract
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // 4. Get token decimals to format the amount correctly
    const decimals = await contract.decimals();
    const formattedAmount = ethers.parseUnits(amount.toString(), decimals);

    // 5. Ensure relayer has enough token balance
    const balance = await contract.balanceOf(wallet.address);
    if (balance < formattedAmount) {
       return res.status(400).json({
         success: false,
         message: "Relayer wallet does not have enough tokens to execute this transfer."
       });
    }

    console.log(`[TokenRelayer] Relaying ${amount} tokens to ${recipientAddress} on ${rpcUrl}...`);

    // 6. Execute the transfer
    const tx = await contract.transfer(recipientAddress, formattedAmount);
    
    // 7. Wait for confirmation
    const receipt = await tx.wait();
    console.log(`[TokenRelayer] Transfer successful! Hash: ${receipt.hash}`);

    return res.status(200).json({
      success: true,
      message: "Token transfer relayed successfully",
      transactionHash: receipt.hash,
      from: wallet.address,
      to: recipientAddress,
      amount
    });

  } catch (error) {
    console.error("Token Relayer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to relay token transfer"
    });
  }
};
