import axios from "axios";

export async function getBtcBalance(address) {
  try {
    const url = `https://blockstream.info/api/address/${address}`;
    const { data } = await axios.get(url, { timeout: 25000 });

    const satoshi =
      data.chain_stats.funded_txo_sum -
      data.chain_stats.spent_txo_sum;

    return satoshi / 1e8;
  } catch (err) {
    console.warn(`Blockstream fetch failed for ${address}, trying mempool.space:`, err.message);
    try {
      const url = `https://mempool.space/api/address/${address}`;
      const { data } = await axios.get(url, { timeout: 25000 });
      const satoshi = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      return satoshi / 1e8;
    } catch (fallbackErr) {
      console.warn(`BTC mempool.space fallback failed:`, fallbackErr.message);
      try {
        const url = `https://blockchain.info/rawaddr/${address}`;
        const { data } = await axios.get(url, { timeout: 25000 });
        return data.final_balance / 1e8;
      } catch (thirdErr) {
        console.error(`BTC all fallbacks failed:`, thirdErr.message);
        return 0;
      }
    }
  }
}
