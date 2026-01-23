import * as cryptoLib from "@okxweb3/crypto-lib";
import * as ethLib from "@okxweb3/coin-ethereum";
import * as btcLib from "@okxweb3/coin-bitcoin";
import * as solLib from "@okxweb3/coin-solana";
import * as tronLib from "@okxweb3/coin-tron";
import * as aptosLib from "@okxweb3/coin-aptos";
import * as bip32 from "bip32";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

export const getMnemonic = async () => {
    const mnemonic = cryptoLib.bip39.generateMnemonic(128);
      console.log("🔑 Test Mnemonic........:", mnemonic);
      return mnemonic;
}

export async function getWalletForChain(chain, mnemonic) {
  switch (chain) {
    // ---------------- ETH ----------------
    case "ETH": {
      const seed = await cryptoLib.bip39.mnemonicToSeed(mnemonic);
      const root = cryptoLib.bip32.fromSeed(seed);
      const child = root.derivePath("m/44'/60'/0'/0/0");

      const privateKey = child.privateKey.toString("hex");
      const publicKey = ethLib.privateToPublic(Buffer.from(privateKey, "hex"));
      const address = ethLib.privateToAddress(Buffer.from(privateKey, "hex"));

      return {
        address: ethLib.bufferToHex(address),
        publicKey: ethLib.bufferToHex(publicKey),
        privateKey
      };
    }

    // ---------------- SOL ----------------
    case "SOL": {
        // 1. mnemonic -> seed
        const seed = await bip39.mnemonicToSeed(mnemonic);
      
        // 2. derive Solana path
        const derived = derivePath("m/44'/501'/0'/0'", seed.toString("hex"));
      
        // 3. create Keypair from 32-byte seed
        const keypair = Keypair.fromSeed(derived.key); // full secretKey = 64 bytes
      
        // 4. base58 encode the 64-byte secretKey for OKX
        const base58PrivateKey = bs58.encode(keypair.secretKey);
      
        // 5. get public key using OKX function
        const publicKey = solLib.api.getNewAddress(base58PrivateKey);
      
        return {
          address: publicKey,
          publicKey,
          // privateKey: base58PrivateKey,
        };
      }

      // ---------------- TRON ----------------
      case "TRON": {
        const seed = await bip39.mnemonicToSeed(mnemonic);
      
        const derived = derivePath("m/44'/195'/0'/0'", seed.toString("hex"));
        const privateKeyHex = derived.key.toString("hex");
      
        const address = tronLib.addressFromPrivate(privateKeyHex);
      
        // Get raw public key buffer
        const publicKeyBuffer = tronLib.getPubKeyFromPriKey(privateKeyHex);
      
        return {
          address,
          publicKey: Buffer.from(publicKeyBuffer).toString("hex"), // <-- FIX HERE
          // privateKey: privateKeyHex
        };
      }
      
      case "BNB": {
        // use the same derivation as ETH
        const seed = await cryptoLib.bip39.mnemonicToSeed(mnemonic);
        const root = cryptoLib.bip32.fromSeed(seed);
        const child = root.derivePath("m/44'/60'/0'/0/0");
      
        const privateKey = child.privateKey.toString("hex");
        const publicKey = ethLib.privateToPublic(Buffer.from(privateKey, "hex"));
        const address = ethLib.privateToAddress(Buffer.from(privateKey, "hex"));
      
        return {
          address: ethLib.bufferToHex(address),
          publicKey: ethLib.bufferToHex(publicKey),
          // privateKey
        };
      }

        // ---------------- BTC ----------------
        case "BTC": {
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const root = cryptoLib.bip32.fromSeed(seed);
            // Standard BTC path for first account, first address
            const child = root.derivePath("m/44'/0'/0'/0/0"); 
        
            const privateKey = child.toWIF(); // WIF format private key
            const wallet = new btcLib.BtcWallet();
            
            const addressData = await wallet.getNewAddress({ privateKey });
        
            return {
                address: addressData.address,
                publicKey: addressData.publicKey,
                // privateKey
            };
        }
        
        // ---------------- APTOS ----------------
        case "APTOS": {
            const wallet = new aptosLib.AptosWallet();
            const param = {
              mnemonic,
              hdPath: "m/44'/637'/0'/0'/0'"
            };
            // 1️⃣ derive private key from mnemonic
            const privateKey = await wallet.getDerivedPrivateKey(param);
          
            // 2️⃣ get address from derived private key
            const addressData = await wallet.getNewAddress({
              privateKey,
              addressType: "short" // default OKX short address
            });
          
            return {
              address: addressData.address,
              publicKey: addressData.publicKey,
              // privateKey
            };
          }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}


///////will use this later for ezabay
export async function getWalletForChainAtIndex(chain, mnemonic, index = 0) {
  const seedBuffer = await bip39.mnemonicToSeed(mnemonic);

  switch (chain) {
    case "ETH":
    case "BNB": {
      const root = cryptoLib.bip32.fromSeed(seedBuffer);
      const path = `m/44'/60'/0'/0/${index}`;
      const child = root.derivePath(path);

      const privateKey = child.privateKey.toString("hex");
      const publicKey = ethLib.privateToPublic(Buffer.from(privateKey, "hex"));
      const address = ethLib.privateToAddress(Buffer.from(privateKey, "hex"));

      return {
        address: ethLib.bufferToHex(address),
        publicKey: ethLib.bufferToHex(publicKey),
        privateKey,
      };
    }

    case "BTC": {
      const root = cryptoLib.bip32.fromSeed(seedBuffer);
      const path = `m/44'/0'/0'/0/${index}`;
      const child = root.derivePath(path);

      const privateKey = child.toWIF();
      const wallet = new btcLib.BtcWallet();
      const addressData = await wallet.getNewAddress({ privateKey });

      return {
        address: addressData.address,
        publicKey: addressData.publicKey,
        privateKey,
      };
    }

    case "SOL": {
      const path = `m/44'/501'/${index}'/0'`;
      const derived = derivePath(path, seedBuffer.toString("hex"));
      const keypair = Keypair.fromSeed(derived.key);
      const base58PrivateKey = bs58.encode(keypair.secretKey);
      const publicKey = solLib.api.getNewAddress(base58PrivateKey);

      return {
        address: publicKey,
        publicKey,
        privateKey: base58PrivateKey,
      };
    }

    case "TRON": {
      const path = `m/44'/195'/0'/0/${index}`;
      const derived = derivePath(path, seedBuffer.toString("hex"));
      const privateKeyHex = derived.key.toString("hex");
      const address = tronLib.addressFromPrivate(privateKeyHex);
      const publicKey = Buffer.from(tronLib.getPubKeyFromPriKey(privateKeyHex)).toString("hex");

      return { address, publicKey, privateKey: privateKeyHex };
    }

    case "APTOS": {
      const wallet = new aptosLib.AptosWallet();
      const hdPath = `m/44'/637'/0'/0'/${index}`;
      const privateKey = await wallet.getDerivedPrivateKey({ mnemonic, hdPath });
      const addressData = await wallet.getNewAddress({ privateKey, addressType: "short" });

      return { address: addressData.address, publicKey: addressData.publicKey, privateKey };
    }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
