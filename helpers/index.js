import { TonWallet, api as tonApi } from "@okxweb3/coin-ton";

export const testFun = async () => {
    const wallet = new TonWallet();

// derive from BIP39 mnemonic
const seed = await wallet.getDerivedPrivateKey({
  mnemonic: "large upon burger tape jaguar fetch month primary deny boil neck wolf",
  hdPath: "m/44'/607'/0'", // optional for bip39
});

const address = await wallet.getNewAddress({ privateKey: seed });
console.log("TON address:", address);

}