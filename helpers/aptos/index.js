import axios from "axios";
import {
  AptosClient,
  AptosAccount,
  CoinClient,
} from "aptos";

const client = new AptosClient(
  "https://fullnode.mainnet.aptoslabs.com"
);

export async function getAptosBalance(address) {
  const url = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${address}/resources`;

  const { data } = await axios.get(url);

  const coin = data.find(
    (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
  );

  if (!coin) return 0;

  return Number(coin.data.coin.value) / 1e8;
}

export async function sendAptos({ privateKey, to, amount }) {
  const account = new AptosAccount(
    Uint8Array.from(Buffer.from(privateKey, "hex"))
  );

  const coinClient = new CoinClient(client);

  const txHash = await coinClient.transfer(
    account,
    to,
    amount * 1e8
  );

  return {
    hash: txHash,
    chain: "APTOS",
  };
}


export async function estimateAptosFee({ sender }) {
  // Typical Aptos transfer fee range
  return {
    chain: "APTOS",
    feeAPT: 0.00001,
    fee: 0.00001,
  };
}
