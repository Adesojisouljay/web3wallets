import { createWalletKeys, MoneroNetworkType } from "monero-ts";
import * as cryptoLib from "@okxweb3/crypto-lib";
import * as bip39 from "bip39";
import fs from "fs";

/**
 * Derives Monero wallet keys and address from a standard BIP-39 mnemonic.
 * Uses BIP-44 path m/44'/128'/0'/0/0 to obtain a 32-byte seed scalar for the private spend key.
 */
export async function getXmrWallet(mnemonic) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = cryptoLib.bip32.fromSeed(seed);
  const child = root.derivePath("m/44'/128'/0'/0/0");
  const privateSpendKey = child.privateKey.toString("hex");

  const wallet = await createWalletKeys({
    networkType: MoneroNetworkType.MAINNET,
    privateSpendKey,
  });

  const address = await wallet.getPrimaryAddress();
  const publicSpendKey = await wallet.getPublicSpendKey();
  const publicViewKey = await wallet.getPublicViewKey();
  const privateViewKey = await wallet.getPrivateViewKey();
  const moneroSeed = await wallet.getSeed();

  return {
    address,
    publicKey: publicSpendKey,
    publicSpendKey,
    publicViewKey,
    privateKey: privateSpendKey,
    privateSpendKey,
    privateViewKey,
    moneroSeed,
  };
}

/**
 * Derives Monero wallet at a specific index.
 */
export async function getXmrWalletAtIndex(mnemonic, index = 0) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = cryptoLib.bip32.fromSeed(seed);
  const child = root.derivePath(`m/44'/128'/0'/0/${index}`);
  const privateSpendKey = child.privateKey.toString("hex");

  const wallet = await createWalletKeys({
    networkType: MoneroNetworkType.MAINNET,
    privateSpendKey,
  });

  const address = await wallet.getPrimaryAddress();
  const publicSpendKey = await wallet.getPublicSpendKey();
  const publicViewKey = await wallet.getPublicViewKey();
  const privateViewKey = await wallet.getPrivateViewKey();
  const moneroSeed = await wallet.getSeed();

  return {
    address,
    publicKey: publicSpendKey,
    publicSpendKey,
    publicViewKey,
    privateKey: privateSpendKey,
    privateSpendKey,
    privateViewKey,
    moneroSeed,
  };
}

export const XMR_NODE_POOL = [
  "http://nodes.hashvault.pro:18081",
  "http://node.sethforprivacy.com:18089",
  "http://xmr-node.cakewallet.com:18081",
];

const lastConfirmedBalanceMap = new Map();
const cumulativeTransfersMap = new Map();

/**
 * Returns the fastest responsive daemon RPC from the pool.
 */
