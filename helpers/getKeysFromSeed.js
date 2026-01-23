import coinBasePkg from "@okxweb3/coin-base";
const { BaseWallet } = coinBasePkg;
import { HD_PATHS } from "./paths.js";

export async function getKeysFromSeed(mnemonic, currency) {
  const wallet = new BaseWallet(); 

  for (const hdPath of HD_PATHS[currency] || []) {
    try {
      const privateKey = await wallet.getDerivedPrivateKey({
        mnemonic,
        hdPath,
      });

      const pubData = await wallet.getNewAddress({
        privateKey,
        addressType: currency === "BTC" ? "segwit_native" : undefined,
      });

      return {
        privateKey: privateKey.toString(),
        publicKey: pubData.publicKey,
        address: pubData.address,
      };
    } catch (err) {
      console.log("Path failed:", hdPath, err);
    }
  }

  throw new Error("Unable to derive keys for " + currency);
}
