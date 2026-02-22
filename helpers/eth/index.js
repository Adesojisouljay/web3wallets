import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

console.log("process.env.ETH_RPC_URL;...", process.env.ETH_RPC_URL)

if (!process.env.ETH_RPC_URL) {
  throw new Error("ETH_RPC_URL missing in environment variables");
}

export async function getEthBalance(address, rpcUrl = process.env.ETH_RPC_URL) {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const balanceWei = await provider.getBalance(address);
  console.log(ethers.formatEther(balanceWei))
  return Number(ethers.formatEther(balanceWei));
}

export async function sendEth({ rpcUrl, privateKey, to, amount }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const value = ethers.parseEther(amount.toString());

  // 1. Get balance
  const balance = await provider.getBalance(wallet.address);

  // 2. Estimate gas
  const gasEstimate = await provider.estimateGas({
    from: wallet.address,
    to,
    value,
  });

  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * feeData.gasPrice;

  // 3. Balance check
  if (balance < value + gasCost) {
    throw new Error(
      `Insufficient ETH. Need at least ${ethers.formatEther(
        value + gasCost
      )} ETH (amount + gas)`
    );
  }

  // 4. Send tx
  const tx = await wallet.sendTransaction({
    to,
    value,
    gasLimit: gasEstimate,
    gasPrice: feeData.gasPrice,
  });

  return {
    hash: tx.hash,
    from: wallet.address,
    to,
    amount,
    gasUsed: gasEstimate.toString(),
    chain: "ETH",
  };
}

export async function estimateEthFee({ rpcUrl, from, to, amount }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const value = ethers.parseEther(amount.toString());

  let gasEstimate;
  try {
    gasEstimate = await provider.estimateGas({
      from,
      to,
      value,
    });
  } catch (err) {
    // Fallback for empty wallets or tricky RPCs: Standard ETH/BNB transfer is 21k gas
    console.warn("Gas estimation failed, using fallback:", err.message);
    gasEstimate = 21000n;
  }

  const feeData = await provider.getFeeData();

  const gasPrice = feeData.gasPrice || 2000000000n; // Default to 2 gwei if fetch fails
  const gasCostWei = gasEstimate * gasPrice;

  return {
    chain: rpcUrl.includes("bsc") || rpcUrl.includes("binance") ? "BNB" : "ETH",
    gasLimit: gasEstimate.toString(),
    gasPrice: ethers.formatUnits(gasPrice, "gwei"),
    fee: Number(ethers.formatEther(gasCostWei)), // Added simple numeric fee for frontend
    feeEth: ethers.formatEther(gasCostWei),
    feeWei: gasCostWei.toString(),
  };
}

export async function getErc20Balance(address, contractAddress, rpcUrl = process.env.ETH_RPC_URL) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const abi = ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals()
    ]);

    return Number(ethers.formatUnits(balance, decimals));
  } catch (err) {
    console.error(`ERC20 balance error for ${contractAddress} on ${rpcUrl}:`, err.message);
    return 0;
  }
}
