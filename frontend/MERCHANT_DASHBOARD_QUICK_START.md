# 🚀 Merchant Dashboard - Quick Start Guide

## What Was Built

A complete merchant dashboard system for creating and minting NFT discount coupons with the following features:

### ✅ Features Implemented

1. **Login System** (`/dashboard/login`)
   - Username/password authentication
   - Automatic Solana wallet creation
   - Private key download for Phantom import
   - Secure session management

2. **Merchant Dashboard** (`/dashboard`)
   - 3 tabs: Setup, Mint NFTs, My Collections
   - Clean, modern UI
   - Real-time feedback and error handling

3. **Collection & Merkle Tree Setup**
   - One-click collection creation
   - One-click merkle tree creation
   - Automatic IPFS upload via Pinata
   - Saves addresses to merchant account

4. **NFT Metadata Form**
   - Complete discount details form
   - Auto-calculated pricing
   - Category selection
   - Image upload to IPFS
   - Expiry date picker

5. **Flexible Minting Options**
   - Send to single address
   - Send to multiple addresses (bulk)
   - Send to self (transfer later)
   - 10-second pause before minting
   - 2-second pause between mints

6. **Pinata IPFS Integration**
   - Automatic image upload
   - Automatic metadata upload
   - CID extraction
   - Custom gateway URLs

## 🏃 Quick Start (5 Minutes)

### 1. Install & Run
```bash
cd frontend
npm install
npm run dev
```

