import axios from "axios";

export async function getDogeBalance(address) {
    try {
        // Dogechain API
        const url = `https://dogechain.info/api/v1/address/balance/${address}`;
        const { data } = await axios.get(url, { timeout: 15000 });

        // Dogechain returns { balance: "...", success: 1 }
        if (data && data.success === 1) {
            return parseFloat(data.balance);
        }
        return 0;
    } catch (err) {
        console.warn(`Dogechain fetch failed for ${address}, trying Blockcypher:`, err.message);
        try {
            // Blockcypher Fallback
            const url = `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`;
            const { data } = await axios.get(url, { timeout: 15000 });
            return data.balance / 1e8;
        } catch (fallbackErr) {
            console.error(`DOGE all fallbacks failed:`, fallbackErr.message);
            return 0;
        }
    }
}
