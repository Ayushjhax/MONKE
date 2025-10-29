# Driftly cNFT implementation for Hackathon Teams

### Overview
Compressed NFTs (cNFTs) on Solana deliver massive scale at a fraction of the cost by storing asset data off-chain and anchoring integrity on-chain via Merkle trees. You mint millions of NFTs with on-chain verifiability, while paying only for compact hash updates.

- **Merkle Tree (On-chain)**: A concurrent Merkle tree tracks compressed leaves (NFTs). Only the minimal hash footprint is on-chain, enabling extreme cost savings. We create it with `createTree()` from `@metaplex-foundation/mpl-bubblegum`.
- **NFT Collection (On-chain)**: A standard collection NFT (Metaplex Token Metadata) acts as the parent reference for your cNFTs, created with `createNft()`.
- **Minting (Compressed, Off-chain + On-chain proof)**: `mintToCollectionV1()` writes NFT metadata off-chain and commits a proof to the Merkle tree on-chain. Ownership, verification, and provenance are still cryptographically anchored on-chain.

Why this approach
- **Scale**: Games, loyalty programs, tickets, and promotions regularly need 10^5–10^7 assets. cNFTs make this economically viable.
- **Cost**: You pay for Merkle updates, not full metadata writes. Expect orders of magnitude cheaper than traditional NFTs.
- **Speed**: Mints finalize quickly with small on-chain footprints.
- **Composability**: Still uses the familiar Metaplex stack and Solana ownership semantics.

---

### Architecture
- **Contracts/Programs**
  - Metaplex Token Metadata: defines collection + NFT metadata standard.
  - Metaplex Bubblegum: enables creation of Merkle trees and compressed mint operations.
- **Data Flow**
  1. Create a collection NFT on-chain (standard NFT).
  2. Create a Merkle tree on-chain (Bubblegum).
  3. Upload assets/JSON to IPFS (recommended) or a gateway; store URLs in metadata.
  4. Mint cNFTs to wallet(s) with `mintToCollectionV1()` which updates the Merkle tree.
  5. Verify ownership and attributes via Helius DAS or by reconstructing Merkle proofs.
- **Files in this repo (dev-internal)**
  - `createNFTCollection.ts`: Creates collection NFT.
  - `createMerkleTree.ts`: Creates Merkle tree account.
  - `mint-all-discounts.ts`: Mints multiple discount types to `addresses.csv`.
  - `mint-hotel-discounts.ts`, `mint-flight-discounts.ts`, `mint-dining-discounts.ts`: Per-category mints.
  - `verifyDiscount.ts`: Quick local metadata verification showcase.
  - `verify-promotions.ts`: Full DAS-powered verification + report.
  - `config.ts`: Core parameters (tree sizes, URLs, collection info).
  - CSVs: `addresses.csv`, `hotel-addresses.csv`, `flight-addresses.csv`, `dining-addresses.csv`.
  - `data/`: Generated outputs (mints, Merkle/collection IDs, verification reports).

---

### Settings
Before running scripts, configure the project.

- **.env**
  - Use Helius (recommended) or default RPCs.
  ```env
  NODE_ENV=development
  SOLANA_MAINNET_RPC_URL=https://rpc.helius.xyz/?api-key=<HELIUS_API_KEY>
  SOLANA_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>
  Helius_API_KEY=<HELIUS_API_KEY>
  ```

- **key.json**
  - Place a standard Solana JSON secret key (payer wallet) in this folder as `key.json`.

- **config.ts**
  - Merkle tree sizing (only specific pairs are valid in SPL ConcurrentMerkleTree):
    - 14 → (64, 256, 1024, 2048)
    - 20 → (64, 256, 1024, 2048)
    - 24 → (64, 256, 512, 1024, 2048)
    - 26 → (64, 256, 512, 1024, 2048)
    - 30 → (512, 1024, 2048)
  - Recommended defaults here: `MERKLE_MAX_DEPTH=14`, `MERKLE_MAX_BUFFER_SIZE=64` (suitable for hackathon demos).
  - URLs:
    - `METADATA_COLLECTION_URL`: Collection JSON.
    - `METADATA_ITEM_URL`: Default item JSON (can be per-mint).
    - `IMAGE_URL`: Default image URL.
  - Collection Info: `COLLECTION_NAME`, `COLLECTION_SYMBOL`, `COLLECTION_DESCRIPTION`.
  - Royalties: `FEE_PERCENT` in basis points (e.g., `550` = 5.5%).
  - External link: `EXTERNAL_URL` currently set to `https://x.com/Ayushjhax`.

