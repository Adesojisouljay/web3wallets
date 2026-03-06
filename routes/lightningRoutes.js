import express from "express";
import { createUserWallet, createInvoice, handleWebhook, getBalance, payInvoice } from "../controllers/lightning.js";

const router = express.Router();

router.post("/wallet", createUserWallet);
router.post("/invoice", createInvoice);
router.post("/pay", payInvoice);
router.get("/balance", getBalance);
router.post("/webhook", handleWebhook);

export default router;
