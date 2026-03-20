import axios from "axios";

export async function getLtcBalance(address) {
    try {
        const apiKey = process.env.TATUM_API_KEY;
        const url = `https://api.tatum.io/v3/litecoin/address/balance/${address}`;
        const headers = apiKey ? { 'x-api-key': apiKey } : {};
        
        const { data } = await axios.get(url, { 
            timeout: 15000,
            headers
        });
        
        if (data && data.incoming !== undefined && data.outgoing !== undefined) {
            const balance = parseFloat(data.incoming) - parseFloat(data.outgoing);
            return balance;
        }
    } catch (err) {
        console.warn(`Tatum LTC fetch failed for ${address}:`, err?.response?.data || err.message);
    }

    try {
        const url = `https://api.blockchair.com/litecoin/dashboards/address/${address}`;
        const { data } = await axios.get(url, { 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (data && data.data && data.data[address]) {
            return data.data[address].address.balance / 1e8;
        }
    } catch (fallbackErr) {
        console.error(`LTC fallback failed:`, fallbackErr.message);
    }
    return 0;
}
