import express from "express";
import walletRoutes from "./walletRoutes.js";
import swapRoutes from "./swapRoutes.js";
import payoutRoutes from "./payoutRoutes.js";
import lightningRoutes from "./lightningRoutes.js";

const router = express.Router();

router.use("/wallet", walletRoutes);
router.use("/swap", swapRoutes);
router.use("/payouts", payoutRoutes);
router.use("/lightning", lightningRoutes);

export default router;
