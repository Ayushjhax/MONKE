# Next.js Staking System - Complete Setup

## ✅ Everything is now in Next.js!

The staking system has been moved to Next.js API routes. No separate backend needed!

## 🚀 How to Start

**Just run the Next.js app (that's it!):**

```bash
cd MONKE/frontend
npm install    # First time only
npm run dev    # Start the app
```

That's it! The API routes are now built into Next.js.

## 📁 New Structure

All staking logic is now in Next.js API routes:

```
frontend/app/api/staking/
├── stake/route.ts          # POST - Stake an NFT
├── my-stakes/route.ts       # GET - Get user's stakes  
├── rewards/claim/route.ts   # POST - Claim rewards
├── unstake/route.ts         # POST - Request unstaking
└── stats/[address]/route.ts # GET - Get user stats
```

All data is stored in JSON files in `MONKE/data/`:
- `staking-records.json` - Active stakes
- `staking-rewards.json` - Reward history  
- `staking-sessions.json` - Session logs
- `user-staking-stats.json` - User statistics

## 🎯 Usage

### 1. Start the App

```bash
cd MONKE/frontend
npm run dev
```

Visit: **http://localhost:3000**

### 2. Connect Wallet
- Go to `/redeem`
- Connect Phantom/Solflare wallet
- Make sure you're on **Devnet**

### 3. Stake an NFT
- Click "⭐ Stake NFT" on any NFT
- Wait for success message

### 4. View Stakes
- Go to `/staking`  
- See all your staked NFTs
- View pending rewards

### 5. Claim Rewards
- Click "Claim All" button
- Rewards are added instantly

## 🔧 API Routes Available

All routes are relative to your Next.js app:

### Stake NFT
```http
POST /api/staking/stake
Body: { "assetId": "...", "ownerAddress": "..." }
```

### Get My Stakes  
```http
GET /api/staking/my-stakes?ownerAddress=...
```

### Claim Rewards
```http
POST /api/staking/rewards/claim
Body: { "ownerAddress": "..." }
```

### Request Unstaking
```http
POST /api/staking/unstake
Body: { "stakeId": "...", "ownerAddress": "..." }
```

### Get User Stats
```http
GET /api/staking/stats/{address}
```

## ✅ What Changed

### Before (Separate Backend):
- ❌ Express server needed
- ❌ Separate port (3001)
- ❌ Complex setup

### Now (Next.js Only):
- ✅ Everything in Next.js
- ✅ No separate backend needed
- ✅ Single app to run
- ✅ Same functionality
- ✅ Simpler architecture

## 📊 Reward System

The reward tiers are still the same:

| Discount % | Tier | Daily Tokens |
|-----------|------|--------------|
| 0-14% | Bronze 🥉 | 10 |
| 15-29% | Silver 🥈 | 18 |
| 30-49% | Gold 🥇 | 37.5 |
| 50-100% | Platinum 💎 | 100 |

## 🎉 You're Done!

Just run `npm run dev` and start staking!

**No backend server needed anymore!**

