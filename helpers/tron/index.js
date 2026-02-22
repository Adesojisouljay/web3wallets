import { TronWeb } from "tronweb";

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
});

export async function getTronBalance(address) {
  const sun = await tronWeb.trx.getBalance(address);
  return sun / 1e6;
}

export async function sendTron({ privateKey, to, amount }) {
  tronWeb.setPrivateKey(privateKey);

  const tx = await tronWeb.trx.sendTransaction(
    to,
    amount * 1e6
  );

  return {
    hash: tx.txid,
    chain: "TRON",
  };
}

export async function estimateTronFee({ from }) {
  // Basic TRX transfer usually consumes bandwidth, often free
  const accountResources = await tronWeb.trx.getAccountResources(from);

  const freeBandwidth = accountResources.freeNetLimit || 0;

  return {
    chain: "TRON",
    model: "bandwidth",
    freeBandwidth,
    estimatedFeeTRX: freeBandwidth > 0 ? 0 : 1, // fallback
    fee: freeBandwidth > 0 ? 0 : 1,
  };
}
export async function getTrc20Balance(address, contractAddress = "TR7NHqjk2jtZmt6GW1Rtc3MKvbnyo6nvve") {
  try {
    const contract = await tronWeb.contract().at(contractAddress);
    const balance = await contract.balanceOf(address).call();
    const decimals = await contract.decimals().call();
    return Number(balance) / Math.pow(10, decimals);
  } catch (err) {
    console.error(`TRC20 balance error for ${contractAddress}:`, err.message);
    return 0;
  }
}
