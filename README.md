# Web3 Multi-Chain Wallet & Tipping API

A lightweight, multi-chain crypto wallet service designed for Web2/Web3 onboarding. It enables instant wallet generation, multi-chain address derivation, balance tracking with live fiat pricing, fee estimation, and flexible transaction signing (both server-side and client-side / non-custodial) across Bitcoin, Solana, Ethereum, Tron, Litecoin, Aptos, Dogecoin, and EVM L2s.

---

## ⚡ Overview: The Google Login & Tipping Flow

This API is designed to bridge Web2 user accounts (like Google Login) with decentralized tipping and multi-chain crypto balances:

```
[User Signs Up / Logs In with Google]
                  │
                  ▼
   1. Backend / Client requests a Mnemonic
      GET /api/wallet/mnemonic
                  │
                  ▼
   2. Derive Multi-Chain Addresses
      POST /api/wallet/address
      └── Instantly generates: BTC, SOL, ETH, LTC, TRON, APTOS, DOGE, USDT/USDC (SOL/ERC20/TRC20)
                  │
                  ▼
   3. Store Public Addresses on User Profile
      └── Anyone can tip the user directly to their public addresses on any chain!
                  │
                  ▼
   4. Withdrawing / Moving Funds (Signing)
      ├── Option A (Server-Assisted): POST /api/wallet/send
      ├── Option B (Client-Side / PIN or Passkey):
      │      1. POST /api/wallet/params  (fetch nonce/utxos/gas/blockhash)
      │      2. Sign transaction client-side with user key/passkey
      │      3. POST /api/wallet/broadcast (broadcast signed raw transaction)
      └── Option C (Hive Keychain Master Signer - The Sovraniche Pattern):
             1. User links their Hive account
             2. Hive Keychain signs a challenge buffer (`requestSignBuffer`)
             3. Signature decrypts the BIP-39 mnemonic in client memory
             4. Client signs ETH, SOL, BTC, LTC transactions using Hive Keychain as the master key!
```

> **🔑 Hive Keychain as a Universal Multi-Chain Signer:**  
> When users link their Hive account, Hive Keychain becomes the master signer for ALL supported chains. By using Keychain's `requestSignBuffer` as the decryption key for the AES-256 encrypted mnemonic, users don't need MetaMask, Phantom, or a separate Bitcoin wallet installed. Hive Keychain secures and authorizes transactions across Bitcoin, Solana, Ethereum, Litecoin, and Tron seamlessly.

> **Note on Bitcoin Lightning:**
> On-chain Bitcoin (`BTC`) addresses are derived via BIP-84 (Native SegWit Bech32 `bc1q...`). Lightning addresses (`user@domain.com` or LNURL) require an active Lightning node/custodial LNURL backend (e.g., LNBits, Alby, or Blink). You can link an LNURL service alongside these on-chain addresses.

---

## 🚀 Live API Endpoint & Base URL

- **Live Production URL:** `https://web3.ezabay.com`
- **API Base Endpoint:** `https://web3.ezabay.com/api`
- **Health Check:** `GET https://web3.ezabay.com/ping`

```bash
# Test if the API is online
curl https://web3.ezabay.com/ping
```

---

## 🔐 Authentication

All requests to `/api/*` endpoints require an API key passed in the request headers:

```http
x-api-key: your_api_key_here
```
*(or as a Bearer token: `Authorization: Bearer your_api_key_here`)*

```bash
# Example authenticated call
curl -X GET https://web3.ezabay.com/api/wallet/mnemonic \
  -H "x-api-key: your_api_key_here"
```

To request an API key for your project or integration, reach out to the core team.

---

## 📡 API Reference

### 1. Generate Mnemonic
Generate a cryptographically secure 12-word BIP-39 seed phrase.

- **Method:** `GET`
- **Endpoint:** `/api/wallet/mnemonic`

#### Response:
```json
{
  "success": true,
  "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
}
```

---

### 2. Derive Multi-Chain Addresses
Takes a BIP-39 mnemonic and derives public addresses and keys for all supported chains.

