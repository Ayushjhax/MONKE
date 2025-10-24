# 🎯 DealCoin - Web3 Discount Marketplace

**Promotions as verifiable cNFTs + Solana Pay redemption = Trustless discount economy**

DealCoin transforms traditional coupons into tradable cNFTs with **Solana Pay-based verification**. Each redemption is a blockchain transaction - atomic, verifiable, and fraud-proof.

## 🚀 **Core Innovation: Solana Pay Redemption**

Unlike traditional QR codes, we use **Solana Pay** for redemption:
- User scans QR → Approves micro-transaction (0.000001 SOL) → **Proof of redemption on-chain**
- No centralized database → No fraud → No counterfeiting
- Time-locked, location-based, and multi-signature redemptions supported

---

## 🌟 Unique Features

### ✅ **Solana Pay Verification** (Our Innovation)

**Problem**: Traditional QR codes can be screenshot, copied, or faked  
**Solution**: Solana Pay redemption = blockchain transaction = unfakeable proof

1. **Standard Redemption**: User scans → Approves 0.000001 SOL transfer → Merchant verified
2. **Time-Locked**: Only valid during specific hours (e.g., dinner 6-10pm)
3. **Location-Based**: GPS coordinates verified before redemption
4. **Multi-Signature**: Both user AND merchant must sign (high-value deals)
5. **Batch Redemption**: Process multiple discounts in single transaction

### ✅ Core Platform Features

- **✨ cNFT Discounts**: Each deal is a Compressed NFT (1000x cheaper than regular NFTs)
- **🏪 Merchant API**: Create, manage, and track discount campaigns
- **👥 User API**: Browse, claim, and manage discount NFTs
- **🔍 Discovery**: Filter by category, location, discount %, expiry
- **🔄 Transferable**: Trade, gift, or resell discount NFTs on secondary market
- **🔗 Integration**: RESTful API for e-commerce, travel sites, POS systems

### 🎯 Problem Solved

Traditional discount platforms (like Groupon) have major limitations:
- ❌ Non-transferable coupons (can't gift or resell)
- ❌ Centralized databases (no verifiability)
- ❌ No secondary market (unused deals go to waste)
- ❌ Limited merchant control

**DealCoin solves all of these with blockchain technology!**

---

## 🏗️ Architecture

```
DealCoin Platform
├── Backend (Node.js + Express)
│   ├── API Server (RESTful API)
│   ├── cNFT Minting Service
│   ├── Redemption Verification
│   └── QR Code Generation
├── Solana Integration
│   ├── Compressed NFTs (via Metaplex Bubblegum)
│   ├── Merkle Tree for scalability
│   └── Collection Management
└── Data Storage
    ├── NFT Metadata (IPFS)
    ├── Deals Database (JSON for MVP)
    └── Merchant Registry
```

---

## 🎯 **What Makes This Unique**

### Traditional Coupon Verification
```
Merchant: "Show me your coupon"
User: Shows screenshot ❌ (could be fake/reused)
Merchant: Manual validation ❌ (slow, error-prone)
```

### DealCoin Solana Pay Verification
```
1. User scans Solana Pay QR
2. Wallet shows: "Approve 0.000001 SOL transfer"
3. User approves → Transaction on blockchain
4. Merchant sees: "Verified on-chain ✅"
Result: Unfakeable, instant, trustless!
```

**Innovation**: Redemption IS a blockchain transaction. Can't be faked, can't be reused, fully verifiable.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Solana CLI tools
- A Solana wallet with devnet SOL

### Installation

1. **Clone and install dependencies**:
```bash
cd /Users/ayush/Downloads/ssf_s8
npm install
```

2. **Set up environment variables**:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your settings
# SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
# NODE_ENV=development
```

3. **Create NFT Collection and Merkle Tree**:
```bash
# Create collection (one-time setup)
npm run create:collection

# Create merkle tree (one-time setup)
npm run create:tree
```

4. **Setup demo data**:
```bash
node scripts/setup-demo.ts
```

5. **Start the API server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

---

## 📖 Usage

### For Merchants

**1. Register your business**:
```bash
curl -X POST http://localhost:3001/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "my-business",
    "businessName": "My Amazing Restaurant",
    "businessType": "Restaurant",
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "logoUrl": "https://example.com/logo.png",
    "description": "Great food and service"
  }'
