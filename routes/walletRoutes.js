import express from "express";
import {
  generateMnemonic,
  deriveAddress,
  getWalletInfo,
  sendWalletTransaction,
  estimateTransactionFee,
  getTransactionParams,
  broadcastWalletTransaction
} from "../controllers/wallet.js";

const router = express.Router();

// GET /api/wallet/mnemonic
router.get("/mnemonic", generateMnemonic);

// POST /api/wallet/address
router.post("/address", deriveAddress);

////Post wallet balances
router.post("/info", getWalletInfo);


///sendcoin
router.post("/send", sendWalletTransaction);

// Estimate fee
router.post("/fee", estimateTransactionFee);

// Get TX Params (nonce, gas, blockhash)
router.post("/params", getTransactionParams);

// Broadcast signed TX
router.post("/broadcast", broadcastWalletTransaction);



export default router;