- **IPFS-first Workflow (Recommended)**
  - Use your IPFS uploader (frontend has an uploader) to host images and JSON.
  - Use `ipfs://` URIs (with HTTP gateway fallback) in `config.ts` and JSON.

- **Airdrop CSVs**
  - Single column: `address`
  ```csv
  address
  <ValidSolanaAddress1>
  <ValidSolanaAddress2>
  ```

---

### Metadata Examples (ready for IPFS)
- **Collection (discount-collection-metadata.json)**
```json
{
  "name": "DealCoin Discount Collection",
  "symbol": "DEAL",
  "description": "Verifiable discount coupons powered by cNFTs. Each promotion is a transferable NFT that grants real-world savings.",
  "image": "ipfs://<CID>/discount-collection.png",
  "external_url": "https://x.com/Ayushjhax",
  "properties": {
    "category": "image",
    "files": [{ "uri": "ipfs://<CID>/discount-collection.png", "type": "image/png" }]
  }
}
```

- **Item – Hotel (discount-MBS-20OFF-2024.json)**
```json
{
  "name": "20% Off Hotel Stay in Singapore",
  "symbol": "DEAL",
  "description": "Experience luxury at Marina Bay Sands. Valid for 3 nights in a Deluxe Room.",
  "image": "ipfs://<CID>/hotel-discount.png",
  "external_url": "https://dealcoin.app/deals/MBS-20OFF-2024",
  "attributes": [
    { "trait_type": "Discount Percentage", "value": 20 },
    { "trait_type": "Original Price", "value": "$800" },
    { "trait_type": "Discounted Price", "value": "$640" },
    { "trait_type": "Savings", "value": "$160" },
    { "trait_type": "Merchant", "value": "Marina Bay Sands" },
    { "trait_type": "Merchant ID", "value": "mbs-singapore" },
    { "trait_type": "Category", "value": "Hotel" },
    { "trait_type": "Location", "value": "Singapore" },
    { "trait_type": "Expiry Date", "value": "2024-12-31" },
    { "trait_type": "Redemption Code", "value": "MBS-20OFF-2024" },
    { "trait_type": "Max Uses", "value": 1 },
    { "trait_type": "Current Uses", "value": 0 },
    { "trait_type": "Status", "value": "Active" },
    { "trait_type": "Transferable", "value": "Yes" },
    { "trait_type": "Platform", "value": "DealCoin" },
    { "trait_type": "Verification Method", "value": "Solana Pay" },
    { "trait_type": "NFT Type", "value": "Compressed NFT" }
  ]
}
```

- **Item – Flight (discount-SKY-TOKYO15-2024.json)**
```json
{
  "name": "15% Off Flight to Tokyo",
  "symbol": "DEAL",
  "description": "Discover Japan with our exclusive discount. Valid for round-trip economy flights.",
  "image": "ipfs://<CID>/flight-discount.png",
  "external_url": "https://dealcoin.app/deals/SKY-TOKYO15-2024",
  "attributes": [
    { "trait_type": "Discount Percentage", "value": 15 },
    { "trait_type": "Original Price", "value": "$1200" },
    { "trait_type": "Discounted Price", "value": "$1020" },
    { "trait_type": "Savings", "value": "$180" },
    { "trait_type": "Merchant", "value": "SkyTravel Airlines" },
    { "trait_type": "Merchant ID", "value": "sky-travel" },
    { "trait_type": "Category", "value": "Flight" },
    { "trait_type": "Location", "value": "Tokyo, Japan" },
    { "trait_type": "Expiry Date", "value": "2024-11-30" },
    { "trait_type": "Redemption Code", "value": "SKY-TOKYO15-2024" },
    { "trait_type": "Max Uses", "value": 1 },
    { "trait_type": "Current Uses", "value": 0 },
    { "trait_type": "Status", "value": "Active" },
    { "trait_type": "Transferable", "value": "Yes" },
    { "trait_type": "Platform", "value": "DealCoin" },
    { "trait_type": "Verification Method", "value": "Solana Pay" },
    { "trait_type": "NFT Type", "value": "Compressed NFT" }
  ]
}
```

