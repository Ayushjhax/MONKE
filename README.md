## Driftly — Internet Capital Markets Powered by Solana cNFTs

[![Watch the 5‑minute overview](https://img.youtube.com/vi/nNys79UtaTg/maxresdefault.jpg)](https://youtu.be/nNys79UtaTg?si=-0OgwiAyFdzgrERJ)

Inline playback available inside the app at `/videos`.

Build, sell, redeem, and trade digital assets with Solana’s Compressed NFTs (cNFTs). Driftly gives small businesses programmatic loyalty, verifiable discounts, and secondary-market liquidity — at internet scale and near-zero cost (Mint More than 1 Million cNFTs for 0.3 Sol 🤩).

---

### What We’re Building

- Empower merchants and creators to mint utility NFTs (discounts, memberships, event access) as cNFTs.
- Use on-chain redemption proofs via burn-and-claim mechanics, and Solana Pay for redemption — no screenshots, no fraud.
- Enable resale and peer-to-peer offers, staking-based rewards, group deals, social engagement, and geo discovery.
- AI travel assistant and interactive Globe to explore events, social discovery, and book flights/hotels with cNFTs as coupons.

Why cNFTs: ultra-low minting cost, massive scalability (Merkle-compressed), on-chain verifiability, and familiar Metaplex tooling.

---

### Why cNFT for Merchants

- Low minting cost at scale
  - Mint tens of thousands of utility tokens for a fraction of the cost of standard NFTs, thanks to Merkle compression (Bubblegum).
  - Run frequent campaigns (daily deals, seasonal drops) without worrying about chain fees ballooning.

- High throughput and reliable UX
  - Fast confirmations with minimal on-chain footprint; great for time-sensitive redemptions and flash sales.
  - Works with familiar Metaplex standards and tools, reducing integration friction.

- Programmable, interoperable commerce
  - Flexible rules: time-lock, location-lock, one-time burn-and-claim, transferability, and resale.
  - On-chain verifiability allows partners (POS, marketplaces) to trust redemption state without centralized reconciliation.
  - Secondary markets unlock liquidity and price discovery for promotions and memberships.


💡 Hackathon teams: see [`MONKE/template/README.md`](https://github.com/Ayushjhax/MONKE/blob/main/MONKE/template/README.md) to integrate Driftly’s cNFT module directly.

[![Hackathon walkthrough](https://img.youtube.com/vi/fQk5rVYCtSw/maxresdefault.jpg)](https://youtu.be/fQk5rVYCtSw?si=GBtXv7hzTNg0Nz-D)

Or watch both embedded at: `http://localhost:3000/videos` (after running the app).

---

### Quickstart

```bash
git clone https://github.com/Ayushjhax/MONKE.git
cd MONKE/frontend
npm install

# Create your environment
cp .env.example .env   # then edit values

# Run the app
npm run dev
# App: http://localhost:3000
```

---

### Environment (.env)

Create `frontend/.env.local` (or `MONKE/frontend/.env`) and set:

```env
NODE_ENV=development
NEXT_PUBLIC_USE_MOCK_DATA=true

# Helius API Key
NEXT_PUBLIC_HELIUS_API_KEY=
HELIUS_API_KEY=

# Solana RPC
NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL=

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=
NEXT_PUBLIC_PINATA_API_SECRET=
NEXT_PUBLIC_PINATA_JWT=
NEXT_PUBLIC_PINATA_GATEWAY=

# Database (Postgres)
DATABASE_URL=

# Amadeus (Flights/Hotels)
AMADEUS_API_KEY=
AMADEUS_API_SECRET=

# Cohere (AI)
COHERE_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

Notes:
- Helius: set both public (client) and server keys where used; public used for DAS reads in frontend.
- RPC: use a devnet RPC for consistent performance.
- Pinata: used to upload/serve metadata and images for NFTs.
- DATABASE_URL: Postgres connection string used by `frontend/lib/db.ts` and API routes.
- Amadeus: required for flight/hotel search and booking simulation endpoints.
- Cohere: powers the AI travel assistant (`/api/ai-agent/chat`).
- Mapbox: enables maps and nearby discovery UI.
- Razorpay: used for order creation and payment verification.


### Features (from code)

- Marketplace & Resale
  - List cNFTs for sale, browse active listings with on-chain asset data, purchase, transfer post-sale, and manage “my assets” and “my listings”.

- Resale P2P (Binance-style)
  - Peer‑to‑peer offers and transfers for cNFTs: make/respond to offers, coordinate payment/escrow, mark transfer complete, and settle accepted trades end‑to‑end — optimized for P2P resale.

- Group Deals (Tiered pricing)
  - Create tiered group campaigns where discounts unlock as participation grows. A host opens a group, shares an invite link, and participants join with pledges. Groups auto‑lock on expiry/progress; redemptions are issued and tracked per member.

- Staking & Rewards
  - Stake eligible cNFTs to accrue rewards over time; initiate cooldown to unstake; claim aggregated rewards and view rich user staking stats.

- Redemption (Burn-and-Claim + Solana Pay)
  - On-chain redemption proof using burn-and-claim semantics; optional Solana Pay flow for payment-based redemption; supports time-locked and location-locked QR payloads.

- QR Codes
  - Generate encoded QR payloads for redemptions and validate scans with expiry and integrity checks.

- Social Discovery Layer
  - Profiles, ratings, reviews, votes, comments with threads and moderation flags, activity feeds, notifications, community stats, and trending signals.

- Geo Discovery
  - Submit signed location proofs and surface nearby deals; Mapbox-based UI for exploration.

- Events + Globe
  - Curated crypto/NFT events with geo metadata; interactive globe and event pages to discover deals tied to events.

- Travel + Amadeus
  - Flight/hotel discovery and booking simulation using Amadeus APIs; redeem discounts by burning the cNFT coupon and applying savings at booking time.

- Merchants
  - Merchant sync and registry to associate collections, wallets, and campaigns.
  - Create in 2 simple steps: (1) create a Collection and Merkle Tree, (2) mint your cNFTs.

- Payments
  - Razorpay order creation and payment verification for fiat on‑ramps in local development. Use test keys locally and verify callbacks while running the app on `http://localhost:3000`.

- AI Travel Assistant
  - Conversational assistant (Cohere) to suggest events, routes, and deals; integrates with discovery and booking flows.

- cNFT Minting & Collections
  - Create and manage collections, assist with utilities, and maintenance tasks like fixing expiry or resetting usage counters.

- System Init & Migrations
  - Initialize and migrate Postgres schemas; helper routes/utilities for local setup and data evolution.

---

### API Endpoints

Backend (Express, mounted under `/api`):

- Deals
  - GET `/api/deals`
  - GET `/api/deals/:id`
  - POST `/api/deals`
  - POST `/api/deals/:id/claim`
  - GET `/api/deals/category/:category`
  - GET `/api/deals/location/:location`
  - GET `/api/deals/merchant/:merchantId`

- Merchants
  - GET `/api/merchants`
  - GET `/api/merchants/:id`
  - POST `/api/merchants`
  - GET `/api/merchants/:id/deals`

- Redemption (Solana Pay)
  - POST `/api/redemption/generate-qr`
  - POST `/api/redemption/verify`
  - POST `/api/redemption/time-locked`
  - POST `/api/redemption/location-based`
  - GET  `/api/redemption/history/:userWallet`

- QR Codes
  - POST `/api/qr/generate`
  - POST `/api/qr/scan`

- Staking
  - POST `/api/staking/stake`
  - POST `/api/staking/unstake`
  - POST `/api/staking/unstake-complete`
  - POST `/api/staking/rewards/claim`
  - GET  `/api/staking/status/:assetId`
  - GET  `/api/staking/my-stakes?ownerAddress=...`
  - GET  `/api/staking/rewards/pending?ownerAddress=...`
  - GET  `/api/staking/stats/:ownerAddress`
  - GET  `/api/staking/all`

- Group Deals
  - POST `/api/group-deals`
  - GET  `/api/group-deals`
  - GET  `/api/group-deals/:dealId`
  - POST `/api/group-deals/:dealId/groups`
  - GET  `/api/group-deals/:dealId/groups/:groupId`
  - POST `/api/group-deals/:dealId/groups/:groupId/join`
  - POST `/api/group-deals/:dealId/groups/:groupId/lock`
  - GET  `/api/group-deals/:dealId/groups/:groupId/redemptions?wallet=...`
  - POST `/api/group-deals/:dealId/groups/:groupId/cancel`
  - POST `/api/group-deals/_internal/:groupId/recompute`

Frontend (Next.js Route Handlers under `/app/api/...`):

- Resell
  - POST `/api/resell/list`
  - GET  `/api/resell/listings`
  - POST `/api/resell/purchase`
  - POST `/api/resell/transfer`
  - GET  `/api/resell/my-listings`
  - GET  `/api/resell/my-assets`

- Offers
  - POST `/api/offers/create`
  - POST `/api/offers/respond`
  - POST `/api/offers/mark-transferred`
  - POST `/api/offers/transfer-nft`
  - GET  `/api/offers/my-offers`
  - GET  `/api/offers/received`
  - POST `/api/offers/pay-accepted`

- Group Deals
  - `/api/group-deals` and nested group routes

- Staking
  - `/api/staking/*` (helpers: claim, stake, stats)

- Redemption
  - GET  `/api/redemption/list`
  - POST `/api/redemption/store`
  - GET  `/api/redemption/user-coupons`
  - POST `/api/redemption/verify`

- Social
  - `/api/social/*` (profiles, comments, votes, leaderboard, activity, notifications, trending, stats, rate, reputation)

- Geo
  - POST `/api/geo/submit-location`
  - GET  `/api/geo/nearby-deals`

- Events
  - GET  `/api/events`
  - GET  `/api/events/[eventId]`

- Bookings/Amadeus
  - POST `/api/amadeus/auth`
  - POST `/api/amadeus/flights/search`
  - POST `/api/amadeus/hotels/search`
  - POST `/api/amadeus/booking/simulate`
  - GET  `/api/bookings`

- Merchants
  - POST `/api/merchants/sync`

- Payments
  - POST `/api/razorpay/create-order`
  - POST `/api/razorpay/verify-payment`

- AI
  - POST `/api/ai-agent/chat`

- Minting/Collections
  - POST `/api/mint`
  - GET  `/api/collections`
  - POST `/api/collections/unlimited`
  - POST `/api/collections/add`
  - POST `/api/collections/reset-usage`
  - POST `/api/collections/fix-expiry`

- System
  - POST `/api/init-db`
  - POST `/api/migrate-db`
  - POST `/api/migrate-transfer-signature`
  - POST `/api/setup-db`
  - `/api/debug-*`, `/api/test-*`

---

 

---

### Project Structure

```bash
MONKE/
├── frontend/        # Next.js app for merchants & users
│   ├── app/         # Routes (pages + API route handlers)
│   ├── components/  # UI and reusable modules
│   ├── lib/         # Blockchain, DB, and API helpers
│   └── public/      # Static assets
├── api/             # Express API (Bun) for core services
│   ├── routes/      # Deals, merchants, redemption, QR, staking, group-deals
│   └── services/    # Business logic & jobs
├── template/        # cNFT scripts + docs for hackathon teams
└── README.md        # Main documentation
```

---

### Tech Stack

- Frameworks: Next.js 16, React 19, Express (Bun)
- Solana: `@solana/web3.js`, `@solana/pay`, Metaplex (`mpl-bubblegum`, `mpl-token-metadata`, Umi)
- Wallet: `@solana/wallet-adapter` (react/ui/wallets)
- Maps: Mapbox GL (`mapbox-gl`)
- Data/Infra: Postgres (`pg`), Node Cron
- Payments: Razorpay SDK
- AI: Cohere SDK
- Utilities: `qrcode-generator`, `bs58`, `bignumber.js`

---

### Contribution Guidelines
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, branching, and PR guidelines. Keep changes focused, document new features, and update env requirements if needed.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-change`
3. Commit: `git commit -m "feat: your change"`
4. Push and open a Pull Request

---

### Credits

Built by [Ayush Kumar Jha](https://x.com/Ayushjhax), empowering decentralized commerce through Solana.

Hackathon teams can use the template in `MONKE/template/README.md` to integrate Driftly’s cNFT features quickly.

Follow on X: https://x.com/Ayushjhax

License: MIT — see [`LICENSE.md`](./LICENSE.md)

