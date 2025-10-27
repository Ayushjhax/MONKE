# 🎯 Complete Instructions: How to Use the Staking System

## ✅ What Has Been Implemented

The complete cNFT staking/rewards system has been built with:

- ✅ **Backend**: Database layer, services, API routes, background jobs
- ✅ **Frontend**: Staking dashboard, components, redeem page integration
- ✅ **Data Files**: All JSON storage files initialized
- ✅ **Documentation**: Complete docs and guides

## 🚀 START NOW - Simple 3-Step Setup

### Terminal 1: Start Backend

```bash
cd /Users/ayush/Desktop/MonkeDao/MONKE
bun install          # Only needed first time
bun run start        # Start the backend server
```

**Expected Output:**
```
🚀 DealCoin API Server Started
📍 Server running on http://localhost:3001
⏰ Staking verification job scheduled to run every 6 hours
⏰ Running initial staking verification job...
✅ All background jobs completed successfully
```

### Terminal 2: Start Frontend

```bash
cd /Users/ayush/Desktop/MonkeDao/MONKE/frontend
npm install          # Only needed first time
npm run dev          # Start the frontend
```

**Expected Output:**
```
▲ Next.js development server
📍 http://localhost:3000
```

## 🎮 How to Use the System

### 1. Open the Application

Navigate to: **http://localhost:3000/redeem**

### 2. Connect Your Wallet

- Click "Select Wallet" button
- Choose Phantom or Solflare
- Approve connection
- **Make sure you're on Devnet!**

### 3. View Your NFTs

Your promotion/discount NFTs will automatically appear showing:
- Name and metadata
- Discount percentage
- Merchant name
- Category
- Each NFT has two buttons:
  - **"⭐ Stake NFT"** - Start staking
  - **"🎫 Redeem"** - Use the discount

### 4. Stake an NFT

1. Click **"⭐ Stake NFT"** on any NFT card
2. Backend verifies ownership via DAS API
3. Tier is determined from discount %:
   - Bronze (0-14%): 10 tokens/day
   - Silver (15-29%): 15 tokens/day × 1.2
   - Gold (30-49%): 25 tokens/day × 1.5
   - Platinum (50-100%): 50 tokens/day × 2.0
4. Success message appears
5. NFT is now staked and earning!

### 5. View Staking Dashboard

1. Click **"📊 View in Staking Dashboard"** on a staked NFT
   OR
2. Navigate to **http://localhost:3000/staking**

**You'll see:**
- Total NFTs staked
- Total rewards earned
- Total rewards claimed
- Tier distribution
- All your staked NFTs with:
  - Pending rewards
  - Total earned
  - Days staked
  - Tier (with colored badge)
  - APY estimate

### 6. Claim Rewards

**Option A: Claim All**
- Click **"Claim All (X.XXXXXX)"** button at top
- All pending rewards are claimed
- Updated instantly

**Option B: Claim Individual**
- Click **"Claim Rewards"** on any NFT card
- Only that NFT's rewards are claimed

### 7. Unstake (Optional)

1. Click **"Unstake"** on a stake
2. 7-day cooldown begins
3. Cooldown countdown shown
4. After 7 days, complete unstaking
5. Final rewards calculated and paid

## 📊 Understanding Rewards

### Tier System

| Discount % | Tier | Daily Rate | Multiplier | Earned/Day |
|-----------|------|-----------|------------|------------|
| 0-14% | 🥉 Bronze | 10 | 1.0x | 10 tokens |
| 15-29% | 🥈 Silver | 15 | 1.2x | 18 tokens |
| 30-49% | 🥇 Gold | 25 | 1.5x | 37.5 tokens |
| 50-100% | 💎 Platinum | 50 | 2.0x | 100 tokens |

### Consecutive Bonus

Hold your NFT longer = earn more bonus:

- 1 day: 0% bonus
- 5 days: 5% bonus
- 10 days: 10% bonus
- 25 days: 25% bonus
- 50+ days: 50% bonus (maximum)

**Example Calculation:**
```
Gold tier NFT, 30 days held:
Base: 25 tokens/day
Multiplier: 1.5x (Gold tier)
Bonus: 30 days × 1% = 30% bonus

Final: 25 × 1.5 × 1.3 = 48.75 tokens/day

After 30 days: ~1,462.5 tokens earned
```

