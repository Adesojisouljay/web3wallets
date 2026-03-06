import express from "express";
import { processRewardAdvance } from "../controllers/payout.js";

const router = express.Router();

router.post("/reward-advance", processRewardAdvance);

export default router;
