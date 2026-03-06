import { TronWeb } from "tronweb";

const TRON_RPCS = [
  process.env.TRON_RPC_URL,
  "https://api.trongrid.io",
  "https://api.trongrid.io", // Duplicate for intentional retry or use another
  "https://tron.blockpi.network/v1/rpc/public",
  "https://api.tronstack.io"
].filter(Boolean);

export async function getTronBalance(address) {
  for (const rpc of TRON_RPCS) {
    try {
      const tw = new TronWeb({ fullHost: rpc });
      const sun = await Promise.race([
        tw.trx.getBalance(address),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
      ]);
      const balanceTrx = sun / 1e6;
      return balanceTrx;
    } catch (err) {
      console.warn(`[TRON Balance Fallback] ${rpc} failed:`, err.message);
      continue;
    }
  }
  console.error(`[TRON All RPCs Failed] ${address}`);
  throw new Error("All RPCs failed");
}

export async function sendTron({ privateKey, to, amount }) {
  tronWeb.setPrivateKey(privateKey);

  const tx = await tronWeb.trx.sendTransaction(
    to,
    amount * 1e6
  );

  return {
    hash: tx.txid,
    chain: "TRON",
  };
}

export async function estimateTronFee({ from }) {
  try {
    const tw = new TronWeb({ fullHost: process.env.TRON_RPC_URL || "https://api.trongrid.io" });
    const accountResources = await tw.trx.getAccountResources(from);

    // Total free bandwidth
    const freeBandwidth = (accountResources.freeNetLimit || 0) + (accountResources.NetLimit || 0);
    const usedBandwidth = (accountResources.freeNetUsed || 0) + (accountResources.NetUsed || 0);
    const availableBandwidth = freeBandwidth - usedBandwidth;

    // A standard Tron transfer takes roughly 300 bandwidth.
    // If not enough bandwidth, Tron burns ~0.001 TRX per bandwidth. (So ~0.3 TRX).
    // Using 1.1 TRX is a standard conservative estimate for Tron networks to be safe.
    let feeTrx = 1.1;

    if (availableBandwidth > 300) {
      feeTrx = 0;
    }

    return {
      chain: "TRON",
      model: "bandwidth",
      freeBandwidth: availableBandwidth,
      fee: feeTrx,
    };
  } catch (err) {
    return {
      chain: "TRON",
      fee: 1.1, // Safe fallback
    };
  }
}

const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "_decimals", type: "uint256" }],
    type: "function",
  },
];

export async function getTrc20Balance(address, contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t") {
  if (!address || typeof address !== "string") return 0;

  for (const rpc of TRON_RPCS) {
    try {
      const tw = new TronWeb({ fullHost: rpc });

      // Fix: Ensure both address and contract address are in hex format for low-level trigger
      const ownerHex = tw.address.toHex(address);
      const contractHex = tw.address.toHex(contractAddress);

      const parameter = [
        { type: "address", value: ownerHex }
      ];

      const { constant_result } = await Promise.race([
        tw.transactionBuilder.triggerSmartContract(
          contractHex,
          "balanceOf(address)",
          { sha3: true },
          parameter,
          ownerHex // Fix: Provide issuerAddress as the 5th parameter to prevent 'owner_address isn't set' error
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
      ]);

      if (!constant_result || !constant_result[0]) {
        console.warn(`[TRC20 Fallback] Empty result from ${rpc}`);
        continue;
      }

      const balance = tw.toBigNumber("0x" + constant_result[0]);
      const decimals = contractAddress === "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" ? 6 : 18;
      const formatted = Number(balance) / Math.pow(10, decimals);

      return formatted;
    } catch (err) {
      console.warn(`[TRC20 Fallback] ${contractAddress} on ${rpc} failed:`, err.message);
      continue;
    }
  }

  console.error(`[TRC20 All RPCs Failed] ${contractAddress} for ${address}`);
  throw new Error("All RPCs failed");
}