### 2. Set Up Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_HELIUS_API_KEY=22abefb4-e86a-482d-9a62-452fcd4f2cb0
NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyOTViNTI2OS1hYTFkLTRjZWItOWYxYy04YTU5MDE4MmNkMDEiLCJlbWFpbCI6ImF5dXNoa21yamhhQHlhaG9vLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJiYzlkMWExYzFhM2QzMWI1ZTRkMCIsInNjb3BlZEtleVNlY3JldCI6ImI4MzUxMjVhNDVlNDIzNTFhYjg5OTBiZDk0YjI0OTNlOGJiYTBmYzk1YzhlMzgzMGRmMTQwOGI5MzZhNWFhMmEiLCJleHAiOjE3OTI4ODQwMTl9.minD8KdKpn4a2Id58sTITxa_9tF3z4PT7In1DM17P60
NEXT_PUBLIC_PINATA_GATEWAY=https://turquoise-rational-tick-663.mypinata.cloud
```

### 3. Access Dashboard
Visit: **http://localhost:3000/dashboard/login**

### 4. Register Account
- Username: `testmerchant`
- Password: `password123`
- Click "Create Account"

### 5. Download Private Key
- Click "📥 Download Key"
- Save `testmerchant-key.json`
- Import into Phantom wallet (optional)

### 6. Create Collection
- Go to "⚙️ Setup" tab
- Fill in collection details
- Click "🎨 Create Collection"
- Wait ~30 seconds

### 7. Create Merkle Tree
- Still in "⚙️ Setup" tab
- Click "🌳 Create Merkle Tree"
- Wait ~20 seconds

### 8. Mint Your First NFT
- Go to "🎫 Mint NFTs" tab
- Fill in discount details
- Choose "Send to Self"
- Click "🎫 Mint NFT"
- Wait ~15 seconds

### 9. View Result
- Check Solana Explorer link
- View in "📚 My Collections" tab
- See NFT in wallet at `/redeem`

## 📁 Files Created

```
frontend/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                    # Main dashboard
│   │   └── login/
│   │       └── page.tsx                # Login/register page
│   └── page.tsx                        # Updated with dashboard link
├── lib/
│   ├── pinata.ts                       # Pinata IPFS utilities
│   └── merchant-mint.ts                # Minting logic
├── MERCHANT_DASHBOARD_README.md        # Full documentation
└── MERCHANT_DASHBOARD_QUICK_START.md   # This file
```

## 🔑 Key Components

### User Management (`lib/pinata.ts`)
```typescript
createMerchantUser()      // Create new merchant with wallet
verifyMerchantUser()      // Login authentication
getKeypairFromUser()      // Get wallet keypair
downloadKeypair()         // Download private key
```

### Minting (`lib/merchant-mint.ts`)
```typescript
createCollection()        // Create NFT collection
createMerkleTree()        // Create merkle tree
mintDiscountNFT()         // Mint cNFT with metadata
getMerchantCollections()  // Fetch using DAS API
```

## 🎨 UI Features

### Dashboard Tabs
1. **Setup**: Collection & Merkle Tree creation
2. **Mint NFTs**: Full metadata form
3. **My Collections**: View created collections

### Form Features
- Auto-calculated pricing
- Image upload preview
- Recipient mode switcher
- Real-time validation
- Success/error messages

## 🔄 Complete Workflow

```
Register → Download Key → Create Collection → Create Tree → Mint NFT → View Collection
```

## 🛠️ Technical Implementation

### Authentication
- SHA-256 password hashing
- LocalStorage for sessions
- Unique username validation
- Auto-generated Solana wallets

### IPFS Upload
- Pinata API integration
- Image upload support
- Metadata JSON upload
- CID extraction
- Custom gateway URLs

### Minting Process
1. Upload image (if provided)
2. Create metadata with attributes
3. Upload metadata to IPFS
4. Wait 10 seconds
5. Mint cNFT to recipients
6. 2-second pause between mints

### Metadata Structure
```json
{
  "name": "...",
  "description": "...",
  "image": "https://...ipfs/[CID]",
  "attributes": [
    { "trait_type": "Discount Percentage", "value": 20 },
    { "trait_type": "Merchant", "value": "..." },
    { "trait_type": "Category", "value": "Hotel" },
    { "trait_type": "Redemption Code", "value": "..." },
    // ... 12+ more attributes
  ]
}
```

## ✨ What Makes This Special

1. **Zero Blockchain Knowledge Required**
   - Merchants just fill forms
   - Wallets created automatically
   - IPFS uploads automatic

2. **Production-Ready**
   - Complete metadata structure
   - Error handling
   - Real-time feedback
   - Transaction tracking

3. **Flexible Distribution**
   - Single recipient
   - Bulk minting
   - Send to self

4. **Fully Verifiable**
   - All metadata on IPFS
   - CID extraction
   - On-chain verification

## 🎯 Use Cases

1. **Hotel Chains**: Mint discount coupons for guests
2. **Airlines**: Distribute flight vouchers
3. **Restaurants**: Create dining discount NFTs
4. **Retail Stores**: Issue shopping vouchers
5. **Event Organizers**: Mint ticket discounts

## 📊 Supported Categories

- Hotel
- Flight
- Restaurant
- Retail
- Entertainment
- Other (custom)

## 🔐 Security Notes

1. **Private Keys**: Stored in localStorage (client-side)
2. **Passwords**: SHA-256 hashed (upgrade to bcrypt for production)
3. **Session**: Cleared on logout
4. **IPFS**: Public storage (metadata visible)
5. **Transactions**: All on-chain (transparent)

## 🚀 Next Steps

### For Merchants
1. Register account
2. Download private key
3. Get devnet SOL from faucet
4. Create collection
5. Start minting!

### For Developers
1. Review code in `lib/` folder
2. Customize UI in dashboard pages
3. Add backend for production
4. Implement proper authentication
5. Add analytics

## 📝 Example Discount

```json
{
  "name": "20% Off Luxury Hotel",
  "discountPercent": 20,
  "originalPrice": 800,
  "discountedPrice": 640,
  "merchantName": "Grand Hotel",
  "category": "Hotel",
  "location": "Singapore",
  "expiryDate": "2024-12-31",
  "redemptionCode": "HOTEL20-2024"
}
```

## 🎉 Success Indicators

✅ Collection created on Solana  
✅ Metadata uploaded to IPFS  
✅ NFT minted to recipient  
✅ CID extracted and verified  
✅ Viewable in wallet  
✅ Redeemable at `/redeem`  

## 🆘 Common Issues

**"Insufficient SOL"**  
→ Get devnet SOL from faucet.solana.com

**"Pinata upload failed"**  
→ Check JWT token in .env.local

**"Collection not found"**  
→ Wait 10 seconds after creation

**"Wallet not connecting"**  
→ Clear localStorage and try again

## 📚 Documentation

- Full docs: `MERCHANT_DASHBOARD_README.md`
- Code: `lib/pinata.ts`, `lib/merchant-mint.ts`
- UI: `app/dashboard/page.tsx`

## 🎊 You're Ready!

Start minting NFT discount coupons in 5 minutes!

Visit: **http://localhost:3000/dashboard/login**