## 🔄 Automatic Features

The system runs automatically:

1. **Every 6 Hours**: Background job verifies ownership
2. **Rewards Calculation**: Pending rewards updated
3. **Failure Tracking**: After 3 failed verifications, stake marked inactive
4. **Ownership Checks**: Uses Helius DAS API for verification

## 📡 API Endpoints Available

All endpoints ready at `http://localhost:3001/api/staking/`:

```bash
# Stake an NFT
POST /stake
Body: { "assetId": "...", "ownerAddress": "..." }

# Request unstaking
POST /unstake
Body: { "stakeId": "...", "ownerAddress": "..." }

# Claim rewards
POST /rewards/claim
Body: { "ownerAddress": "..." }

# Get your stakes
GET /my-stakes?ownerAddress=...

# Get pending rewards
GET /rewards/pending?ownerAddress=...

# Get user stats
GET /stats/:ownerAddress
```

## 🧪 Test Commands

```bash
# Test backend health
curl http://localhost:3001/health

# Test staking endpoints (replace YOUR_WALLET)
curl "http://localhost:3001/api/staking/my-stakes?ownerAddress=YOUR_WALLET"
curl "http://localhost:3001/api/staking/stats/YOUR_WALLET"
```

## 📁 File Structure

```
MONKE/
├── api/
│   ├── db/
│   │   ├── schema.ts          ← Database schemas
│   │   └── index.ts           ← Database operations
│   ├── services/
│   │   ├── staking-service.ts      ← Core staking logic
│   │   ├── reward-calculator.ts    ← Reward calculations
│   │   └── ownership-verifier.ts   ← DAS API integration
│   ├── routes/
│   │   └── staking.ts          ← API endpoints
│   ├── jobs/
│   │   └── staking-verification.ts ← Background jobs
│   └── server.ts               ← Main server (updated)
│
├── frontend/
│   ├── app/
│   │   ├── staking/page.tsx    ← Staking dashboard
│   │   └── redeem/page.tsx     ← Updated with staking
│   └── components/
│       ├── StakingCard.tsx     ← Individual stakes
│       ├── StakingStats.tsx   ← Stats display
│       └── RewardClaimModal.tsx ← Claim modal
│
└── data/
    ├── staking-records.json    ← Active stakes
    ├── staking-rewards.json    ← Reward history
    ├── staking-sessions.json   ← Session logs
    └── user-staking-stats.json ← User stats
```

## 🔍 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is available
lsof -i :3001

# Reinstall dependencies
cd MONKE
bun install
```

### Frontend issues
```bash
cd MONKE/frontend
npm install
rm -rf .next
npm run dev
```

### No NFTs showing
- Make sure you're on Devnet
- Check you have promotion NFTs with "Platform: DealCoin" attribute
- Verify wallet connection

### Rewards not updating
- Wait 6 hours for background job to run
- Check backend logs for errors
- Verify Helius API key is set

### Ownership verification fails
- Check Helius API key in `.env`
- Verify network matches (Devnet vs Mainnet)
- Ensure NFT hasn't been transferred

## 📚 Documentation

- **`STAKING_SYSTEM.md`** - Complete technical documentation
- **`STAKING_QUICK_START.md`** - Quick start guide
- **`STAKE_NOW.md`** - Getting started guide
- **`INSTRUCTIONS.md`** - This file

## ✅ Verification Checklist

Before using, verify:

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 3000
- [ ] No errors in terminal output
- [ ] Can connect wallet
- [ ] Can see your NFTs on `/redeem`
- [ ] Can click "Stake NFT" button
- [ ] Stakes appear on `/staking` dashboard

## 🎯 Quick Summary

1. **Start Backend**: `cd MONKE && bun run start`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Go to**: http://localhost:3000/redeem
4. **Connect Wallet**: Phantom/Solflare on Devnet
5. **Stake NFT**: Click "⭐ Stake NFT"
6. **View Dashboard**: Go to /staking
7. **Claim Rewards**: Click "Claim All"
8. **Done!** Enjoy your rewards 🎉

## 🎉 You're Ready!

Everything is complete and ready to use. Just start both servers and begin staking!

**Need Help?** Check the documentation files or look at the code comments.

**Happy Staking!** 🌟


