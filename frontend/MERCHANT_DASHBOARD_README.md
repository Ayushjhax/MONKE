# 🏪 Merchant Dashboard - NFT Coupon Creation System

A complete merchant dashboard for creating and minting NFT discount coupons on Solana with automatic IPFS upload via Pinata.

## 🎯 Features

### 1. **Merchant Authentication System**
- ✅ Username/password login
- ✅ Automatic Solana wallet creation for each merchant
- ✅ Secure keypair storage in localStorage
- ✅ Download private key for Phantom wallet import
- ✅ Session management

### 2. **One-Click Collection & Merkle Tree Setup**
- ✅ Create NFT collection with custom metadata
- ✅ Create Merkle Tree for compressed NFTs (cNFTs)
- ✅ Automatic Pinata IPFS upload
- ✅ Supports up to 16,384 NFTs per tree
- ✅ Saved to merchant's account

### 3. **NFT Metadata Form Builder**
- ✅ Complete form for discount details
- ✅ Auto-calculated pricing (discount percentage)
- ✅ Category selection (Hotel, Flight, Restaurant, etc.)
- ✅ Expiry date picker
- ✅ Image upload to Pinata IPFS
- ✅ Generates complete NFT metadata with attributes

### 4. **Flexible Minting Options**
- ✅ **Single Address**: Mint to one specific wallet
- ✅ **Multiple Addresses**: Mint to many wallets (one per line)
- ✅ **Send to Self**: Mint to merchant's wallet for later transfer
- ✅ 10-second pause between metadata upload and minting
- ✅ 2-second pause between multiple mints

### 5. **IPFS Integration**
- ✅ Automatic upload to Pinata
- ✅ CID extraction from IPFS URL
- ✅ Uses custom Pinata gateway
- ✅ Supports both JSON metadata and images
- ✅ Complete metadata with all discount attributes

### 6. **Solana DAS API Integration**
- ✅ Fetch merchant's collections
- ✅ View all minted NFTs
- ✅ Real-time asset tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Solana wallet extension (for testing redemptions)

### Installation

```bash
cd frontend
npm install
# or
bun install
```

### Environment Setup

Create `.env.local` in the `frontend` directory:

```bash
# Helius API Key
NEXT_PUBLIC_HELIUS_API_KEY=22abefb4-e86a-482d-9a62-452fcd4f2cb0

# Solana RPC
NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=bc9d1a1c1a3d31b5e4d0
NEXT_PUBLIC_PINATA_API_SECRET=b835125a45e42351ab8990bd94b2493e8bba0fc95c8e3830df1408b936a5aa2a
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyOTViNTI2OS1hYTFkLTRjZWItOWYxYy04YTU5MDE4MmNkMDEiLCJlbWFpbCI6ImF5dXNoa21yamhhQHlhaG9vLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJiYzlkMWExYzFhM2QzMWI1ZTRkMCIsInNjb3BlZEtleVNlY3JldCI6ImI4MzUxMjVhNDVlNDIzNTFhYjg5OTBiZDk0YjI0OTNlOGJiYTBmYzk1YzhlMzgzMGRmMTQwOGI5MzZhNWFhMmEiLCJleHAiOjE3OTI4ODQwMTl9.minD8KdKpn4a2Id58sTITxa_9tF3z4PT7In1DM17P60
NEXT_PUBLIC_PINATA_GATEWAY=https://turquoise-rational-tick-663.mypinata.cloud
```

### Run Development Server

```bash
npm run dev
# or
bun run dev
```

Visit **http://localhost:3000/dashboard/login**

## 📋 How to Use

### Step 1: Register Merchant Account

1. Go to `/dashboard/login`
2. Click "Register" tab
3. Choose a unique username (min 3 characters)
4. Create a password (min 6 characters)
5. Click "Create Account"

**What Happens:**
- A new Solana wallet is generated automatically
- Your wallet's public key is displayed
- Credentials stored securely in localStorage
- You're automatically logged in

### Step 2: Download Your Private Key

