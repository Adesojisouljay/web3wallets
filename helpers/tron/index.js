import dotenv from "dotenv";
dotenv.config();

import TronWeb from "tronweb";
import axios from "axios";

const TRON_RPCS = [
  process.env.TRON_RPC_URL,
  "https://api.trongrid.io",
  "https://api.trongrid.io", // Duplicate for intentional retry or use another
  "https://tron.blockpi.network/v1/rpc/public",
  "https://api.tronstack.io"
].filter(Boolean);

/**
 * Helper to get a TronWeb instance with fallback support
 */
async function getTronWebInstance() {
  for (const rpc of TRON_RPCS) {
    try {
      const tw = new TronWeb({ fullHost: rpc });
      // Quick check if RPC is responsive
      await Promise.race([
        tw.trx.getCurrentBlock(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("RPC Timeout")), 3000))
      ]);
      return tw;
    } catch (err) {
      console.warn(`[TRON RPC Fallback] ${rpc} failed:`, err.message);
      continue;
    }
  }
  throw new Error("All TRON RPCs failed");
}

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
  const tw = new TronWeb({
    fullHost: TRON_RPCS[0] || "https://api.trongrid.io",
    privateKey: privateKey
  });

  const tx = await tw.trx.sendTransaction(
    to,
    amount * 1e6
  );

  if (!tx || tx.result === false) {
    throw new Error(tx?.message || "TRON transaction failed");
  }

  return {
    hash: tx.txid,
    chain: "TRON",
  };
}

export async function estimateTronFee({ from, to }) {
  try {
    const tw = await getTronWebInstance();

    // 1. Check if recipient account exists/is activated
    // If account doesn't exist, it costs ~1.1 TRX to activate
    let activationFee = 0;
    try {
      const account = await tw.trx.getAccount(to);
      if (!account || !account.address) {
        activationFee = 1.1; // Standard activation fee in TRX
      }
    } catch (e) {
      // If error or not found, assume needs activation
      activationFee = 1.1;
    }

    const accountResources = await tw.trx.getAccountResources(from);

    // Total free bandwidth
    const freeBandwidth = (accountResources.freeNetLimit || 0) + (accountResources.NetLimit || 0);
    const usedBandwidth = (accountResources.freeNetUsed || 0) + (accountResources.NetUsed || 0);
    const availableBandwidth = freeBandwidth - usedBandwidth;

    // A standard Tron transfer takes roughly 300 bandwidth.
    // If not enough bandwidth, Tron burns ~0.002 TRX per bandwidth (approx 0.3 TRX total).
    // However, if it's a new account, the cost is much higher (1.1 TRX total burn).

    let feeTrx = 0;
    
    // Add activation fee if required (Bandwidth NEVER covers account activation)
    if (activationFee > 0) {
        feeTrx += activationFee;
    }

    // Add bandwidth penalty if the user lacks free net resources
    if (availableBandwidth < 350) {
        feeTrx += 0.3;
    }

    // Safety buffer
    if (feeTrx > 0 && feeTrx < 1.1) feeTrx = 1.1;

    return {
      chain: "TRON",
      model: "bandwidth",
      freeBandwidth: availableBandwidth,
      requiresActivation: activationFee > 0,
      fee: feeTrx,
    };
  } catch (err) {
    console.error("[estimateTronFee] Error:", err);
    return {
      chain: "TRON",
      fee: 1.1, // Safe fallback
    };
  }
}

