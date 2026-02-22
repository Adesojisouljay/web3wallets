import axios from "axios";

const LIFI_API = "https://li.quest/v1";

export async function getSwapQuote(req, res) {
    const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress } = req.body;

    try {
        const response = await axios.get(`${LIFI_API}/quote`, {
            params: {
                fromChain,
                toChain,
                fromToken,
                toToken,
                fromAmount,
                fromAddress,
                slippage: 0.03, // 3% default
            },
        });

        return res.status(200).json(response.data);
    } catch (err) {
        console.error("Li.Fi Quote Error:", err.response?.data || err.message);
        return res.status(500).json({ error: "Failed to fetch swap quote" });
    }
}

export async function getSupportedChains(req, res) {
    try {
        const response = await axios.get(`${LIFI_API}/chains`);
        return res.status(200).json(response.data);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch supported chains" });
    }
}

export async function getSupportedTokens(req, res) {
    const { chain } = req.query;
    try {
        const response = await axios.get(`${LIFI_API}/tokens`, {
            params: { chains: chain },
        });
        return res.status(200).json(response.data);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch supported tokens" });
    }
}
