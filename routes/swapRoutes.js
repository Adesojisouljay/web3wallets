import express from "express";
import { getSwapQuote, getSupportedChains, getSupportedTokens } from "../controllers/swap.js";

const router = express.Router();

router.get("/chains", getSupportedChains);
router.get("/tokens", getSupportedTokens);
router.post("/quote", getSwapQuote);

export default router;
