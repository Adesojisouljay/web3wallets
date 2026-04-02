import { getPrices } from "../helpers/prices/index.js";
import { estimateTrc20Fee } from "../helpers/tron/index.js";
import { estimateErc20Fee } from "../helpers/eth/index.js";

// GET /api/swap/quote?pay=HIVE&receive=USDT_TRC20&amount=100
export async function getSwapQuote(req, res) {
    const { pay, receive, amount } = req.query;

    if (!pay || !receive || !amount) {
        return res.status(400).json({ error: "Missing 'pay', 'receive', or 'amount' query parameters." });
    }

    try {
        // Map legacy 'USDT' to 'USDT_TRC20' for internal logic
        const paySymbol = pay === 'USDT' ? 'USDT_TRC20' : pay;
        const receiveSymbol = receive === 'USDT' ? 'USDT_TRC20' : receive;

        const allChains = [...new Set([paySymbol, receiveSymbol, 'TRX', 'BNB', 'ETH'])];
        const prices = await getPrices(allChains);

        const payPriceUSD = prices[paySymbol]?.usd;
        const receivePriceUSD = prices[receiveSymbol]?.usd;

        if (!payPriceUSD || !receivePriceUSD) {
            return res.status(400).json({ error: `Unsupported swap pairing or price missing: ${paySymbol} -> ${receiveSymbol}` });
        }

        // Mathematical exchange rate calculation bridging via USD
        const exchangeRate = payPriceUSD / receivePriceUSD;
        
        // Treasury Business Logic: Apply exactly 3% platform fee/spread
        const spreadMultiplier = 0.97; 
        const finalRate = exchangeRate * spreadMultiplier;

        // Minimum Swap Enforcement (Sustainability Protection)
        const minHIVE = 10;
        if (paySymbol === 'HIVE' && parseFloat(amount) < minHIVE) {
            return res.status(400).json({ error: `Minimum swap amount is ${minHIVE} HIVE to cover infrastructure costs.` });
        }

        const platformFeeInReceive = (parseFloat(amount) * exchangeRate) - (parseFloat(amount) * finalRate);

        // Calculate network fees
        let networkFeeUSD = 0;

        // Helper to estimate fee for a specific token
        const estimateAssetFee = async (symbol) => {
            if (symbol === 'USDT_TRC20') {
                // The system is sponsoring the fee for USDT_TRC20
                return 0;
            }
            if (symbol === 'USDT_BEP20') {
                const feeData = await estimateErc20Fee({
                    rpcUrl: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org",
                    from: "0x06a3d5327fa8cd901551d046f8b584459a3fdcc9",
                    to: "0x06a3d5327fa8cd901551d046f8b584459a3fdcc9",
                    amount: 1,
                    contractAddress: "0x55d398326f99059ff775485246999027b3197955"
                });
                return feeData.fee * (prices['BNB']?.usd || 600);
            }
            if (symbol === 'USDT_ERC20') {
                const feeData = await estimateErc20Fee({
                    rpcUrl: process.env.ETH_RPC_URL || "https://eth.drpc.org",
                    from: "0x06a3d5327fa8cd901551d046f8b584459a3fdcc9",
                    to: "0x06a3d5327fa8cd901551d046f8b584459a3fdcc9",
                    amount: 1,
                    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7"
                });
                return feeData.fee * (prices['ETH']?.usd || 2500);
            }
            return 0;
        };

        // We only care about the outward fee (receive side) for the quote deduction
        networkFeeUSD = await estimateAssetFee(receiveSymbol);
        console.log(`[Swap Quote] Calculated networkFeeUSD: ${networkFeeUSD} for ${receiveSymbol}`);

        // Convert the network fee to the receive coin denomination
        let networkFeeInReceiveCoin = networkFeeUSD / receivePriceUSD;

        // Calculate final outward flow stringified to 6 decimal limits
        let baseReceiveAmount = parseFloat(amount) * finalRate;
        let finalReceiveAmount = baseReceiveAmount - networkFeeInReceiveCoin;
        
        // Safety: If the amount is too small to cover fees, we show 0
        if (finalReceiveAmount < 0) finalReceiveAmount = 0;

        return res.status(200).json({
            payCoin: pay,
            receiveCoin: receive,
            exchangeRate: finalRate.toString(),
            grossReceiveAmount: baseReceiveAmount.toFixed(6),
            receiveAmount: finalReceiveAmount.toFixed(6),
            networkFee: networkFeeInReceiveCoin.toFixed(6),
            platformFeeAmount: platformFeeInReceive.toFixed(6),
            platformFeePercent: "3%",
            oraclePrices: {
                [paySymbol]: payPriceUSD,
                [receiveSymbol]: receivePriceUSD
            }
        });
    } catch (error) {
        console.error("Swap Quote Engine Error:", error);
        return res.status(500).json({ error: "Failed to generate algorithmic treasury quote" });
    }
}
