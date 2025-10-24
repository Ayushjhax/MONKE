# 🔍 NFT Burn Issue Analysis

## Current Problem

The NFT is **NOT being burned** during redemption. Verification shows:
- `nftBurned: false`
- `redemptionCode: 'N/A'`  
- `discountValue: 0`

## Root Causes

### 1. **Hash Computation is Wrong**
The current implementation tries to compute `dataHash` and `creatorHash` using keccak_256, but:
- Metaplex Bubblegum uses a specific serialization format
- The hash computation doesn't match Bubblegum's expectations
- This causes the burn instruction to fail silently

### 2. **Burn Instruction is Being Skipped**
The burn instruction is only added if ALL conditions are met:
```typescript
if (params.merkleTree && params.leafIndex !== undefined && params.proof && 
    params.proof.length <= 10 && params.dataHash && params.creatorHash)
```

Likely failing because:
- `dataHash` is computed incorrectly
- `creatorHash` is computed incorrectly
- Proof might be too large (>10 nodes)

### 3. **Memo Parsing in Verification**
The verification page isn't correctly parsing the memo data from the transaction.

## Solutions

### Option 1: Use Metaplex SDK (Recommended)
Use `@metaplex-foundation/mpl-bubblegum` which handles all hash computation automatically.

**Pros:**
- ✅ Correct hash computation
- ✅ Maintained by Metaplex
- ✅ Production-ready

**Cons:**
- ❌ Requires Umi integration
- ❌ More complex setup

### Option 2: Use Helius Digital Asset API (Easiest)
Helius provides a `burnCompressedNFT` API that handles everything.

**Pros:**
- ✅ Simplest implementation
- ✅ No hash computation needed
- ✅ Works immediately

**Cons:**
- ❌ Requires backend (can't be done client-side)
- ❌ Depends on Helius service

### Option 3: Memo-Only Redemption (Current Fallback)
Track redemptions via memo only, without actual burning.

**Pros:**
- ✅ Works now
- ✅ Simple implementation
- ✅ Low cost

**Cons:**
- ❌ NFT still exists in wallet
- ❌ Can be reused (double-spend risk)
- ❌ Requires off-chain tracking

### Option 4: Transfer to Burn Wallet
Transfer NFT to a known burn wallet address.

**Pros:**
- ✅ Simple to implement
- ✅ NFT removed from user wallet
- ✅ Verifiable on-chain

**Cons:**
- ❌ NFT not actually destroyed
- ❌ Could theoretically be recovered

## Recommended Immediate Fix

**Use Option 4: Transfer to Burn Wallet**

This is the most practical solution that:
1. Removes NFT from user's wallet immediately
2. Prevents reuse (user no longer owns it)
3. Is simple to implement and verify
4. Works reliably without complex hash computation

### Implementation:

```typescript
// Create transfer instruction instead of burn
const transferIx = await createTransferInstruction({
  asset: nft.mint,
  from: userWallet,
  to: BURN_WALLET, // Known burn address
  merkleTree,
  leafIndex,
  root,
  proof
});
```

The burn wallet can be:
- A PDA (Program Derived Address) with no private key
- A known "black hole" address
- Merchant's redemption tracking wallet

## Long-term Solution

Implement proper Bubblegum burn using Metaplex SDK with correct hash computation. This requires:

1. Install `@metaplex-foundation/mpl-bubblegum`
2. Use Umi framework
3. Let SDK handle all hash computation
4. Properly serialize metadata for hashing

This is the "correct" way but requires significant refactoring.

## Conclusion

**For immediate production use**: Implement transfer to burn wallet (Option 4)
**For long-term**: Migrate to Metaplex SDK with proper burn (Option 1)

The current memo-only approach (Option 3) works but doesn't prevent double-spend without additional off-chain tracking.

