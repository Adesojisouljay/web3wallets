import { sendCoin } from "../helpers/sendCrypto.js";
import { getPrices } from "../helpers/prices/index.js";
import { getMnemonic } from "../helpers/getWallet.js";

export const processRewardAdvance = async (req, res) => {
    try {
        const { author, permlink, advance, trx_id } = req.body;
        const { percentage, currency, address } = advance;

        console.log(`[Payout] Processing advance for @${author}: ${percentage}% in ${currency} to ${address}`);

        // 1. Basic Validation
        if (!address || !currency || !percentage) {
            return res.status(400).json({ success: false, message: "Missing advance details" });
        }

        // 2. Security: Verify Internal API Key
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 3. Calculation Logic 
        // Note: For now, we assume a "standard" post value for the advance calculation 
        // since the actual Hive payout is 7 days away. 
        // In a production environment, this would likely be based on current "pending_payout" 
        // from Hive, adjusted for a safety margin (e.g. 80% of requested).

        // Mocking a $1.00 starting point for this logic demonstration
        // (In real use, we'd fetch the current post value from Hive API first)
        const estimatedPostValueUsd = 1.0;
        const requestedUsd = (estimatedPostValueUsd * (percentage / 100)) * 0.8; // 80% safety margin
        const platformFee = requestedUsd * 0.05; // 5% platform fee
        const finalPayoutUsd = requestedUsd - platformFee;

        // 4. Get Current Crypto Price
        const prices = await getPrices([currency]);
        const price = prices[currency]?.usd || 0;

        if (price === 0) {
            throw new Error(`Price for ${currency} not found`);
        }

        const payoutAmount = finalPayoutUsd / price;

        console.log(`[Payout] Amount: ${payoutAmount} ${currency} ($${finalPayoutUsd.toFixed(2)})`);

        // 5. Execute Payout from Platform Wallet
        const mnemonic = process.env.PLATFORM_MNEMONIC || process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error("Platform mnemonic not configured");
        }

        // We use the helper to get the platform's private key for the specific chain
        const { getWalletForChain } = await import("../helpers/getWallet.js");
        const platformWallet = await getWalletForChain(currency.split('_')[0], mnemonic);

        // Broadcast transaction
        const result = await sendCoin(currency.split('_')[0], {
            privateKey: platformWallet.privateKey,
            to: address,
            amount: payoutAmount,
            // For TRC20, we need the contract
            contractAddress: currency === 'USDT_TRC20' ? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" : undefined
        });

        console.log(`[Payout] Success! Tx: ${result.hash}`);

        return res.json({
            success: true,
            hash: result.hash,
            amount: payoutAmount,
            currency
        });

    } catch (err) {
        console.error("[Payout] Error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