export async function getFastestXmrDaemon(connectToDaemonRpc) {
  const candidateUrls = process.env.XMR_RPC_URL
    ? [process.env.XMR_RPC_URL, ...XMR_NODE_POOL.filter(u => u !== process.env.XMR_RPC_URL)]
    : XMR_NODE_POOL;

  for (const url of candidateUrls) {
    try {
      const daemon = await Promise.race([
        connectToDaemonRpc(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout connecting to daemon")), 4000))
      ]);
      const height = await Promise.race([
        daemon.getHeight(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout getting height")), 3000))
      ]);
      if (height && height > 0) {
        return { daemon, height, rpcUrl: url };
      }
    } catch (e) {
      console.warn(`[XMR] Node ${url} check failed (${e.message}), trying next candidate...`);
    }
  }
  throw new Error("All XMR daemon nodes in pool failed to respond");
}

/**
 * Fetches Monero wallet balance.
 * Uses resilient Monero daemon RPC pool with private view key scanning.
 */
export async function getXmrBalance(address, viewKey = null, customRestoreHeight = null, spendKey = null) {
  try {
    if (!viewKey && !spendKey) {
      // Monero balances cannot be scanned from the blockchain without at least a private view key
      return lastConfirmedBalanceMap.has(address) ? {
        balance: lastConfirmedBalanceMap.get(address),
        incomingTransfers: cumulativeTransfersMap.get(address) || []
      } : null;
    }

    const { createWalletFull, MoneroNetworkType, connectToDaemonRpc } = await import("monero-ts");

    let daemon;
    let daemonHeight = 0;
    let rpcUrl = XMR_NODE_POOL[0];

    try {
      const daemonInfo = await getFastestXmrDaemon(connectToDaemonRpc);
      daemon = daemonInfo.daemon;
      daemonHeight = daemonInfo.height;
      rpcUrl = daemonInfo.rpcUrl;
    } catch (daemonErr) {
      console.warn("[XMR] Could not connect to any daemon:", daemonErr.message);
      if (lastConfirmedBalanceMap.has(address)) {
        return {
          balance: lastConfirmedBalanceMap.get(address),
          incomingTransfers: cumulativeTransfersMap.get(address) || []
        };
      }
      return null;
    }

    // Default scan window: last 2000 blocks (~2.8 days)
    const restoreHeight = customRestoreHeight ? Math.max(0, customRestoreHeight) : Math.max(0, daemonHeight - 2000);

    console.log(`[XMR] Syncing ${address.slice(0, 8)}... from height ${restoreHeight} via ${rpcUrl} (daemon height: ${daemonHeight}, mode: ${spendKey ? 'spend-key/key-images' : 'view-only'})`);
    const walletConfig = {
      networkType: MoneroNetworkType.MAINNET,
      server: rpcUrl,
      restoreHeight: restoreHeight,
    };

    if (spendKey) {
      walletConfig.privateSpendKey = spendKey;
    } else {
      walletConfig.primaryAddress = address;
      walletConfig.privateViewKey = viewKey;
    }

    const wallet = await createWalletFull(walletConfig);

    try {
      await wallet.sync();
      // Use account index 0 to avoid cross-category duplicate counting
      const balance = await wallet.getBalance(0);
      const numBal = balance ? Number(balance.toString()) / 1e12 : 0;

      let incomingTransfers = [];
      try {
        const transfers = await wallet.getIncomingTransfers();
        incomingTransfers = (transfers || []).map((t) => {
          const tx = typeof t.getTx === "function" ? t.getTx() : null;
          return {
            amount: t.getAmount ? Number(t.getAmount().toString()) / 1e12 : 0,
            hash: tx && typeof tx.getHash === "function" ? tx.getHash() : null,
            isConfirmed: tx && typeof tx.isConfirmed === "function" ? tx.isConfirmed() : true,
            height: tx && typeof tx.getHeight === "function" ? tx.getHeight() : null,
          };
        }).filter(t => t.amount > 0);
      } catch (tErr) {
        console.warn("[XMR] Could not retrieve incoming transfers:", tErr.message);
      }

      // Cache the confirmed balance & transfers
      lastConfirmedBalanceMap.set(address, numBal);
      if (incomingTransfers.length > 0) {
        const existing = cumulativeTransfersMap.get(address) || [];
        const existingHashes = new Set(existing.map(t => t.hash));
        const merged = [...existing];
        incomingTransfers.forEach(t => {
          if (t.hash && !existingHashes.has(t.hash)) {
            existingHashes.add(t.hash);
            merged.push(t);
          }
        });
        cumulativeTransfersMap.set(address, merged);
      }

      console.log(`[XMR] Sync finished for ${address.slice(0, 8)}... Balance: ${numBal} XMR (${incomingTransfers.length} incoming deposits detected)`);
      return {
        balance: numBal,
        incomingTransfers: cumulativeTransfersMap.get(address) || incomingTransfers,
      };
    } finally {
      await wallet.close();
    }
  } catch (error) {
    console.warn("Monero balance fetch error:", error.message);
    if (lastConfirmedBalanceMap.has(address)) {
      return {
        balance: lastConfirmedBalanceMap.get(address),
        incomingTransfers: cumulativeTransfersMap.get(address) || []
      };
    }
    return null;
  }
}

/**
 * Estimates Monero transaction fee.
 */
export async function estimateXmrFee(payload = {}) {
  // Standard dynamic Monero base fee estimation (typically ~0.00005 XMR)
  return {
    chain: "XMR",
    fee: 0.00005,
    unit: "XMR",
  };
}

/**
 * Sends Monero transaction.
 */
export async function sendXmr(payload) {
  const { privateKey, to, amount, rpcUrl } = payload;
  const isInvalidRpc = !rpcUrl || rpcUrl.includes("alchemy.com") || rpcUrl.includes("infura.io") || rpcUrl.includes("binance.org");
  const targetRpc = !isInvalidRpc ? rpcUrl : (process.env.XMR_RPC_URL || XMR_NODE_POOL[0]);

  const { createWalletFull, MoneroNetworkType, connectToDaemonRpc } = await import("monero-ts");

  let restoreHeight = 0;
  try {
    const daemon = await connectToDaemonRpc(targetRpc);
    const height = await daemon.getHeight();
    restoreHeight = Math.max(0, height - 2000);
  } catch (e) {
    console.warn("Could not fetch daemon height for sendXmr:", e.message);
  }

  const wallet = await createWalletFull({
    networkType: MoneroNetworkType.MAINNET,
    server: targetRpc,
    privateSpendKey: privateKey,
    restoreHeight: restoreHeight,
  });

  try {
    await wallet.sync();
    const tx = await wallet.createTx({
      accountIndex: 0,
      address: to,
      amount: BigInt(Math.round(amount * 1e12)),
      relay: true,
    });

    return {
      hash: await tx.getHash(),
      fee: tx.getFee() ? Number(tx.getFee().toString()) / 1e12 : 0.00005,
    };
  } finally {
    await wallet.close();
  }
}

