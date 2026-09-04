import express from "express";
import { deployToken } from "../controllers/tokenFactory.js";
import { relayTokenTransfer } from "../controllers/tokenRelayer.js";

const router = express.Router();

router.post("/deploy", deployToken);
router.post("/relay", relayTokenTransfer);

export default router;
