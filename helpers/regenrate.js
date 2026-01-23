import bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import hdkey from "ethereumjs-wallet/hdkey";
import * as bitcoin from "bitcoinjs-lib";
import nacl from "tweetnacl";
import tronWeb from "tronweb";
import bs58 from "bs58";

export async function regeneratePrivateKey(mnemonic, chain) {
  // Validate mnemonic
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic provided");
  }

  // Seed from mnemonic
  const seed = await bip39.mnemonicToSeed(mnemonic);

  switch (chain.toLowerCase()) {
    // -----------------------------------------------
    // EVM CHAINS: ETH, BNB, Polygon, etc
    // -----------------------------------------------
    case "eth":
    case "ethereum":
    case "bnb":
    case "bsc":
    case "polygon": {
      const path = "m/44'/60'/0'/0/0"; // standard EVM path
      const wallet = hdkey.fromMasterSeed(seed).derivePath(path).getWallet();

      return {
        privateKey: wallet.getPrivateKeyString(),
        address: "0x" + wallet.getAddress().toString("hex"),
        path
      };
    }

    // -----------------------------------------------
    // BITCOIN
    // -----------------------------------------------
    case "btc":
    case "bitcoin": {
      const path = "m/44'/0'/0'/0/0";
      const root = bitcoin.bip32.fromSeed(seed);
      const child = root.derivePath(path);

      return {
        privateKey: child.toWIF(),
        address: bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address,
        path
      };
    }

    // -----------------------------------------------
    // SOLANA
    // -----------------------------------------------
    case "sol":
    case "solana": {
      const path = "m/44'/501'/0'/0'";
      const derived = derivePath(path, seed.toString("hex"));
      const keypair = nacl.sign.keyPair.fromSeed(derived.key);

      return {
        privateKey: Buffer.from(keypair.secretKey).toString("hex"),
        address: bs58.encode(keypair.publicKey),
        path
      };
    }

    // -----------------------------------------------
    // TRON
    // -----------------------------------------------
    case "trx":
    case "tron": {
      const path = "m/44'/195'/0'/0/0";
      const wallet = hdkey.fromMasterSeed(seed).derivePath(path).getWallet();

      const evmAddress = "0x" + wallet.getAddress().toString("hex");
      const tronAddress = tronWeb.address.fromHex(evmAddress);

      return {
        privateKey: wallet.getPrivateKeyString(),
        address: tronAddress,
        path
      };
    }

    default:
      throw new Error("Unsupported chain");
  }
}