1. In the dashboard, click "📥 Download Key"
2. A `username-key.json` file is downloaded
3. **Import this into Phantom wallet** to use your merchant wallet
4. Keep this file safe - it's your wallet's private key!

### Step 3: Create NFT Collection

1. Go to "⚙️ Setup" tab
2. Fill in collection details:
   - **Name**: e.g., "DealCoin Discounts"
   - **Symbol**: e.g., "DEAL"
   - **Description**: Describe your collection
   - **Image URL**: Collection image (can use existing URL)
3. Click "🎨 Create Collection"
4. Wait ~30 seconds (uploads to IPFS + creates on-chain)
5. Collection address is saved automatically

### Step 4: Create Merkle Tree

1. Still in "⚙️ Setup" tab
2. Click "🌳 Create Merkle Tree"
3. Wait ~20 seconds
4. Merkle tree supports up to 16,384 NFTs
5. Address is saved automatically

### Step 5: Mint Discount NFT

1. Go to "🎫 Mint NFTs" tab
2. Fill in discount details:
   - **NFT Name**: e.g., "20% Off Hotel Stay"
   - **Description**: Detailed description
   - **Discount %**: e.g., 20
   - **Original Price**: e.g., 800
   - **Discounted Price**: Auto-calculated
   - **Merchant Name**: Your business name
   - **Category**: Hotel/Flight/Restaurant/etc.
   - **Location**: Where it's valid
   - **Expiry Date**: When it expires
   - **Redemption Code**: Unique code (e.g., HOTEL20-2024)
3. **(Optional)** Upload an image
4. Choose recipient mode:
   - **Single Address**: One wallet
   - **Multiple Addresses**: Many wallets (one per line)
   - **Send to Self**: Your wallet (transfer later)
5. Click "🎫 Mint NFT"
6. Wait for completion (metadata upload + minting)

### Step 6: View Your Collections

1. Go to "📚 My Collections" tab
2. See all your created collections
3. View minted NFTs

## 🔐 Security & Key Management

### Wallet Creation
- Each merchant gets a unique Solana wallet
- Generated using Ed25519 keypair
- Stored securely in localStorage

### Private Key Storage
```json
// Example key.json format
[123, 45, 67, ...]  // 64-byte secret key array
```

### Import to Phantom Wallet

1. Download key.json from dashboard
2. Open Phantom wallet
3. Settings → Add/Import Account
4. Select "Import Private Key"
5. Paste the contents of key.json
6. Your merchant wallet is now in Phantom!

## 🎨 NFT Metadata Structure

Every minted NFT includes comprehensive metadata:

```json
{
  "name": "20% Off Hotel Stay",
  "symbol": "DEAL",
  "description": "Experience luxury with exclusive savings",
  "image": "https://turquoise-rational-tick-663.mypinata.cloud/ipfs/[CID]",
  "external_url": "https://dealcoin.app/deals/HOTEL20-2024",
  "attributes": [
    { "trait_type": "Discount Percentage", "value": 20 },
    { "trait_type": "Original Price", "value": "$800" },
    { "trait_type": "Discounted Price", "value": "$640" },
    { "trait_type": "Savings", "value": "$160" },
    { "trait_type": "Merchant", "value": "Luxury Hotels" },
    { "trait_type": "Category", "value": "Hotel" },
    { "trait_type": "Location", "value": "Singapore" },
    { "trait_type": "Expiry Date", "value": "2024-12-31" },
    { "trait_type": "Redemption Code", "value": "HOTEL20-2024" },
    { "trait_type": "Status", "value": "Active" },
    { "trait_type": "Platform", "value": "DealCoin" },
    { "trait_type": "NFT Type", "value": "Compressed NFT" }
  ]
}
```

## 📡 Solana DAS API Usage

### Get Merchant's Collections
```typescript
const collections = await getMerchantCollections(merchantPublicKey);
```

### Get Assets in Collection
```typescript
const assets = await getCollectionAssets(collectionMint);
```

## 🔄 Minting Process Flow

