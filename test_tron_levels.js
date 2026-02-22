import * as cryptoLib from "@okxweb3/crypto-lib";
import * as tronLib from "@okxweb3/coin-tron";

const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

async function testPaths() {
    const seed = await cryptoLib.bip39.mnemonicToSeed(mnemonic);
    const root = cryptoLib.bip32.fromSeed(seed);

    const paths = [
        "m/44'/195'/0'/0/0",
        "m/44'/195'/0'/0",
    ];

    for (const path of paths) {
        try {
            const child = root.derivePath(path);
            const privateKeyHex = child.privateKey.toString("hex");
            const address = tronLib.addressFromPrivate(privateKeyHex);
            console.log(`Path: ${path} => Address: ${address}`);
        } catch (e) {
            console.log(`Path: ${path} failed: ${e.message}`);
        }
    }
}

testPaths();
