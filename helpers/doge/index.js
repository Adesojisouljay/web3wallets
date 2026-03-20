import axios from "axios";

export async function getDogeBalance(address) {
    try {
        const apiKey = process.env.TATUM_API_KEY;
        const url = `https://api.tatum.io/v3/dogecoin/address/balance/${address}`;
        const headers = apiKey ? { 'x-api-key': apiKey } : {};
        
        const { data } = await axios.get(url, { 
            timeout: 15000,
            headers
        });
        
        if (data && data.incoming !== undefined && data.outgoing !== undefined) {
            // Tatum returns balance in Doge directly, but usually it's incoming - outgoing
            // Actually Tatum balance endpoint returns incoming and outgoing in DOGE string.
            const balance = parseFloat(data.incoming) - parseFloat(data.outgoing);
            return balance;
        }
    } catch (err) {
        console.warn(`Tatum DOGE fetch failed for ${address}:`, err?.response?.data || err.message);
    }

    try {
        const url = `https://api.blockchair.com/dogecoin/dashboards/address/${address}`;
        const { data } = await axios.get(url, { 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (data && data.data && data.data[address]) {
            return data.data[address].address.balance / 1e8;
        }
    } catch (fallbackErr) {
        console.error(`DOGE fallback failed:`, fallbackErr.message);
    }
    return 0;
}
