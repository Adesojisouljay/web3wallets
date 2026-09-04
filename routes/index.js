import express from "express";
import walletRoutes from "./walletRoutes.js";
import swapRoutes from "./swapRoutes.js";
import tokenRoutes from "./tokenRoutes.js";

const router = express.Router();

router.use("/wallet", walletRoutes);
router.use("/swap", swapRoutes);
router.use("/token", tokenRoutes);

export default router;
