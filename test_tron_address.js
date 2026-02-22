import { TronWeb } from "tronweb";
import * as tronLib from "@okxweb3/coin-tron";

const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"; // Test mnemonic

async function testAddress() {
    const seed = "m/44'/195'/0'/0'/0"; // path
    // Actually getWallet.js uses m/44'/195'/0'/0' with derivePath

    const privHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const okxAddress = tronLib.addressFromPrivate(privHex);
    console.log("OKX Address:", okxAddress);

    const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });
    const twAddress = tronWeb.address.fromPrivateKey(privHex);
    console.log("TronWeb Address:", twAddress);

    if (okxAddress === twAddress) {
        console.log("✅ Addresses match!");
    } else {
        console.log("❌ Addresses MISMATCH!");
    }
}

testAddress();
