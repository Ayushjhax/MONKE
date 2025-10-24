# 🎫 Single-Use Coupon System with On-Chain NFT Burning

## 🎯 Problem Solved

**Challenge**: Ensure discount NFTs can only be used once and prevent double-spending.

**Solution**: Implement actual on-chain NFT burning using Metaplex Bubblegum + merchant verification system.

---

## 🏗️ System Architecture

### 1. **NFT Redemption Flow**

```
User has cNFT → Initiates Redemption → System fetches asset data → 
Computes proper hashes → Creates burn transaction → NFT permanently destroyed → 
Redemption recorded on-chain
```

### 2. **Key Components**

#### A. **Proper Hash Computation** (`frontend/lib/burn-nft.ts`)
- Fetches complete asset data from Helius DAS API
- Computes `dataHash` from NFT metadata (name, symbol, URI)
- Computes `creatorHash` from creators array
- Uses keccak_256 hashing (required by Bubblegum)

```typescript
// Fetch full asset data
const assetData = await fetchAssetDataForBurn(nftMint, heliusApiKey);

// Returns:
{
  merkleTree: string,
  leafIndex: number,
  root: Buffer,
  dataHash: Buffer,      // ✅ Properly computed
  creatorHash: Buffer,   // ✅ Properly computed
  proof: PublicKey[],
  nonce: number
}
```

#### B. **Burn Transaction Creation**
- Adds compute budget instruction (150,000 units)
- Adds memo instruction for redemption tracking
- **Adds Bubblegum burn instruction** with proper hashes
- Transaction size optimized to stay under 1232 bytes

```typescript
const burnInstruction = await createBubblegumBurnInstruction({
  merkleTree,
  treeAuthority,
  leafOwner,
  leafDelegate,
  leafIndex,
  root,
  dataHash,      // ✅ From asset metadata
  creatorHash,   // ✅ From creators
  nonce,
  proof
});
```

#### C. **Merchant Verification** (`frontend/app/verify/page.tsx`)
- Merchants can verify redemptions by transaction signature
- Checks if Bubblegum burn instruction was executed
- Extracts redemption details from transaction memo
- Confirms NFT was permanently destroyed

---

## 🔥 How NFT Burning Works

### Step 1: User Initiates Redemption
```typescript
// User clicks "Redeem This Discount"
await redeemNFT(nft);
```

### Step 2: Fetch Complete Asset Data
```typescript
// Fetch asset proof AND full metadata
const assetData = await fetchAssetDataForBurn(nft.mint, HELIUS_API_KEY);

// Get proof data
const proofData = await getAssetProof(assetId);

// Get full asset metadata
const assetMetadata = await getAsset(assetId);

// Compute hashes
const dataHash = computeDataHash(metadata.name, metadata.symbol, metadata.uri);
const creatorHash = computeCreatorHash(creators);
```

### Step 3: Create Burn Transaction
```typescript
const transaction = await createRealBurnTransaction(connection, {
  nftMint: nft.mint,
  userWallet: publicKey.toBase58(),
  merchantWallet: merchantWallet,
  redemptionCode: nft.redemptionCode,
  discountValue: nft.discountPercent,
  merkleTree: assetData.merkleTree,
  leafIndex: assetData.leafIndex,
  root: assetData.root,
  proof: assetData.proof,
  dataHash: assetData.dataHash,    // ✅ Proper hash
  creatorHash: assetData.creatorHash, // ✅ Proper hash
  nonce: assetData.nonce
});
```

### Step 4: Send Transaction
```typescript
// Check balance
const balance = await connection.getBalance(publicKey);

// Simulate transaction
await connection.simulateTransaction(transaction);

// Send transaction
const signature = await sendTransaction(transaction, connection);

// Wait for confirmation
await connection.confirmTransaction({
  signature,
  blockhash,
  lastValidBlockHeight
});
```

### Step 5: NFT is Burned
- Bubblegum program updates merkle tree
- NFT leaf is marked as burned
- NFT no longer exists in user's wallet
- **Cannot be recovered or reused**

---

## 🛡️ Single-Use Enforcement

### Method 1: On-Chain Burn (Primary)
- NFT is permanently destroyed via Bubblegum program
- Merkle tree updated to remove the leaf
- **Cryptographically impossible to reuse**
- No database needed

### Method 2: Merchant Verification (Secondary)
- Merchant verifies transaction signature
- Checks if burn instruction was executed
- Confirms NFT ownership history
- Validates redemption code and details

### Method 3: Double-Spend Prevention
```typescript
// Check if NFT still exists
const asset = await getAsset(nftMint);

if (!asset || asset.burnt) {
  throw new Error('NFT already redeemed');
}

// Check if transaction already exists
const existingTx = await findRedemptionTransaction(nftMint);

if (existingTx) {
  throw new Error('NFT already redeemed');
}
```

---

## 📱 User Flows

### A. Customer Redemption Flow
1. Customer opens redemption page (`/redeem`)
2. Connects wallet
3. Views available discount NFTs
4. Clicks "Redeem This Discount"
5. Approves transaction in wallet
6. NFT is burned on-chain
7. Receives confirmation with transaction signature