```

**2. Create a deal**:
```bash
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "title": "20% Off Dinner",
    "description": "Valid for any dinner entrée",
    "imageUrl": "https://example.com/deal.jpg",
    "discountPercent": 20,
    "originalPrice": 100,
    "merchantId": "my-business",
    "merchantWallet": "YOUR_WALLET_ADDRESS",
    "category": "Restaurant",
    "location": "New York",
    "expiryDate": "2024-12-31T23:59:59Z",
    "maxUses": 1,
    "termsAndConditions": "Valid for dinner only"
  }'
```

**3. View your deals**:
```bash
curl http://localhost:3001/api/merchants/my-business/deals
```

### For Users

**1. Browse available deals**:
```bash
# All deals
curl http://localhost:3001/api/deals

# Filter by category
curl http://localhost:3001/api/deals?category=Restaurant

# Filter by location
curl http://localhost:3001/api/deals?location=Singapore
```

**2. Claim a deal**:
```bash
curl -X POST http://localhost:3001/api/deals/DEAL-ID/claim \
  -H "Content-Type: application/json" \
  -d '{"userWallet": "YOUR_WALLET_ADDRESS"}'
```

**3. Generate QR code for redemption**:
```bash
curl -X POST http://localhost:3001/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "discountMint": "NFT_MINT_ADDRESS",
    "redemptionCode": "DEAL-CODE",
    "merchantId": "merchant-id"
  }'
```

### For Redemption (POS System)

**1. Scan QR code and verify**:
```bash
curl -X POST http://localhost:3001/api/redemption/verify \
  -H "Content-Type: application/json" \
  -d '{
    "discountMint": "NFT_MINT_ADDRESS",
    "redemptionCode": "DEAL-CODE",
    "merchantId": "merchant-id"
  }'
```

**2. Process redemption**:
```bash
curl -X POST http://localhost:3001/api/redemption/process \
  -H "Content-Type: application/json" \
  -d '{
    "discountMint": "NFT_MINT_ADDRESS",
    "redemptionCode": "DEAL-CODE",
    "userWallet": "USER_WALLET",
    "merchantId": "merchant-id",
    "merchantSignature": "SIGNATURE"
  }'
```

---

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)**: Complete API reference
- **[Integration Guide](./INTEGRATION_GUIDE.md)**: How to integrate DealCoin into your app
- **[Type Definitions](./types/discount.ts)**: TypeScript types and interfaces

---

## 🎯 API Endpoints

### Deals
- `GET /api/deals` - Get all deals with filtering
- `GET /api/deals/:id` - Get deal by ID
- `POST /api/deals` - Create new deal
- `POST /api/deals/:id/claim` - Claim a deal
- `GET /api/deals/category/:category` - Get deals by category
- `GET /api/deals/location/:location` - Get deals by location
- `GET /api/deals/merchant/:merchantId` - Get merchant deals

### Merchants
- `GET /api/merchants` - Get all merchants
- `GET /api/merchants/:id` - Get merchant by ID
- `POST /api/merchants` - Register merchant
- `GET /api/merchants/:id/deals` - Get merchant's deals

### Redemption
- `POST /api/redemption/verify` - Verify discount
- `POST /api/redemption/process` - Process redemption
- `GET /api/redemption/history/:wallet` - Get redemption history

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/scan` - Process scanned QR code

---

## 🔧 Technical Stack

- **Blockchain**: Solana (Devnet)
- **NFT Standard**: Compressed NFTs (Metaplex Bubblegum)
- **Backend**: Node.js + Express + TypeScript
- **Storage**: IPFS (for metadata), JSON (for MVP database)
- **QR Codes**: qrcode library
- **API**: RESTful with JSON responses

---

## 📦 Project Structure

```
ssf_s8/
├── api/                    # API server
│   ├── server.ts          # Main server file
│   ├── routes/            # API routes
│   │   ├── deals.ts
│   │   ├── merchants.ts
│   │   ├── redemption.ts
│   │   └── qr.ts
│   └── services/          # Business logic
│       ├── deal-service.ts
│       └── merchant-service.ts
├── lib/                   # Core libraries
│   ├── discount-minter.ts      # cNFT minting
│   ├── discount-metadata.ts    # Metadata generation
│   ├── redemption-verifier.ts  # Verification logic
│   ├── qr-generator.ts         # QR code generation
│   └── ipfs-uploader.ts        # IPFS integration
├── types/                 # TypeScript types
│   └── discount.ts
├── scripts/               # Utility scripts
│   └── setup-demo.ts     # Demo data setup
├── data/                  # Data storage
│   ├── deals.json
│   ├── merchants.json
│   ├── collectionMintDevnet.txt
│   └── merkleTreeDevnet.txt
├── 1_createNFTCollection.ts   # Collection setup
├── 2_createMerkleTree.ts      # Merkle tree setup
├── 3_mintCNFT.ts              # Original minting script
├── config.ts                   # Configuration
├── package.json
└── README.md
```

