# 🚀 Production-Grade Verification with Helius DAS API

## 📋 **Setup Instructions**

### **Step 1: Get Helius API Key**

1. Go to [https://helius.dev](https://helius.dev)
2. Sign up for a free account
3. Create a new project
4. Copy your API key

### **Step 2: Configure Environment Variables**

Create or update your `.env` file:

```bash
# Add your Helius API key
HELIUS_API_KEY=your_actual_helius_api_key_here

# Node Environment
NODE_ENV=development
```

**Important**: Replace `your_actual_helius_api_key_here` with your real Helius API key!

### **Step 3: Test the Configuration**

```bash
# Test that your API key works
echo $HELIUS_API_KEY
```

## 🔍 **How Production Verification Works**

### **Helius DAS API Integration**

The verification now uses **Helius Digital Asset Standard (DAS) API** which provides:

1. **Real On-Chain Data** - Fetches actual cNFTs from Solana blockchain
2. **Compressed NFT Support** - Properly handles cNFTs in merkle trees
3. **Complete Metadata** - Returns full NFT metadata including attributes
4. **Collection Verification** - Verifies NFT belongs to correct collection
5. **Fast & Reliable** - Optimized for production use

### **What Gets Verified**

For each address in CSV files:

1. **Fetch All Assets** - Gets all NFTs owned by the wallet
2. **Filter cNFTs** - Identifies compressed NFTs
3. **Check Collection** - Verifies NFT is from DealCoin collection
4. **Validate Metadata** - Checks discount attributes (percentage, merchant, expiry, etc.)
5. **Type Verification** - Ensures correct discount type (Hotel/Flight/Dining)
6. **Fraud Detection** - Detects forged or altered NFTs
7. **Provenance Tracking** - Records mint address and ownership

### **Example: Verifying Hotel Discount**

**Input**: `hotel-addresses.csv`
```csv
address
79YxpnhDfXpKSvA85HLUKRcgzNE97fCx8juMomegVW4X
```

**Process**:
1. Call Helius DAS API: `getAssetsByOwner`
2. Filter for cNFTs in our collection
3. Check if NFT has `Category: Hotel` attribute
4. Verify discount percentage, merchant, expiry date
5. Calculate verification score (0-100%)

**Output**:
```
✅ VALID - Score: 90/100
NFT: 20% Off Hotel Stay in Singapore
Discount Type: ✅ Correct (Hotel)
```

## 📊 **Verification Report**

The system generates a tamper-evident JSON report:

```json
{
  "reportId": "VR-1234567890",
  "timestamp": 1698786000000,
  "network": "devnet",
  "totalAddresses": 4,
  "validPromotions": 4,
  "invalidPromotions": 0,
  "averageScore": 87.5,
  "results": [
    {
      "address": "79YxpnhDfXpKSvA85HLUKRcgzNE97fCx8juMomegVW4X",
      "isValid": true,
      "score": 90,
      "nftDetails": {
        "mintAddress": "ABC123...",
        "name": "20% Off Hotel Stay in Singapore",
        "isCompressed": true,
        "collection": "GmkGX3uh17uNCytwJ1qpUmSVCU4DCHysYYetAz5KNZ3e"
      },
      "checks": {
        "addressValid": true,
        "hasNFTBalance": true,
        "metadataExists": true,
        "metadataValid": true,
        "collectionMatch": true,
        "promotionAttributes": true,
        "redemptionCode": true,
        "expiryValid": true
      }
    }
  ],
  "cryptographicProof": {
    "reportHash": "a3f5b2c1d4e5f6a7b8c9d0e1f2a3b4c5...",
    "blockHeight": 416647747,
    "rpcEndpoint": "https://devnet.helius-rpc.com/?api-key=..."
  }
}
```

## 🎯 **Complete Test Commands**

### **1. Setup**
```bash
# Create collection and merkle tree
bun run create:collection
bun run create:tree
```

### **2. Mint Discounts**
```bash
# Option A: Mint all 3 types to addresses.csv
bun run mint:all

# Option B: Mint specific types to specific CSVs
bun run mint:hotel    # Hotel to hotel-addresses.csv
bun run mint:flight   # Flight to flight-addresses.csv
bun run mint:dining   # Dining to dining-addresses.csv
```

### **3. Verify with Helius DAS API**
```bash
# Verify all addresses across all CSV files
bun run verify:promotions
```

## 📈 **Expected Output**

```
🔍 DealCoin Promotion NFT Verification System
============================================================

✅ Expected Collection: GmkGX3uh17uNCytwJ1qpUmSVCU4DCHysYYetAz5KNZ3e

📋 ./addresses.csv: Found 1 address(es) - Expected: All Types
   Main addresses (should have all 3 discount types)

[1/1] Verifying: 6odQQf8251g5Gtb4sDhz8s4ae7DSQmw9D1ZQGwV4Qoae
   Expected Type: All Types
------------------------------------------------------------
   Using Helius DAS API to fetch cNFTs...
   Found 3 asset(s) via DAS API
   Analyzing NFT: 20% Off Hotel Stay in Singapore
   Status: ✅ VALID
   Score: 85/100 (85.0%)
   Checks Passed: 7/8
   NFT Name: 20% Off Hotel Stay in Singapore

📋 ./hotel-addresses.csv: Found 1 address(es) - Expected: Hotel
   Hotel discount addresses

[1/1] Verifying: 79YxpnhDfXpKSvA85HLUKRcgzNE97fCx8juMomegVW4X
   Expected Type: Hotel
------------------------------------------------------------
   Using Helius DAS API to fetch cNFTs...
   Found 1 asset(s) via DAS API
   Analyzing NFT: 20% Off Hotel Stay in Singapore
   Status: ✅ VALID
   Score: 90/100 (90.0%)
   Checks Passed: 8/8
   NFT Name: 20% Off Hotel Stay in Singapore
   Warnings: ✅ Correct discount type: Hotel

============================================================
📊 VERIFICATION SUMMARY
============================================================
Verified 4 addresses across 4 CSV files. 4 valid promotions found (100.0%). 
Average verification score: 87.5%.

📄 Detailed Report: ./data/verification-report-1761259962189.json
🔐 Report Hash: 81b9b4e2ea53db92e3aa051543208142810f8f729ea01193e28bfdd5a7cd7743
📦 Block Height: 416647747

Detailed Results:
------------------------------------------------------------
1. 6odQQf82... | Valid: ✅ | Score: 85.0% | NFT: 20% Off Hotel Stay in Singapore
2. 79YxpnhD... | Valid: ✅ | Score: 90.0% | NFT: 20% Off Hotel Stay in Singapore
3. BkxuGUMY... | Valid: ✅ | Score: 90.0% | NFT: 15% Off Flight to Tokyo
4. 4aLYHreg... | Valid: ✅ | Score: 85.0% | NFT: 30% Off Fine Dining Experience

✅ Verification complete!
```

## 🛡️ **Security Features**

1. **Real On-Chain Verification** - Fetches from Solana blockchain via Helius
2. **cNFT Support** - Properly verifies compressed NFTs
3. **Collection Validation** - Ensures NFT is from correct collection
4. **Type-Specific Checking** - Verifies correct discount type per CSV
5. **Fraud Detection** - Identifies forged/altered NFTs
6. **Tamper-Evident Reports** - SHA-256 hash prevents manipulation
7. **Provenance Tracking** - Records mint address and ownership

## 🚀 **Production Deployment**

For mainnet deployment:

1. Update `.env`:
   ```bash
   NODE_ENV=production
   HELIUS_API_KEY=your_mainnet_api_key
   ```

2. Run verification:
   ```bash
   NODE_ENV=production bun run verify:promotions
   ```

## 📝 **API Rate Limits**

Helius Free Tier:
- 100,000 credits/day
- Each `getAssetsByOwner` call = 100 credits
- Can verify ~1,000 addresses/day

For higher limits, upgrade to Helius Pro.

## ✅ **This Proves "Verifiable NFTs"**

- ✅ Real blockchain data (not mocked)
- ✅ cNFT support via DAS API
- ✅ Collection membership verification
- ✅ Type-specific validation
- ✅ Fraud detection
- ✅ Cryptographic proof
- ✅ Production-grade reliability

**Your promotion NFTs are now truly verifiable on-chain!** 🎉

