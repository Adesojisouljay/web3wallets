import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { derivePath } from 'ed25519-hd-key';
import { TronWeb } from 'tronweb';

const bip32 = BIP32Factory(ecc);
const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

async function testCurves() {
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // 1. ed25519 (Old frontend logic)
    const derivedEd = derivePath("m/44'/195'/0'/0'", seed.toString('hex')).key;
    const privEd = derivedEd.toString('hex');
    const addrEd = TronWeb.address.fromPrivateKey(privEd);
    console.log(`ed25519 (m/44'/195'/0'/0') => Address: ${addrEd}`);

    // 2. secp256k1 (New standard logic)
    const root = bip32.fromSeed(seed);
    const childRaw = root.derivePath("m/44'/195'/0'/0/0");
    const privSecp = childRaw.privateKey.toString('hex');
    const addrSecp = TronWeb.address.fromPrivateKey(privSecp);
    console.log(`secp256k1 (m/44'/195'/0'/0/0) => Address: ${addrSecp}`);
}

testCurves();
