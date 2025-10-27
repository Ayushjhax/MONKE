# 🎯 Staking System - READY TO USE!

## ✅ Everything is Complete!

All files have been created and configured. The staking system is ready to use.

## 🚀 How to Start (3 Simple Steps)

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd MONKE
bun install

# Install frontend dependencies (in another terminal)
cd frontend
npm install
```

### Step 2: Start Backend Server

```bash
cd MONKE
bun run start
```

✅ You should see:
```
🚀 DealCoin API Server Started
📍 Server running on http://localhost:3001
⏰ Staking verification job scheduled to run every 6 hours
```

### Step 3: Start Frontend

In a new terminal:
```bash
cd MONKE/frontend
npm run dev
```

✅ Frontend will be at `http://localhost:3000`

## 🎮 How to Use

### 1️⃣ View Your NFTs
- Go to: `http://localhost:3000/redeem`
- Connect your Solana wallet
- See all your promotion/discount NFTs

### 2️⃣ Stake an NFT
- Click **"⭐ Stake NFT"** on any NFT card
- Confirm the staking
- Wait for success message

### 3️⃣ View Your Stakes
- Go to: `http://localhost:3000/staking`
- See all your staked NFTs
- View pending rewards
- See your tier and stats

### 4️⃣ Claim Rewards
- Click **"Claim All"** at the top OR
- Click **"Claim Rewards"** on individual NFT cards
- Rewards are added to your account

### 5️⃣ Unstake (Optional)
- Click **"Unstake"** on a stake
- Wait 7 days cooldown period
- Complete unstaking after cooldown

## 📊 Reward Tiers

Your NFT's discount percentage determines your tier and rewards:

- **🥉 Bronze** (0-14% discount): 10 tokens/day
- **🥈 Silver** (15-29% discount): 15 tokens/day × 1.2 = 18 tokens/day
- **🥇 Gold** (30-49% discount): 25 tokens/day × 1.5 = 37.5 tokens/day
- **💎 Platinum** (50-100% discount): 50 tokens/day × 2.0 = 100 tokens/day

**Plus consecutive bonuses** (up to 50%) for holding longer!

## 🔄 How It Works

1. **You stake** → NFT stays in your wallet
2. **System verifies** → Every 6 hours checks ownership
3. **Rewards accrue** → Based on tier and time held
4. **You claim** → Withdraw rewards anytime
5. **You unstake** → After 7-day cooldown (optional)

## 🎁 Rewards Calculation

```
Daily Reward = Base Rate × Tier Multiplier × (1 + Consecutive Bonus)

Example (Gold tier, 10 days):
= 25 × 1.5 × (1 + 0.1)
= 41.25 tokens/day
```

After 30 days of holding:
- Base: 25 × 30 = 750 tokens
- Multiplier: 750 × 1.5 = 1,125 tokens
- Consecutive: 1,125 × 1.3 = 1,462.5 tokens ✅

## 📁 What Was Created

### Backend Files:
- ✅ `api/db/schema.ts` - Database interfaces
- ✅ `api/db/index.ts` - Database operations
- ✅ `api/services/ownership-verifier.ts` - DAS API verification
- ✅ `api/services/reward-calculator.ts` - Reward calculations
- ✅ `api/services/staking-service.ts` - Core staking logic
- ✅ `api/routes/staking.ts` - API endpoints
- ✅ `api/jobs/staking-verification.ts` - Background jobs
- ✅ `api/server.ts` - Updated with staking routes

### Frontend Files:
- ✅ `frontend/app/staking/page.tsx` - Staking dashboard
- ✅ `frontend/components/StakingCard.tsx` - Stake cards
- ✅ `frontend/components/StakingStats.tsx` - Stats display
- ✅ `frontend/components/RewardClaimModal.tsx` - Claim modal
- ✅ `frontend/app/redeem/page.tsx` - Updated with staking

### Data Files:
- ✅ `data/staking-records.json` - Active stakes
- ✅ `data/staking-rewards.json` - Reward history
- ✅ `data/staking-sessions.json` - Session logs
- ✅ `data/user-staking-stats.json` - User stats

### Documentation:
- ✅ `STAKING_SYSTEM.md` - Full documentation
- ✅ `STAKING_QUICK_START.md` - Quick start guide
- ✅ `STAKE_NOW.md` - This file

## 🧪 Test the API

```bash
# Health check
curl http://localhost:3001/health

# Get all stakes (replace YOUR_WALLET)
curl "http://localhost:3001/api/staking/my-stakes?ownerAddress=YOUR_WALLET"

# Get user stats
curl "http://localhost:3001/api/staking/stats/YOUR_WALLET"
```

## ❓ Common Questions

**Q: Where are my NFTs stored?**  
A: In your wallet! They never leave your control.

**Q: How often are rewards calculated?**  
A: Every 6 hours automatically by background jobs.

**Q: What if I transfer the NFT?**  
A: Ownership will fail verification, stake will be marked inactive.

**Q: Can I unstake immediately?**  
A: No, there's a 7-day cooldown to prevent gaming.

**Q: Where is reward data stored?**  
A: In JSON files (`data/staking-*.json`) for now. Ready for PostgreSQL later.

## 🎉 You're All Set!

Just start both servers and begin staking your cNFTs to earn rewards!

```
Backend:  bun run start    (Terminal 1)
Frontend: npm run dev       (Terminal 2)
URL:     http://localhost:3000/redeem
```

Happy Staking! 🌟


