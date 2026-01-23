import express from "express";
import {
  generateMnemonic,
  deriveAddress,
  getWalletInfo,
  sendWalletTransaction
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



export default router;
