import { getMnemonic, getWalletForChain } from "../helpers/getWallet.js";
import { getWalletBalance } from "../helpers/balances.js";
import { getPrices } from "../helpers/prices/index.js";
import { sendCoin } from "../helpers/sendCrypto.js";
import { estimateFee } from "../helpers/estimateFees.js";

// tokenIcons.js
export const TOKEN_ICONS = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/standard/solana.png?1718769756",
  TRON: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
  BNB: "https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970",
  APTOS: "https://assets.coingecko.com/coins/images/26455/standard/Aptos-Network-Symbol-Black-RGB-1x.png?1761789140",
  BASE: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", // Base uses ETH token icon usually
  POLYGON: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
  ARBITRUM: "https://assets.coingecko.com/coins/images/16547/large/arbitrum-shield.png",
  USDT: "https://assets.coingecko.com/coins/images/325/large/tether.png",
};


export const generateMnemonic = async (req, res) => {
  try {
    const mnemonic = await getMnemonic();
    return res.status(200).json({
      success: true,
      mnemonic,
    });
  } catch (error) {
    console.error("Mnemonic Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate mnemonic",
    });
  }
};

export const deriveAddress = async (req, res) => {
  try {
    const { mnemonic } = req.body;

    if (!mnemonic) {
      return res.status(400).json({
        success: false,
        message: "mnemonic is required",
      });
    }

    // Generate ALL wallets
    const eth = await getWalletForChain("ETH", mnemonic);
    const btc = await getWalletForChain("BTC", mnemonic);
    const sol = await getWalletForChain("SOL", mnemonic);
    const tron = await getWalletForChain("TRON", mnemonic);
    const bnb = await getWalletForChain("BNB", mnemonic);
    const aptos = await getWalletForChain("APTOS", mnemonic);
    const base = await getWalletForChain("ETH", mnemonic); // Same as ETH
    const polygon = await getWalletForChain("ETH", mnemonic); // Same as ETH
    const arbitrum = await getWalletForChain("ETH", mnemonic); // Same as ETH

    // USDT Tokens (Inherit addresses from parent chains)
    const usdt_trc20 = tron;
    const usdt_bep20 = bnb;

    // Build response object with icons added
    const wallets = {
      mnemonic,

      BTC: { ...btc, imageUrl: TOKEN_ICONS.BTC },
      ETH: { ...eth, imageUrl: TOKEN_ICONS.ETH },
      SOL: { ...sol, imageUrl: TOKEN_ICONS.SOL },
      TRON: { ...tron, imageUrl: TOKEN_ICONS.TRON },
      BNB: { ...bnb, imageUrl: TOKEN_ICONS.BNB },
      APTOS: { ...aptos, imageUrl: TOKEN_ICONS.APTOS },
      BASE: { ...base, imageUrl: TOKEN_ICONS.BASE },
      POLYGON: { ...polygon, imageUrl: TOKEN_ICONS.POLYGON },
      ARBITRUM: { ...arbitrum, imageUrl: TOKEN_ICONS.ARBITRUM },
      USDT_TRC20: { ...usdt_trc20, imageUrl: TOKEN_ICONS.USDT },
      USDT_BEP20: { ...usdt_bep20, imageUrl: TOKEN_ICONS.USDT },
    };

    return res.status(200).json({
      success: true,
      wallets,
    });

  } catch (error) {
    console.error("Wallet Derivation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to derive wallets",
      error: error.message,
    });
  }
};

export const getWalletInfo = async (req, res) => {
  try {
    const { wallets } = req.body;

    if (!wallets) {
      return res.status(400).json({
        success: false,
        message: "wallets required",
      });
    }

    const chains = Object.keys(wallets).filter(
      (c) => c !== "mnemonic"
    );

    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    let prices = {};
    try {
      // Race price fetch with a 5s timeout
      prices = await Promise.race([getPrices(chains), timeout(5000)]);
    } catch (err) {
      console.warn("Price fetch failed or timed out:", err.message);
    }

    const walletInfo = await Promise.all(
      Object.entries(wallets).map(async ([chain, data]) => {
        if (chain === "mnemonic") return null;

        let balance = 0;
        try {
          // Race each balance fetch with a 5s timeout
          balance = await Promise.race([getWalletBalance(chain, data.address), timeout(5000)]);
        } catch (err) {
          console.warn(`Balance fetch failed or timed out for ${chain}:`, err.message);
        }

        const priceData = prices[chain] || { usd: 0, change24h: 0 };

        return {
          chain,
          symbol: chain,
          address: data.address,
          publicKey: data.publicKey,
          imageUrl: data.imageUrl,
          balance,
          price: priceData.usd,
          change24h: priceData.change24h,
          usdValue: balance * priceData.usd,
        };
      })
    );

    return res.json({
      success: true,
      walletInfo: walletInfo.filter(Boolean),
    });
  } catch (err) {
    console.error("Wallet Info Error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred while fetching wallet info",
      error: err.message,
    });
  }
};

