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

  // add more tokens here anytim
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
    const eth   = await getWalletForChain("ETH", mnemonic);
    const btc   = await getWalletForChain("BTC", mnemonic);
    const sol   = await getWalletForChain("SOL", mnemonic);
    const tron  = await getWalletForChain("TRON", mnemonic);
    const bnb   = await getWalletForChain("BNB", mnemonic);
    const aptos = await getWalletForChain("APTOS", mnemonic);

    // Build response object with icons added
    const wallets = {
      mnemonic,
      
      BTC:   { ...btc,   imageUrl: TOKEN_ICONS.BTC },
      ETH:   { ...eth,   imageUrl: TOKEN_ICONS.ETH },
      SOL:   { ...sol,   imageUrl: TOKEN_ICONS.SOL },
      TRON:  { ...tron,  imageUrl: TOKEN_ICONS.TRON },
      BNB:   { ...bnb,   imageUrl: TOKEN_ICONS.BNB },
      APTOS: { ...aptos, imageUrl: TOKEN_ICONS.APTOS }
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

    const prices = await getPrices(chains);

    const walletInfo = [];

    for (const [chain, data] of Object.entries(wallets)) {
      if (chain === "mnemonic") continue;

      const balance = await getWalletBalance(chain, data.address);

      const priceData = prices[chain] || {
        usd: 0,
        change24h: 0,
      };

      walletInfo.push({
        chain,
        symbol: chain,
        address: data.address,
        publicKey: data.publicKey,
        imageUrl: data.imageUrl,
        balance,
        price: priceData.usd,
        change24h: priceData.change24h,
        usdValue: balance * priceData.usd,
      });
    }

    return res.json({
      success: true,
      wallets: walletInfo,
    });
  } catch (err) {
    console.error("Wallet Info Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
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

    const result = await sendCoin(chain, {
      rpcUrl: process.env.ETH_RPC_URL,
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

    const fee = await estimateFee(chain, {
      rpcUrl: process.env.ETH_RPC_URL,
      from,
      to,
      amount,
    });

    return res.json({
      success: true,
      fee,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