### B. Merchant Verification Flow
1. Merchant receives transaction signature from customer
2. Opens verification page (`/verify`)
3. Enters transaction signature
4. System verifies:
   - Transaction exists on blockchain
   - Burn instruction was executed
   - Redemption details match
   - NFT was permanently destroyed
5. Merchant applies discount

### C. QR Code Flow (Alternative)
1. Merchant generates QR code (`/merchant`)
2. Customer scans QR with Solana wallet
3. Wallet shows transaction details
4. Customer approves
5. NFT burned automatically
6. Merchant sees confirmation

---

## 🔍 Verification System

### Transaction Structure
```typescript
Transaction {
  instructions: [
    ComputeBudgetProgram.setComputeUnitLimit(150_000),
    MemoInstruction("R:REDEMPTION_CODE:DISCOUNT_VALUE"),
    BubblegumBurnInstruction({
      merkleTree,
      treeAuthority,
      leafOwner,
      leafDelegate,
      leafIndex,
      root,
      dataHash,
      creatorHash,
      nonce,
      proof: [...]
    })
  ]
}
```

### Verification Checks
1. ✅ Transaction exists on Solana blockchain
2. ✅ Transaction confirmed (not failed)
3. ✅ Memo contains redemption details
4. ✅ Bubblegum burn instruction present
5. ✅ Burn instruction executed successfully
6. ✅ NFT no longer exists in user wallet

---

## 💻 Technical Implementation

### Key Files

1. **`frontend/lib/burn-nft.ts`**
   - `fetchAssetDataForBurn()` - Fetches complete asset data
   - `computeDataHash()` - Computes metadata hash
   - `computeCreatorHash()` - Computes creators hash
   - `createRealBurnTransaction()` - Creates burn transaction
   - `createBubblegumBurnInstruction()` - Creates burn instruction

2. **`frontend/app/redeem/page.tsx`**
   - User redemption interface
   - NFT listing and selection
   - Transaction execution
   - Balance checking
   - Size validation

3. **`frontend/app/verify/page.tsx`**
   - Merchant verification interface
   - Transaction lookup
   - Burn verification
   - Redemption details display

4. **`frontend/app/merchant/page.tsx`**
   - QR code generation
   - Solana Pay integration
   - Merchant tools

### Dependencies
```json
{
  "@solana/web3.js": "^1.87.6",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@noble/hashes": "^1.3.3",
  "qrcode": "^1.5.3"
}
```

---

## 🚀 Production Deployment

### 1. Environment Variables
```env
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 2. Switch to Mainnet
Update RPC URLs from devnet to mainnet:
```typescript
const rpcUrl = 'https://api.mainnet-beta.solana.com';
const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
```

### 3. Security Considerations
- ✅ All redemptions verified on-chain
- ✅ No private keys in frontend
- ✅ User signs all transactions
- ✅ Merkle proofs validated by Bubblegum program
- ✅ Transaction size optimized
- ✅ Balance checks before execution

### 4. Cost Analysis
- Redemption transaction: ~0.000005 SOL (~$0.0001)
- No database costs
- No server costs for verification
- Fully decentralized

---

## 📊 Testing

### Test Redemption
1. Navigate to `/redeem`
2. Connect wallet with discount NFTs
3. Click "Redeem This Discount"
4. Check console logs for:
   - Asset data fetched
   - Hashes computed
   - Burn instruction added
   - Transaction size
   - Transaction sent
   - Confirmation received

### Test Verification
1. Copy transaction signature from redemption
2. Navigate to `/verify`
3. Paste signature
4. Verify:
   - Transaction found
   - Burn instruction detected
   - Redemption details correct
   - NFT marked as burned

### Test Double-Spend Prevention
1. Try to redeem same NFT twice
2. Should fail because:
   - NFT no longer in wallet
   - Asset query returns "burnt: true"
   - Transaction simulation fails

---

## 🎉 Benefits

### For Merchants
- ✅ **Fraud-proof**: Cryptographically impossible to fake
- ✅ **No database**: All verification on-chain
- ✅ **Instant**: Real-time verification
- ✅ **Transparent**: All transactions public
- ✅ **Cost-effective**: Pennies per redemption

### For Customers
- ✅ **Trustless**: No need to trust merchant
- ✅ **Transparent**: Can verify on blockchain
- ✅ **Fast**: Instant redemption
- ✅ **Secure**: Wallet-based authentication

### For Platform
- ✅ **Scalable**: No server load
- ✅ **Decentralized**: No single point of failure
- ✅ **Auditable**: All transactions on-chain
- ✅ **Innovative**: Uses cutting-edge Solana tech

---

## 🔗 Resources

- [Metaplex Bubblegum Documentation](https://docs.metaplex.com/programs/compression)
- [Helius DAS API](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)
- [Solana Pay](https://docs.solanapay.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

---

## 🎯 Summary

This system implements **true single-use coupons** by:

1. ✅ **Actually burning NFTs** on-chain (not just marking as "used")
2. ✅ **Computing proper hashes** for Bubblegum burn instruction
3. ✅ **Merchant verification** system to check redemptions
4. ✅ **Double-spend prevention** through on-chain state
5. ✅ **Production-ready** implementation with error handling

The NFTs are **permanently destroyed** after redemption, making it **cryptographically impossible** to reuse them. This is the most secure method for single-use coupons on Solana.

