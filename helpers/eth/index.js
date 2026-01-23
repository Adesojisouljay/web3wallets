import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

console.log("process.env.ETH_RPC_URL;...",process.env.ETH_RPC_URL)

if (!process.env.ETH_RPC_URL) {
  throw new Error("ETH_RPC_URL missing in environment variables");
}

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

export async function getEthBalance(address) {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

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

  const gasEstimate = await provider.estimateGas({
    from,
    to,
    value,
  });

  const feeData = await provider.getFeeData();

  const gasPrice = feeData.gasPrice;
  const gasCostWei = gasEstimate * gasPrice;

  return {
    chain: "ETH",
    gasLimit: gasEstimate.toString(),
    gasPrice: ethers.formatUnits(gasPrice, "gwei"),
    feeEth: ethers.formatEther(gasCostWei),
    feeWei: gasCostWei.toString(),
  };
}