---

## 🎨 Demo Deals

The platform comes with 6 demo deals across different categories:

1. **🏨 20% Off Luxury Hotel** - Marina Bay Sands, Singapore
2. **✈️ 15% Off Flight to Tokyo** - SkyTravel Airlines
3. **🍽️ 30% Off Michelin Dining** - Le Cordon Bleu, Paris
4. **🪂 25% Off Skydiving** - Adventure Sports, Dubai
5. **👗 40% Off Designer Fashion** - Fashion Forward, New York
6. **💆 50% Off Spa Retreat** - Marina Bay Sands, Singapore

---

## 🔐 Security Features

- ✅ **On-chain verification** - NFT ownership verified via blockchain
- ✅ **Time-limited QR codes** - QR codes expire after 10 minutes
- ✅ **Merchant signatures** - Cryptographic proof of merchant authorization
- ✅ **Usage tracking** - Prevent double-spending with usage counters
- ✅ **Expiry enforcement** - Automatic expiry date checking

---

## 🌐 Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Get all hotel deals
const deals = await axios.get('http://localhost:3001/api/deals?category=Hotel');

// Claim a deal
await axios.post('http://localhost:3001/api/deals/DEAL-ID/claim', {
  userWallet: 'YOUR_WALLET'
});
```

### Python
```python
import requests

# Get all deals
deals = requests.get('http://localhost:3001/api/deals').json()

# Create a deal
requests.post('http://localhost:3001/api/deals', json=deal_data)
```

### cURL
```bash
# Get deals
curl http://localhost:3001/api/deals

# Claim deal
curl -X POST http://localhost:3001/api/deals/DEAL-ID/claim \
  -H "Content-Type: application/json" \
  -d '{"userWallet": "YOUR_WALLET"}'
```

---

## 🚧 Roadmap

### Phase 1: MVP (Current)
- ✅ Core API functionality
- ✅ cNFT minting
- ✅ Deal management
- ✅ QR code generation
- ✅ Redemption verification

### Phase 2: Frontend (Next)
- 🔲 Next.js web application
- 🔲 Merchant dashboard UI
- 🔲 User marketplace UI
- 🔲 Wallet integration

### Phase 3: Advanced Features
- 🔲 Real travel API integration (Skyscanner, Booking.com)
- 🔲 Social features (ratings, reviews, sharing)
- 🔲 NFT marketplace integration
- 🔲 Staking and rewards
- 🔲 Group deals
- 🔲 Geo-based discovery

### Phase 4: Production
- 🔲 Mainnet deployment
- 🔲 Real IPFS/Arweave integration
- 🔲 Mobile apps (iOS/Android)
- 🔲 Advanced analytics
- 🔲 Merchant verification system

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see LICENSE file for details

---

## 💡 Why DealCoin Will Win

1. **✅ Solves Real Problem**: Traditional discount platforms trap users with non-transferable coupons
2. **✅ Technical Innovation**: Uses cutting-edge cNFTs for scalability and cost-efficiency
3. **✅ Complete Solution**: End-to-end platform from creation to redemption
4. **✅ Easy Integration**: RESTful API makes it simple to integrate anywhere
5. **✅ Real-world Utility**: Actual savings on flights, hotels, restaurants, and more
6. **✅ Web3-native**: Truly decentralized and user-owned
7. **✅ Scalable**: Compressed NFTs handle thousands of discounts efficiently
8. **✅ Merchant-friendly**: Easy dashboard for creating and managing deals

---

## 📞 Support

- **Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Integration**: See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **GitHub Issues**: Report bugs and request features
- **Email**: support@dealcoin.app

---

## 🎉 Get Started Now!

```bash
# 1. Setup demo data
node scripts/setup-demo.ts

# 2. Start API server
npm run dev

# 3. Test the API
curl http://localhost:3001/api/deals

# 4. View API documentation
open http://localhost:3001/api/docs
```

**Built for the MonkeDAO Hackathon** 🐒🚀

Transform discounts into digital assets. Make deals truly user-owned. Welcome to the future of discount marketplaces!

