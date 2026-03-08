import axios from "axios";

export async function getLtcBalance(address) {
    try {
        // Blockcypher (LTC is well-supported)
        const url = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data.balance / 1e8;
    } catch (err) {
        console.warn(`Blockcypher LTC fetch failed for ${address}, trying Chain.so:`, err.message);
        try {
            // Chain.so Fallback
            const url = `https://chain.so/api/v2/get_address_balance/LTC/${address}`;
            const { data } = await axios.get(url, { timeout: 15000 });
            if (data && data.status === "success") {
                return parseFloat(data.data.confirmed_balance);
            }
            return 0;
        } catch (fallbackErr) {
            console.error(`LTC all fallbacks failed:`, fallbackErr.message);
            return 0;
        }
    }
}
