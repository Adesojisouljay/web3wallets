import express from "express";
import { getSwapQuote } from "../controllers/swap.js";

const router = express.Router();
router.get("/quote", getSwapQuote);

export default router;
