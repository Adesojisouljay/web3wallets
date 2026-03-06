import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

console.log("process.env.ETH_RPC_URL;...", process.env.ETH_RPC_URL)

if (!process.env.ETH_RPC_URL) {
  console.warn("ETH_RPC_URL missing in environment variables, using fallback.");
}

import axios from "axios";

const RPC_LISTS = {
  ETH: [
    process.env.ETH_RPC_URL,
    "https://eth.drpc.org",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com"
  ].filter(Boolean),
  BASE: [
    process.env.BASE_RPC_URL,
    "https://base.drpc.org",
    "https://base.llamarpc.com",
    "https://mainnet.base.org"
  ].filter(Boolean),
  BNB: [
    process.env.BNB_RPC_URL,
    "https://bsc.drpc.org",
    "https://binance.llamarpc.com",
    "https://bsc-dataseed.binance.org",
    "https://rpc.ankr.com/bsc"
  ].filter(Boolean),
  POLYGON: [
    process.env.POLYGON_RPC_URL,
    "https://polygon.drpc.org",
    "https://polygon.llamarpc.com",
    "https://polygon-rpc.com"
  ].filter(Boolean),
  ARBITRUM: [
    process.env.ARBITRUM_RPC_URL,
    "https://arbitrum.drpc.org",
    "https://arbitrum.llamarpc.com",
    "https://arb1.arbitrum.io/rpc"
  ].filter(Boolean)
};

async function tryRpc(rpcUrl, payload, timeout = 15000) {
  try {
    const { data } = await axios.post(rpcUrl, payload, { timeout });
    if (data && data.result !== undefined) return data.result;
    if (data && data.error) throw new Error(data.error.message);
    throw new Error("Invalid RPC response");
  } catch (err) {
    throw new Error(`RPC ${rpcUrl} failed: ${err.message}`);
  }
}

export async function getEthBalance(address, chain = "ETH") {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  const rpcs = RPC_LISTS[chain] || RPC_LISTS.ETH;
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [address, "latest"]
  };

  for (const rpc of rpcs) {
    try {
      const result = await tryRpc(rpc, payload);
      const balanceEth = ethers.formatEther(BigInt(result));
      return Number(balanceEth);
    } catch (err) {
      console.warn(`[${chain} Balance Fallback] ${rpc} failed:`, err.message);
      continue;
    }
  }

  console.error(`[${chain} All RPCs Failed] ${address}`);
  throw new Error("All RPCs failed");
}

export async function getErc20Balance(address, contractAddress, chain = "ETH") {
  const rpcs = RPC_LISTS[chain] || RPC_LISTS.ETH;
  const abi = new ethers.Interface([
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ]);

  const balanceData = abi.encodeFunctionData("balanceOf", [address]);
  const decimalsData = abi.encodeFunctionData("decimals");

  const knownDecimals = {
    "0x55d398326f99059ff775485246999027b3197955": 18, // USDT BNB
    "0xdac17f958d2ee523a2206206994597c13d831ec7": 6  // USDT ETH
  };
  const cachedDecimals = knownDecimals[contractAddress.toLowerCase()];

  for (const rpc of rpcs) {
    try {
      let balanceRes, decimalsRes;

      // Optimization: Prevent making simultaneous 2x RPC calls for known stablecoins. 
      // Simultaneous calls frequently trigger rate limits on public RPCs like Ankr and LlamaRPC.
      if (cachedDecimals !== undefined) {
        balanceRes = await tryRpc(rpc, {
          jsonrpc: "2.0",
          id: 2,
          method: "eth_call",
          params: [{ to: contractAddress, data: balanceData }, "latest"]
        });
      } else {
        [balanceRes, decimalsRes] = await Promise.all([
          tryRpc(rpc, {
            jsonrpc: "2.0",
            id: 2,
            method: "eth_call",
            params: [{ to: contractAddress, data: balanceData }, "latest"]
          }),
          tryRpc(rpc, {
            jsonrpc: "2.0",
            id: 3,
            method: "eth_call",
            params: [{ to: contractAddress, data: decimalsData }, "latest"]
          })
        ]);
      }

      const balance = abi.decodeFunctionResult("balanceOf", balanceRes)[0];
      const decimals = cachedDecimals !== undefined ? cachedDecimals : abi.decodeFunctionResult("decimals", decimalsRes)[0];
      const formatted = Number(ethers.formatUnits(balance, decimals));

      return formatted;
    } catch (err) {
      console.warn(`[ERC20 ${chain} Fallback] ${contractAddress} on ${rpc} failed:`, err.message);
      continue;
    }
  }

  console.error(`[ERC20 ${chain} All RPCs Failed] ${contractAddress} for ${address}`);
  throw new Error("All RPCs failed");
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
