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
  const query = `
    query GetFungibleAssetBalances($address: String) {
      current_fungible_asset_balances(
        where: {owner_address: {_eq: $address}, asset_type: {_eq: "0x1::aptos_coin::AptosCoin"}}
      ) {
        amount
      }
    }
  `;

  try {
    const { data } = await axios.post(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
      {
        query,
        variables: { address }
      },
      { timeout: 25000 }
    );

    const balances = data?.data?.current_fungible_asset_balances;
    
    if (balances && balances.length > 0) {
      return Number(balances[0].amount) / 1e8;
    }

    return 0;
  } catch (err) {
    console.warn("Aptos balance fetch failed:", err.message);
    return 0;
  }
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
