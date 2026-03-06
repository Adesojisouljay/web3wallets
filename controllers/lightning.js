import axios from "axios";
import { sendCoin } from "../helpers/sendCrypto.js";

const LNBITS_URL = process.env.LNBITS_URL || "https://legend.lnbits.com";
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;

/**
 * Create a new Lightning wallet for a Hive user via LNBits
 */
export const createUserWallet = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ success: false, message: "Username required" });

        // Security: Internal API Key check
        if (req.headers['x-api-key'] !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        try {
            const response = await axios.post(`${LNBITS_URL}/usermanager/api/v1/wallets`, {
                user_id: process.env.LNBITS_USER_ID, // Main account ID
                wallet_name: `sovraniche_${username}`,
                admin_id: process.env.LNBITS_ADMIN_ID
            }, {
                headers: { "X-Api-Key": LNBITS_ADMIN_KEY }
            });

            // Response contains wallet id and inkey
            return res.json({
                success: true,
                wallet: response.data
            });
        } catch (apiErr) {
            console.warn(`[LN] User Manager failed/unavailable. Falling back to shared Dev Wallet for @${username}.`);
            // Fallback for local development when User Manager isn't installed
            return res.json({
                success: true,
                wallet: {
                    id: process.env.LNBITS_USER_ID,
                    inkey: process.env.LNBITS_ADMIN_ID,
                    adminkey: process.env.LNBITS_ADMIN_KEY,
                    user: process.env.LNBITS_USER_ID
                }
            });
        }
    } catch (err) {
        console.error("[LN] Wallet Creation Error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to create Lightning wallet" });
    }
};

/**
 * Generate a BOLT11 Invoice for a user
 */
export const createInvoice = async (req, res) => {
    try {
        const { amount, memo, inkey } = req.body;
        if (!amount || !inkey) return res.status(400).json({ success: false, message: "Amount and wallet key required" });

        const response = await axios.post(`${LNBITS_URL}/api/v1/payments`, {
            out: false,
            amount: parseInt(amount),
            memo: memo || "Sovraniche Tip",
            expiry: 3600, // 1 hour
            webhook: `${process.env.BACKEND_URL}/api/lightning/webhook`
        }, {
            headers: { "X-Api-Key": inkey }
        });

        return res.json({
            success: true,
            invoice: response.data // payment_hash and payment_request
        });
    } catch (err) {
        console.error("[LN] Invoice Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Failed to generate invoice" });
    }
};

/**
 * Get wallet balance from LNBits
 */
export const getBalance = async (req, res) => {
    try {
        const { inkey } = req.query;
        if (!inkey) return res.status(400).json({ success: false, message: "Wallet key required" });

        const response = await axios.get(`${LNBITS_URL}/api/v1/wallet`, {
            headers: { "X-Api-Key": inkey }
        });

        return res.json({
            success: true,
            balance: Math.floor(response.data.balance / 1000) // Convert msats to sats
        });
    } catch (err) {
        console.error("[LN] Balance Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Failed to fetch balance" });
    }
};

/**
 * Webhook for LNBits payment notifications
 */
export const handleWebhook = async (req, res) => {
    try {
        const payload = req.body;
        // payload: { payment_hash, amount, wallet_id, memo, ... }
        console.log(`[LN Webhook] Payment received: ${payload.amount} msats (Hash: ${payload.payment_hash}) for Wallet: ${payload.wallet_id}`);

        // 1. Identify User and check Auto-Swap status via Boilerplate-Points
        // We use an internal endpoint in the main backend to check this
        const pointsUrl = process.env.POINTS_API_URL || "http://localhost:5001";

        const userRes = await axios.get(`${pointsUrl}/api/lightning/lookup?walletId=${payload.wallet_id}`, {
            headers: { "x-api-key": process.env.INTERNAL_API_KEY }
        });

        if (userRes.data.success && userRes.data.wallet) {
            const { username, autoSwap, config } = userRes.data.wallet;
            const amountSats = Math.floor(payload.amount / 1000);

            console.log(`[LN Webhook] User: ${username}, Auto-Swap: ${autoSwap}`);

            if (autoSwap && amountSats >= (config?.swapThreshold || 0)) {
                // 2. Trigger Automated Swap (Fulfilling in HIVE/HBD)
                // This calls the existing sendCoin logic from the platform account
                console.log(`[LN Webhook] Initializing auto-swap for ${username}: ${amountSats} sats`);

                // For now, we use a fixed rate or fetch a real one. 
                // Let's assume the user wants HIVE.
                const hiveRes = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=hive,bitcoin&vs_currencies=usd");
                const btcPrice = hiveRes.data.bitcoin.usd;
                const hivePrice = hiveRes.data.hive.usd;

                const satsInUsd = (amountSats / 100000000) * btcPrice;
                const hiveToSend = (satsInUsd / hivePrice).toFixed(3);

                console.log(`[LN Webhook] Sending ${hiveToSend} HIVE to @${username}`);

                // Call payout logic (similar to reward advance)
                await sendCoin({
                    chain: "HIVE",
                    to: username,
                    amount: parseFloat(hiveToSend),
                    memo: `Lightning Auto-Swap Fulfillment (${amountSats} sats)`
                });
            }
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("[LN Webhook] Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false });
    }
};

/**
 * Pay a BOLT11 Invoice using sender's inkey
 */
export const payInvoice = async (req, res) => {
    try {
        const { bolt11, inkey } = req.body;
        if (!bolt11 || !inkey) return res.status(400).json({ success: false, message: "Invoice and wallet key required" });

        const response = await axios.post(`${LNBITS_URL}/api/v1/payments`, {
            out: true,
            bolt11
        }, {
            headers: { "X-Api-Key": inkey }
        });

        return res.json({
            success: true,
            payment_hash: response.data.payment_hash
        });
    } catch (err) {
        console.error("[LN] Payment Error:", err.response?.data || err.message);
        const errMsg = err.response?.data?.message || err.message;
        return res.status(400).json({ success: false, message: errMsg || "Failed to pay invoice" });
    }
};
