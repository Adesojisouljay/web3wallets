import express from "express";
import {
  generateMnemonic,
  deriveAddress,
  deriveAddressAtIndex,
  getWalletInfo,
  sendWalletTransaction,
  estimateTransactionFee,
  getTransactionParams,
  broadcastWalletTransaction,
  sweepAssets
} from "../controllers/wallet.js";

const router = express.Router();

// GET /api/wallet/mnemonic
router.get("/mnemonic", generateMnemonic);

// POST /api/wallet/address
router.post("/address", deriveAddress);

// POST /api/wallet/address/index
router.post("/address/index", deriveAddressAtIndex);

////Post wallet balances
router.post("/info", getWalletInfo);


///sendcoin
router.post("/send", sendWalletTransaction);

// Estimate fee
router.post("/fee", estimateTransactionFee);

// Get TX Params (nonce, gas, blockhash)
router.post("/params", getTransactionParams);

// Broadcast signed TX (client-side signed transactions)
router.post("/broadcast", broadcastWalletTransaction);

// Sweep assets from Index 0 to Vault
router.post("/sweep", sweepAssets);



export default router;