- **Item – Dining (discount-LCB-DINING30-2024.json)**
```json
{
  "name": "30% Off Fine Dining Experience",
  "symbol": "DEAL",
  "description": "Indulge in an exquisite 7-course tasting menu at Le Cordon Bleu, Paris.",
  "image": "ipfs://<CID>/restaurant-discount.png",
  "external_url": "https://dealcoin.app/deals/LCB-DINING30-2024",
  "attributes": [
    { "trait_type": "Discount Percentage", "value": 30 },
    { "trait_type": "Original Price", "value": "$200" },
    { "trait_type": "Discounted Price", "value": "$140" },
    { "trait_type": "Savings", "value": "$60" },
    { "trait_type": "Merchant", "value": "Le Cordon Bleu" },
    { "trait_type": "Merchant ID", "value": "le-cordon-bleu" },
    { "trait_type": "Category", "value": "Restaurant" },
    { "trait_type": "Location", "value": "Paris, France" },
    { "trait_type": "Expiry Date", "value": "2024-10-31" },
    { "trait_type": "Redemption Code", "value": "LCB-DINING30-2024" },
    { "trait_type": "Max Uses", "value": 1 },
    { "trait_type": "Current Uses", "value": 0 },
    { "trait_type": "Status", "value": "Active" },
    { "trait_type": "Transferable", "value": "Yes" },
    { "trait_type": "Platform", "value": "DealCoin" },
    { "trait_type": "Verification Method", "value": "Solana Pay" },
    { "trait_type": "NFT Type", "value": "Compressed NFT" }
  ]
}
```

---

### Step-by-step Usage (from MONKE/dev-internal)
Run exactly in this order. All commands use Bun.

1. Create the collection
```bash
bun run createNFTCollection.ts
```

2. Create the Merkle tree
```bash
bun run createMerkleTree.ts
```

3. Mint all discount types to main addresses (addresses.csv)
```bash
bun run mint-all-discounts.ts
```

4. Mint per-category lists (optional; avoid duplicates if you already did step 3)
```bash
bun run mint-hotel-discounts.ts
bun run mint-flight-discounts.ts
bun run mint-dining-discounts.ts
```

5. Quick verification (local/console)
```bash
bun run verifyDiscount.ts
```

6. Full verification (Helius DAS + report)
```bash
bun run verify-promotions.ts
```

Outputs go to `data/` (IDs, tx signatures, and verification reports).

---

### Cost, Limits, and Performance
- **Why cNFTs are cheaper**: Only Merkle roots and minimal hashes hit-chain; large JSON blobs live off-chain.
- **Tree sizing**: Pick `maxDepth` based on peak NFT count; `2^depth` is the theoretical upper bound of leaves.
- **Buffer size**: Choose larger buffers for higher concurrency and update throughput.
- **Throughput tips**: Batch operations, stagger requests, and prefer Helius endpoints for consistent performance.

---

### Security and Integrity
- **Immutability**: Collection settings and key attributes can be locked by design decisions; cNFT proofs bind off-chain JSON to on-chain state.
- **Verification**: Use `verify-promotions.ts` (DAS) and/or on-chain proof validation to check:
  - Ownership, collection membership, category/type, expiry, redemption codes.
- **Fraud checks**: Look for missing platform signature, wrong verification method, or mismatched NFT type (the script flags these).

---

### Troubleshooting
- RPC errors: confirm `.env` endpoints; if rate-limited, increase delays or upgrade Helius plan.
- Missing `key.json`: ensure it’s in this folder and valid.
- Expired promotions: update your item metadata `Expiry Date` to a future value before minting.
- Duplicate mints: avoid running both step 3 and step 4 for the same addresses unless intentional.

---

### FAQ
- Can I use regular NFTs instead? Yes, but cost/scalability will be significantly higher.
- Can I edit metadata later? Treat cNFT metadata as immutable for trust; create new mints for changes or encode state in attributes/status.
- How big should my tree be? Start with depth 14 for demos; for production, plan capacity using `2^depth` and expected churn.
- Do I need IPFS? Strongly recommended for durability and decentralization.

---

### Checklist (Hackathon-ready)
- [ ] `.env` configured (RPCs, NODE_ENV)
- [ ] `key.json` present
- [ ] `config.ts` URLs + collection info set
- [ ] CSVs prepared (`address` column)
- [ ] Assets and JSON uploaded to IPFS
- [ ] Run steps 1–6 and verify outputs in `data/`

---

### Contributing and Extensions
- Add a CLI to upload assets to IPFS and auto-update `config.ts`.
- Add rate-limit aware batch minting for large CSVs.
- Extend verification to include on-chain redemption flows (e.g., Solana Pay).

---

### Support
- External URL is set to `https://x.com/Ayushjhax`. For issues or questions, share console logs and the `data/verification-report-*.json` artifact.