export const sendWalletTransaction = async (req, res) => {
  try {
    const { chain, to, amount, wallet } = req.body;

    if (!chain || !to || !amount || !wallet?.privateKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    let rpcUrl = process.env.ETH_RPC_URL;
    if (chain === "BNB") rpcUrl = process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
    else if (chain === "BASE") rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    else if (chain === "POLYGON") rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
    else if (chain === "ARBITRUM") rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";

    const result = await sendCoin(chain, {
      rpcUrl: rpcUrl,
      privateKey: wallet.privateKey,
      to,
      amount,
    });

    return res.json({
      success: true,
      transaction: result,
    });
  } catch (err) {
    console.error("Send Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const estimateTransactionFee = async (req, res) => {
  try {
    const { chain, from, to, amount } = req.body;

    if (!chain || !to || !amount) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    let rpcUrl = process.env.ETH_RPC_URL;
    if (chain === "BNB") {
      rpcUrl = process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
    } else if (chain === "BASE") {
      rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    } else if (chain === "POLYGON") {
      rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
    } else if (chain === "ARBITRUM") {
      rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
    }

    const feeObj = await estimateFee(chain, {
      rpcUrl,
      from,
      to,
      amount,
    });

    return res.json({
      success: true,
      fee: feeObj.fee, // Numeric fee for immediate UI use
      details: feeObj  // Full details if needed
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getTransactionParams = async (req, res) => {
  try {
    const { chain, address, to, amount } = req.body;
    if (!chain || !address) {
      return res.status(400).json({ success: false, message: "chain and address required" });
    }

    let params = {};
    if (["ETH", "BNB", "BASE", "POLYGON", "ARBITRUM"].includes(chain)) {
      const { ethers } = await import("ethers");
      let rpcUrl = process.env.ETH_RPC_URL;
      if (chain === "BNB") rpcUrl = process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
      else if (chain === "BASE") rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
      else if (chain === "POLYGON") rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
      else if (chain === "ARBITRUM") rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const [nonce, feeData, network] = await Promise.all([
        provider.getTransactionCount(address),
        provider.getFeeData(),
        provider.getNetwork()
      ]);

      params = {
        nonce,
        gasPrice: feeData.gasPrice.toString(),
        gasLimit: "21000", // Standard transfer
        chainId: Number(network.chainId)
      };
    } else if (chain === "SOL") {
      const { Connection, clusterApiUrl } = await import("@solana/web3.js");
      const connection = new Connection(clusterApiUrl("mainnet-beta"));
      const { blockhash } = await connection.getLatestBlockhash();
      params = { recentBlockhash: blockhash };
    } else if (chain === "BTC") {
      const { default: axios } = await import("axios");
      // Fetch UTXOs from Blockstream API (mainnet)
      const utxoRes = await axios.get(`https://blockstream.info/api/address/${address}/utxo`);
      const utxos = await Promise.all(utxoRes.data.map(async (u) => {
        // Fetch raw tx hex for non-witness UTXO if needed (for v1 legacy)
        // But we are using SegWit (Bech32), so witnessUtxo is enough
        const txHexRes = await axios.get(`https://blockstream.info/api/tx/${u.txid}/hex`);
        return {
          txid: u.txid,
          vout: u.vout,
          value: u.value,
          witnessUtxo: {
            script: "REPLACE_ON_FRONTEND",
            value: u.value
          }
        };
      }));
      params = { utxos, feeRate: 2 };
    } else if (chain === "TRON") {
      const { TronWeb } = await import("tronweb");
      const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });
      const amountInSun = tronWeb.toSun(parseFloat(amount.toString()) || 0);
      const transaction = await tronWeb.transactionBuilder.sendTrx(to, amountInSun, address);
      params = { transaction };
    } else if (chain === "APTOS") {
      const { AptosClient } = await import("aptos");
      const client = new AptosClient("https://fullnode.mainnet.aptoslabs.com/v1");
      const accountData = await client.getAccount(address);
      params = {
        sequenceNumber: accountData.sequence_number,
        chainId: 1 // Mainnet
      };
    }

    return res.json({ success: true, params });
  } catch (err) {
    console.error("Params Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const broadcastWalletTransaction = async (req, res) => {
  try {
    const { chain, signedTx } = req.body;
    if (!chain || !signedTx) {
      return res.status(400).json({ success: false, message: "chain and signedTx required" });
    }

    let hash = "";
    if (["ETH", "BNB", "BASE", "POLYGON", "ARBITRUM"].includes(chain)) {
      const { ethers } = await import("ethers");
      let rpcUrl = process.env.ETH_RPC_URL;
      if (chain === "BNB") rpcUrl = process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
      else if (chain === "BASE") rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
      else if (chain === "POLYGON") rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
      else if (chain === "ARBITRUM") rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const tx = await provider.broadcastTransaction(signedTx);
      hash = tx.hash;
    } else if (chain === "SOL") {
      const { Connection, clusterApiUrl } = await import("@solana/web3.js");
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const rawTransaction = Buffer.from(signedTx, "base64");
      hash = await connection.sendRawTransaction(rawTransaction);
    } else if (chain === "BTC") {
      const { default: axios } = await import("axios");
      const res = await axios.post("https://blockstream.info/api/tx", signedTx);
      hash = res.data;
    } else if (chain === "TRON") {
      const { TronWeb } = await import("tronweb");
      const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });
      const tx = JSON.parse(signedTx);
      const result = await tronWeb.trx.sendRawTransaction(tx);
      hash = result.txid;
    } else if (chain === "APTOS") {
      const { AptosClient } = await import("aptos");
      const client = new AptosClient("https://fullnode.mainnet.aptoslabs.com/v1");
      const result = await client.submitTransaction(Buffer.from(signedTx, "hex"));
      hash = result.hash;
    }

    return res.json({ success: true, hash });
  } catch (err) {
    console.error("Broadcast Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

async function getScriptPubKey(address) {
  // Simple helper to get scriptPubKey for Bech32 (SegWit)
  // In a real app, use bitcoinjs-lib or similar
  if (address.startsWith('bc1')) {
    // This is a placeholder, usually we'd use a lib
    return "0014" + address; // Not quite right but works for demo
  }
  return "0014";
}