export async function estimateTrc20Fee({ from, to, amount, contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }) {
  try {
    const tw = await getTronWebInstance();
    const ownerHex = tw.address.toHex(from);
    const contractHex = tw.address.toHex(contractAddress);
    const toHex = tw.address.toHex(to);
    const amountInt = Math.floor(Number(amount || 0) * 1e6); // 6 decimals
    
    // Simulate the smart contract execution
    const tx = await tw.transactionBuilder.triggerConstantContract(
      contractHex,
      "transfer(address,uint256)",
      {},
      [
        { type: "address", value: toHex },
        { type: "uint256", value: amountInt }
      ],
      ownerHex
    );
    
    // energy_used represents the energy consumed (often ~31895 or ~64895)
    let energyUsed = tx.energy_used || 65000;
    
    // Fallback if TronGrid suppresses energy_used on failure
    if (energyUsed === 0) energyUsed = 65000;
    
    // Fetch user's staked/rented Energy and Bandwidth
    const accountResources = await tw.trx.getAccountResources(ownerHex);
    const availableEnergy = (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0);
    const availableBandwidth = ((accountResources.freeNetLimit || 0) + (accountResources.NetLimit || 0)) - ((accountResources.freeNetUsed || 0) + (accountResources.NetUsed || 0));
    
    // Subtract completely free energy from the consumed amount
    const billableEnergy = Math.max(0, energyUsed - availableEnergy);
    
    let feeTrx;
    let realFee = feeTrx;
    const feeeKeyPresent = !!process.env.FEEE_API_KEY;
    if (feeeKeyPresent) {
      // Feee.io rental cost is significantly cheaper (~50-80 sun per energy vs 420)
      // The system sponsors this cost, so we return 0 to the frontend to prevent balance blocks
      realFee = (billableEnergy * 80) / 1e6; // Actual cost in TRX
      feeTrx = 0;
    } else {
      // TRON network currently charges ~420 sun per 1 energy
      const energyFeeInSun = billableEnergy * 420;
      feeTrx = energyFeeInSun / 1e6;
      realFee = feeTrx;
    }
    
    // Account for bandwidth (approx 345 bandwidth per TRC20 transfer)
    // If not enough bandwidth, it burns ~0.35 TRX. 
    // If sponsored, we'll assume free daily bandwidth (600) covers it for the user.
    if (!process.env.FEEE_API_KEY && availableBandwidth < 350) {
      feeTrx += 1.0;
      realFee += 1.0;
    }
    
    // Cap at a reasonable max to avoid scary UI bugs
    if (feeTrx > 50) feeTrx = 50;
    if (realFee > 50) realFee = 50;
    
    return {
      chain: "USDT_TRC20",
      fee: feeTrx,
      displayFee: realFee,
      energyUsed,
      sponsored: !!process.env.FEEE_API_KEY
    };
  } catch (err) {
    console.error("[estimateTrc20Fee] Error:", err.message);
    return {
      chain: "USDT_TRC20",
      fee: 28.5, // Realistic fallback if simulation fails
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


export async function rentTronEnergy({ receiveAddress, energyAmount }) {
  try {
    const url = 'https://feee.io/open/v2/order/submit';
    
    // Request minimum of 32,000 energy as typical TRC20 needs 32k or 65k
    // Feee.io has minimums, usually 32000
    const safeAmount = Math.max(32000, Math.ceil(energyAmount));

    const payload = {
      resource_type: 1, // 1 for Energy
      receive_address: receiveAddress,
      resource_value: safeAmount,
      rent_duration: 1, // Rent for 1 hour
      rent_time_unit: "h"
    };

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'sovra-bot',
      'key': process.env.FEEE_API_KEY
    };

    const response = await axios.post(url, payload, { headers });
    const data = response.data;
    
    if (data.code !== 0) {
      throw new Error(`Feee.io API Error: ${data.msg}`);
    }
    
    console.log(`[Feee.io] Rented ${safeAmount} energy for ${receiveAddress}. Cost: ${data.data.pay_amount} TRX. Order NO: ${data.data.order_no}`);
    return data.data; // Includes pay_amount which is the actual TRX cost
  } catch (err) {
    console.error("[Feee.io rentTronEnergy] Error:", err.response ? err.response.data : err.message);
    throw err;
  }
}

export async function ensureTronEnergy(address) {
  if (!process.env.FEEE_API_KEY) return;
  
  try {
    const tw = await getTronWebInstance();
    const ownerHex = tw.address.toHex(address);
    const accountResources = await tw.trx.getAccountResources(ownerHex);
    
    const availableEnergy = (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0);
    
    // Most TRC20 transfers require ~32000 or ~65000 energy. We'll target having at least 65,000 to be safe.
    if (availableEnergy < 65000) {
      const needed = 65000 - availableEnergy;
      console.log(`[ensureTronEnergy] Account ${address} has ${availableEnergy} energy. Need ${needed} more. Renting from Feee.io...`);
      await rentTronEnergy({ receiveAddress: address, energyAmount: needed });
      
      // Wait for a few seconds to let the energy network sync
      // It typically arrives within a minute, but 5 seconds is a standard buffer TRON propagates quickly.
      await new Promise(r => setTimeout(r, 6000));
    }
  } catch (err) {
    console.error(`[ensureTronEnergy] Failed to ensure energy for ${address}:`, err.message);
    // Don't throw, let the transaction try to broadcast anyway
  }
}

export async function sendTrc20({ privateKey, to, amount, contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }) {
    const tw = new TronWeb({
        fullHost: TRON_RPCS[0] || "https://api.trongrid.io",
        privateKey: privateKey
    });

    const ownerAddress = tw.address.fromPrivateKey(privateKey);
    await ensureTronEnergy(ownerAddress);

    const contract = await tw.contract().at(contractAddress);
    const decimals = await contract.decimals().call();
    const amountInt = Math.floor(Number(amount) * Math.pow(10, Number(decimals)));

    const tx = await contract.transfer(to, amountInt).send();

    return {
        hash: tx,
        chain: "USDT_TRC20"
    };
}
