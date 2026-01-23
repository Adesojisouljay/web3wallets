import axios from "axios";

export async function getBtcBalance(address) {
  const url = `https://blockstream.info/api/address/${address}`;

  const { data } = await axios.get(url);

  const satoshi =
    data.chain_stats.funded_txo_sum -
    data.chain_stats.spent_txo_sum;

  return satoshi / 1e8;
}
