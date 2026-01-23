import express from "express";
import walletRoutes from "./walletRoutes.js";

const router = express.Router();

router.use("/wallet", walletRoutes);

export default router;
