import express from "express";
import walletRoutes from "./walletRoutes.js";
import swapRoutes from "./swapRoutes.js";

const router = express.Router();

router.use("/wallet", walletRoutes);
router.use("/swap", swapRoutes);

export default router;