```
1. Merchant fills form
   ↓
2. Upload image to Pinata (if provided)
   ↓
3. Create complete metadata with attributes
   ↓
4. Upload metadata JSON to Pinata
   ↓
5. Extract CID from IPFS URL
   ↓
6. Wait 10 seconds (as requested)
   ↓
7. Mint cNFT to recipient(s)
   ↓
8. Wait 2 seconds between each mint
   ↓
9. Return transaction signatures
```

## 🛠️ Technical Details

### Compressed NFTs (cNFTs)
- Uses Metaplex Bubblegum program
- Merkle tree depth: 14 (supports 16,384 NFTs)
- Buffer size: 64
- Cost: ~0.00001 SOL per mint

### IPFS Storage
- Pinata API for uploads
- Custom gateway for access
- Permanent storage
- CID extraction for verification

### Authentication
- SHA-256 password hashing
- Username uniqueness check
- LocalStorage for session
- Auto-logout on browser close

## 🔍 Viewing Minted NFTs

### In Phantom Wallet
1. Connect to Devnet
2. View Collectibles tab
3. See your minted discount NFTs

### On Solana Explorer
1. Each mint transaction opens in explorer
2. View on-chain data
3. Verify metadata on IPFS

### In User Redemption Page
1. Go to `/redeem`
2. Connect wallet
3. See all discount NFTs
4. Can redeem and burn

## 📊 Collection Management

### Saved Data (per merchant)
- Collection mint address
- Merkle tree address
- Minted NFT signatures
- Metadata CIDs

### LocalStorage Keys
```
dealcoin_merchant_users           // All merchant accounts
dealcoin_current_merchant          // Current session
merchant_{username}_collection     // Collection address
merchant_{username}_merkleTree     // Tree address
```

## ⚡ Performance

- Collection creation: ~30 seconds
- Merkle tree creation: ~20 seconds
- Single NFT mint: ~15 seconds
- Batch mint (10 NFTs): ~1-2 minutes
- Image upload: ~5 seconds
- Metadata upload: ~3 seconds

## 🚨 Important Notes

1. **Private Keys**: Download and save your key.json immediately
2. **Devnet Only**: Currently configured for Solana Devnet
3. **IPFS Uploads**: All metadata permanently stored on IPFS
4. **Merkle Tree Limit**: Max 16,384 NFTs per tree
5. **Collection Verification**: Auto-verified by creator

## 🎯 Production Checklist

- [ ] Switch to Mainnet RPC URLs
- [ ] Use production Pinata account
- [ ] Implement proper password hashing (bcrypt)
- [ ] Add database for user management
- [ ] Implement rate limiting
- [ ] Add email verification
- [ ] Set up monitoring and logging
- [ ] Add transaction fee estimation
- [ ] Implement retry logic for failed uploads
- [ ] Add bulk minting optimization

## 🆘 Troubleshooting

### "Failed to create collection"
- Check your wallet has SOL for fees (~0.01 SOL)
- Verify Pinata credentials
- Check RPC connection

### "Merkle tree creation failed"
- Ensure you have enough SOL (~0.1 SOL)
- Try again after a few seconds

### "Mint failed"
- Verify collection and merkle tree exist
- Check recipient addresses are valid
- Ensure sufficient SOL for fees

### "Image upload failed"
- Check file size (<10MB recommended)
- Verify Pinata API key is valid
- Try a different image format

## 📝 Example Workflow

```
1. Register as merchant "LuxuryHotels"
2. Download private key
3. Create collection "Luxury Hotel Deals"
4. Create merkle tree
5. Mint "20% Off" discount NFT
6. Send to 100 customer wallets
7. Customers redeem via /redeem page
8. NFTs burned after redemption
9. Create new discount campaign
10. Repeat!
```

## 🎉 Success!

You now have a complete merchant dashboard that:
- ✅ Creates NFT collections automatically
- ✅ Mints discount coupons as cNFTs
- ✅ Uploads metadata to IPFS via Pinata
- ✅ Manages merchant authentication
- ✅ Supports bulk minting
- ✅ Integrates with Solana DAS API
- ✅ Works seamlessly with redemption system

**Start creating verifiable, tradable, fraud-proof discount coupons on Solana!** 🚀

