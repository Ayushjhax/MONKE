# 🎫 DealCoin Redemption Frontend

Production-grade Next.js frontend for redeeming discount promotion NFTs with on-chain tracking.

## 🚀 Features

### 1. **Merchant: Solana Pay QR Generation** (`/merchant`)
- Generate Solana Pay QR codes for customers
- Customer scans with Solana wallet (Phantom, Solflare)
- Automatic on-chain redemption tracking
- NFT burn for single-use enforcement

### 2. **User: Wallet Redemption** (`/redeem`)
- View all discount NFTs in connected wallet
- One-click redemption via wallet extension
- Real-time NFT fetching via Helius DAS API
- Automatic NFT burn after redemption

## 🔧 Setup

### Prerequisites
- Node.js 18+ or Bun
- Solana wallet browser extension (Phantom, Solflare)
- Helius API key (free at https://helius.dev)

### Installation

```bash
cd frontend
npm install
# or
bun install
```

### Configuration

Create `.env.local`:
```bash
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here
NEXT_PUBLIC_MERCHANT_WALLET=GmkGX3uh17uNCytwJ1qpUmSVCU4DCHysYYetAz5KNZ3e
```

### Run Development Server

```bash
npm run dev
# or
bun run dev
```

Visit http://localhost:3000

## 📋 How It Works

### Solana Pay Redemption Flow

1. **Merchant generates QR code** at `/merchant`
2. **Customer scans QR** with Solana wallet
3. **Wallet shows transaction**:
   - Transfer: 0.000001 SOL to merchant
   - Memo: `{"action":"redeem","nftMint":"...","redemptionCode":"...","timestamp":...}`
4. **Customer approves** transaction
5. **Blockchain records** redemption with memo
6. **NFT is burned** (automatic via smart contract)
7. **Merchant verifies** on-chain proof

### Wallet Extension Redemption Flow

1. **User connects wallet** at `/redeem`
2. **System fetches NFTs** via Helius DAS API
3. **User clicks "Redeem"** on chosen discount
4. **Transaction is created**:
   - Memo instruction with redemption details
   - Transfer 0.000001 SOL to merchant (proof)
5. **User approves** in wallet
6. **Transaction confirmed** on-chain
7. **NFT is burned** to prevent reuse

## 🔥 NFT Burn Implementation

### Why Burn NFTs?

- **Single-Use Enforcement**: Once redeemed, NFT cannot be used again
- **Fraud Prevention**: Cannot screenshot or duplicate
- **On-Chain Proof**: Burn transaction is permanent record
- **Clean State**: No "used" NFTs cluttering wallets

### How Burning Works

```typescript
// After redemption transaction confirms:
1. Memo instruction records redemption details
2. Transfer instruction proves user intent
3. Burn instruction destroys NFT

// For cNFTs (Compressed NFTs):
- Use Metaplex Bubblegum program
- Burn removes leaf from merkle tree
- Permanent and irreversible
```

## 🔐 On-Chain Redemption Tracking

### Memo Program

Every redemption includes a memo with:
```json
{
  "action": "redeem",
  "nftMint": "ABC123...",
  "redemptionCode": "MBS-20OFF-2024",
  "userWallet": "user-address",
  "merchantWallet": "merchant-address",
  "discountValue": 20,
  "timestamp": 1698786000000
}
```

### Verification

Merchants can verify redemptions by:
1. Checking transaction signature on Solana Explorer
2. Reading memo data from transaction
3. Confirming NFT was burned
4. Cross-referencing redemption code

### Query Redemptions

```typescript
// Get all redemptions for a merchant
const signatures = await connection.getSignaturesForAddress(merchantWallet);

// Filter for redemption transactions
const redemptions = signatures.filter(sig => {
  const tx = await connection.getTransaction(sig.signature);
  return tx?.meta?.logMessages?.some(log => log.includes('redeem'));
});
```

## 🎯 Pages

### `/` - Home
- Choose between Merchant or User flow
- Information about on-chain tracking

### `/merchant` - Merchant Dashboard
- Generate Solana Pay QR codes
- View redemption details
- Print QR codes for in-store use

### `/redeem` - User Redemption
- View owned discount NFTs
- Redeem with one click
- See redemption confirmation

## 🛡️ Security Features

1. **Wallet Adapter**: Secure connection to Solana wallets
2. **Transaction Signing**: User must approve each redemption
3. **On-Chain Verification**: All redemptions recorded on blockchain
4. **NFT Burn**: Automatic destruction prevents reuse
5. **Memo Tracking**: Immutable record of redemption details
6. **DAS API**: Real-time NFT ownership verification

## 📊 Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Solana Wallet Adapter** - Wallet integration
- **Solana Web3.js** - Blockchain interaction
- **Solana Pay** - QR code generation
- **Helius DAS API** - NFT data fetching
- **QRCode** - QR code generation

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Environment Variables (Production)

Set in Vercel dashboard:
- `NEXT_PUBLIC_HELIUS_API_KEY`
- `NEXT_PUBLIC_MERCHANT_WALLET`

## 📝 API Endpoints

### GET `/api/verify-redemption?signature=<tx-signature>`
Verify a redemption transaction

### POST `/api/burn-nft`
Burn an NFT after redemption

## 🎯 Testing

### Test on Devnet

1. Get devnet SOL: https://faucet.solana.com
2. Mint test discount NFTs (see parent README)
3. Connect wallet to http://localhost:3000
4. Test redemption flow

### Test Wallets

- Phantom: https://phantom.app
- Solflare: https://solflare.com

## ✅ Verification Checklist

- [ ] Wallet connects successfully
- [ ] NFTs appear in `/redeem` page
- [ ] QR code generates in `/merchant` page
- [ ] Solana Pay URL is valid
- [ ] Transaction approves in wallet
- [ ] Memo data is correct
- [ ] NFT disappears after redemption (burned)
- [ ] Transaction visible on Solana Explorer

## 🔗 Useful Links

- Solana Explorer (Devnet): https://explorer.solana.com/?cluster=devnet
- Helius Dashboard: https://helius.dev
- Solana Pay Spec: https://docs.solanapay.com

## 🆘 Troubleshooting

### "No NFTs found"
- Check wallet is connected to Devnet
- Verify NFTs were minted to this wallet address
- Check Helius API key is valid

### "Transaction failed"
- Ensure sufficient SOL for fees (~0.00001 SOL)
- Check network connection
- Try with fresh blockhash

### "Wallet won't connect"
- Install wallet extension
- Refresh page
- Check wallet is unlocked
- Switch to Devnet in wallet settings

## 🎉 Success!

Your redemption system is now ready with:
- ✅ Solana Pay QR codes
- ✅ Wallet extension redemption
- ✅ On-chain tracking via memos
- ✅ NFT burning for single-use
- ✅ Production-grade security

**Promotions are now truly verifiable and fraud-proof!** 🚀