- **Method:** `POST`
- **Endpoint:** `/api/wallet/address`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
}
```

#### Response:
```json
{
  "success": true,
  "wallets": {
    "BTC": {
      "address": "bc1q...",
      "publicKey": "...",
      "imageUrl": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
    },
    "ETH": {
      "address": "0x...",
      "publicKey": "0x...",
      "privateKey": "...",
      "imageUrl": "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
    },
    "SOL": {
      "address": "9x...",
      "publicKey": "9x...",
      "imageUrl": "https://assets.coingecko.com/coins/images/4128/standard/solana.png"
    },
    "LTC": {
      "address": "ltc1q...",
      "publicKey": "...",
      "privateKey": "...",
      "imageUrl": "https://cryptologos.cc/logos/litecoin-ltc-logo.png"
    },
    "TRON": {
      "address": "T...",
      "publicKey": "...",
      "privateKey": "...",
      "imageUrl": "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png"
    },
    "SOL_USDT": {
      "address": "9x...",
      "imageUrl": "https://cryptologos.cc/logos/tether-usdt-logo.png"
    },
    "BASE": { "address": "0x...", "imageUrl": "..." },
    "POLYGON": { "address": "0x...", "imageUrl": "..." },
    "ARBITRUM": { "address": "0x...", "imageUrl": "..." },
    "DOGE": { "address": "D...", "imageUrl": "..." },
    "APTOS": { "address": "0x...", "imageUrl": "..." }
  }
}
```

---

### 3. Fetch Balances & Live Fiat Prices
Fetches real-time on-chain balances, live USD prices, and calculated USD values for the user's addresses.

- **Method:** `POST`
- **Endpoint:** `/api/wallet/info`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "wallets": {
    "ETH": { "address": "0xYourEthAddress" },
    "SOL": { "address": "YourSolAddress" },
    "BTC": { "address": "bc1qYourBtcAddress" },
    "LTC": { "address": "ltc1qYourLtcAddress" }
  }
}
```

#### Response:
```json
{
  "success": true,
  "walletInfo": [
    {
      "chain": "ETH",
      "symbol": "ETH",
      "address": "0xYourEthAddress",
      "balance": 0.45,
      "price": 2650.00,
      "change24h": 1.85,
      "usdValue": 1192.50
    },
    {
      "chain": "SOL",
      "symbol": "SOL",
      "address": "YourSolAddress",
      "balance": 5.2,
      "price": 175.40,
      "change24h": -0.62,
      "usdValue": 912.08
    }
  ]
}
```

---

### 4. Estimate Transaction Fee
Estimates gas/network fees prior to sending funds.

- **Method:** `POST`
- **Endpoint:** `/api/wallet/fee`

#### Request Body:
```json
{
  "chain": "ETH",
  "from": "0xSenderAddress",
  "to": "0xRecipientAddress",
  "amount": "0.1"
}
```

#### Response:
```json
{
  "success": true,
  "fee": 0.00084,
  "details": {
    "gasLimit": 21000,
    "gasPriceGwei": "15"
  }
}
```

---

### 5. Moving Money Out / Signing Transactions

You have two architectures available depending on whether you want a server-assisted or client-side signing flow:

#### Approach A: Direct Server Send (`/api/wallet/send`)
The server signs and broadcasts the transaction in one call.

- **Method:** `POST`
- **Endpoint:** `/api/wallet/send`

```json
{
  "chain": "SOL",
  "to": "RecipientAddress",
  "amount": "0.5",
  "wallet": {
    "privateKey": "base58EncodedSecretKey"
  }
}
```

#### Approach B: Non-Custodial Client-Side Signing (`params` + `broadcast`)
The server never sees the private key. The client asks for network parameters, signs locally, and asks the server to broadcast.

1. **Get Transaction Parameters:**
   - **Endpoint:** `POST /api/wallet/params`
   ```json
   {
     "chain": "BTC",
     "address": "bc1qYourBtcAddress"
   }
   ```
   *Returns:* UTXOs, fee rate, recent blockhash (Solana), or nonce + gasPrice (EVM).

2. **Sign Locally:**
   - Sign using standard Web3 libraries (`ethers.js`, `@solana/web3.js`, or `@okxweb3/coin-base`).

3. **Broadcast Signed Transaction:**
   - **Endpoint:** `POST /api/wallet/broadcast`
   ```json
   {
     "chain": "BTC",
     "signedTx": "02000000000101..."
   }
   ```
   *Returns:*
   ```json
   {
     "success": true,
     "hash": "8f48b1...e72"
   }
   ```

---

## 🔄 Supported Chains & Tokens

| Asset / Chain | Ticker / Identifier | Address Standard | Notes |
| :--- | :--- | :--- | :--- |
| **Bitcoin** | `BTC` | Bech32 (BIP-84) Native SegWit | Fast UTXO indexer integration |
| **Solana** | `SOL` | Ed25519 Base58 | Mainnet cluster support |
| **Solana USDT** | `SOL_USDT` | SPL Token | SPL Associated Token Account |
| **Ethereum** | `ETH` | EIP-55 (BIP-44) | Native ETH |
| **Litecoin** | `LTC` | Native SegWit (BIP-84) | Low fee tipping |
| **Tron / USDT** | `TRON`, `USDT_TRC20` | Base58 TRC-20 | Zero/low fee transfers |
| **Base** | `BASE` | EVM | Coinbase L2 |
| **Polygon** | `POLYGON` | EVM | Low cost EVM |
| **Arbitrum** | `ARBITRUM`, `ARB` | EVM | Arbitrum One |
| **Dogecoin** | `DOGE` | Legacy (BIP-44) | Micro-tipping |
| **Aptos** | `APTOS` | Short Address format | Move-based VM |
| **Monero** | `XMR` | Standard Address + ViewKey | Privacy asset support |
