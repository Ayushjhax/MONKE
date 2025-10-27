# Staking System - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun installed
- Solana wallet (Phantom, Solflare, etc.)
- Devnet or Mainnet setup

### 1. Install Dependencies

**Backend:**
```bash
cd MONKE
bun install
```

**Frontend:**
```bash
cd MONKE/frontend
npm install
```

### 2. Environment Setup

Create/update `.env` file in `MONKE/`:
```env
PORT=3001
HELIUS_API_KEY=your-helius-api-key
NODE_ENV=development

# Optional: Staking Configuration
STAKING_COOLDOWN_DAYS=7
STAKING_VERIFICATION_INTERVAL_HOURS=6
```

### 3. Start the System

**Terminal 1 - Backend:**
```bash
cd MONKE
bun run start
```

You should see:
```
🚀 DealCoin API Server Started
📍 Server running on http://localhost:3001
⏰ Staking verification job scheduled to run every 6 hours
⏰ Running initial staking verification job...
```

**Terminal 2 - Frontend:**
```bash
cd MONKE/frontend
npm run dev
```

Frontend will be running at `http://localhost:3000`

## 📱 How to Use the Staking System

### Step 1: Connect Your Wallet

1. Open `http://localhost:3000/redeem`
2. Click "Select Wallet" or your wallet adapter button
3. Connect your Phantom/Solflare wallet
4. Make sure you're on **Devnet**

### Step 2: View Your NFTs

1. Navigate to `/redeem` page
2. Your promotion/discount NFTs will appear automatically
3. Each NFT card shows:
   - NFT name and metadata
   - Discount percentage
   - Merchant name
   - Category
   - Redemption code

### Step 3: Stake an NFT

1. Find an NFT you want to stake
2. Click the **"⭐ Stake NFT"** button
3. Confirm the staking request
4. Success message will appear
5. NFT is now being staked!

### Step 4: View Staking Dashboard

1. Click **"📊 View in Staking Dashboard"** or navigate to `/staking`
2. You'll see:
   - Total NFTs staked
   - Total rewards earned
   - Pending rewards
   - Tier distribution (Bronze/Silver/Gold/Platinum)
   - All your staked NFTs with details

### Step 5: Claim Rewards

**Option A: Claim All**
- Click the **"Claim All"** button at the top of the staking dashboard
- Confirm the transaction
- All pending rewards are added to your account

**Option B: Claim Individual**
- Click **"Claim Rewards"** on any individual stake card
- Rewards for that NFT only are claimed

### Step 6: Unstake NFT (Optional)

1. In the staking dashboard, find the NFT to unstake
2. Click **"Unstake"** button
3. Wait 7 days (cooldown period)
4. After cooldown ends, complete the unstaking
5. Final rewards are calculated and paid out

## 🎯 Understanding Reward Tiers

Your tier determines how much you earn per day:

| Tier | Discount Range | Daily Rate | Multiplier |
|------|---------------|------------|------------|
| 🥉 Bronze | 0-14% | 10 tokens | 1.0x |
| 🥈 Silver | 15-29% | 15 tokens | 1.2x |
| 🥇 Gold | 30-49% | 25 tokens | 1.5x |
| 💎 Platinum | 50-100% | 50 tokens | 2.0x |

**Example Calculation:**
- Gold tier NFT: 25 tokens/day × 1.5 multiplier = 37.5 tokens/day
- Plus consecutive bonus (after 10 days): +10% = 41.25 tokens/day
- After 30 days holding: ~1,237 tokens

## 🔄 How Rewards Work

1. **Rewards accrue automatically** - No action needed
2. **Verified every 6 hours** - System checks ownership
3. **Consecutive bonus** - Hold longer, earn more (up to 50% bonus)
4. **Claim anytime** - Withdraw your rewards when you want
5. **7-day cooldown** - Prevents gaming when unstaking

## 📊 Key Features

✅ **Proof-of-Hold**: Keep NFTs in your wallet  
✅ **No Transfers**: NFTs stay in your control  
✅ **Automatic Verification**: Every 6 hours via DAS API  
✅ **Tier System**: Higher discounts = Higher rewards  
✅ **Time-Based**: Rewards based on time held  
✅ **Consecutive Bonus**: Long-term holders get up to 50% bonus  
✅ **Cooldown Protection**: 7-day unstaking cooldown  
✅ **Real-Time UI**: See your stats instantly  

## 🔍 API Endpoints

Test the API directly:

```bash
# Get your staking status
curl "http://localhost:3001/api/staking/my-stakes?ownerAddress=YOUR_WALLET"

# Claim rewards
curl -X POST http://localhost:3001/api/staking/rewards/claim \
  -H "Content-Type: application/json" \
  -d '{"ownerAddress":"YOUR_WALLET"}'

# Get user stats
curl "http://localhost:3001/api/staking/stats/YOUR_WALLET"
```

## 🛠 Troubleshooting

### "No NFTs Found"
- Make sure you have promotion/discount NFTs in your wallet
- Check you're on Devnet (not Mainnet)
- NFTs must have "Platform: DealCoin" attribute

### "Failed to Verify Ownership"
- Check Helius API key is set correctly
- Ensure network matches (Devnet vs Mainnet)
- NFT may have been transferred to another wallet

### Rewards Not Showing
- Background job runs every 6 hours
- Wait for next verification cycle
- Check server logs for errors

### Backend Won't Start
```bash
# Make sure dependencies are installed
cd MONKE
bun install

# Check if port 3001 is available
lsof -i :3001
```

### Frontend Issues
```bash
cd MONKE/frontend
npm install
rm -rf .next
npm run dev
```

## 📁 File Structure

```
MONKE/
├── api/
│   ├── db/
│   │   ├── schema.ts          # Database interfaces
│   │   └── index.ts            # Database operations
│   ├── services/
│   │   ├── staking-service.ts      # Core staking logic
│   │   ├── reward-calculator.ts    # Reward calculations
│   │   └── ownership-verifier.ts   # DAS API verification
│   ├── routes/
│   │   └── staking.ts          # API endpoints
│   ├── jobs/
│   │   └── staking-verification.ts  # Background jobs
│   └── server.ts               # Main server (updated)
│
├── frontend/
│   ├── app/
│   │   ├── staking/
│   │   │   └── page.tsx        # Staking dashboard
│   │   └── redeem/
│   │       └── page.tsx        # Updated with staking
│   └── components/
│       ├── StakingCard.tsx     # Individual stake card
│       ├── StakingStats.tsx    # Stats dashboard
│       └── RewardClaimModal.tsx # Reward claim modal
│
└── data/
    ├── staking-records.json    # Active stakes
    ├── staking-rewards.json    # Reward history
    ├── staking-sessions.json   # Session logs
    └── user-staking-stats.json # User statistics
```

## 🎓 Example Workflow

**User Story: "I want to earn rewards by holding my discount NFT"**

1. User has a 30% OFF dining discount NFT
2. User goes to `/redeem` page
3. Sees their NFT with "⭐ Stake NFT" button
4. Clicks button → NFT is staked
5. Goes to `/staking` dashboard
6. Sees:
   - NFT is in **Gold tier** (30% discount)
   - Earning **25 tokens/day** × 1.5 multiplier = **37.5 tokens/day**
   - Consecutive days: 1
7. After 24 hours, checks dashboard again:
   - Pending rewards: **37.5 tokens**
   - Consecutive days: 2
8. Clicks "Claim Rewards" → Rewards added to account
9. After 30 days:
   - Total rewards: ~1,237 tokens
   - Consecutive bonus: 30% (30 days × 1%)
   - Final daily rate: ~48.75 tokens/day

## 📝 Notes

- **Data Storage**: Currently uses JSON files (perfect for MVP)
- **Migration Ready**: Can easily upgrade to PostgreSQL later
- **Verification**: Runs every 6 hours automatically
- **Cooldown**: 7-day wait period before unstaking completes
- **Ownership**: Verified via Helius DAS API every 6 hours

## 🎉 You're Ready!

Start the system and begin staking your cNFTs to earn rewards!

For detailed API documentation, see `MONKE/STAKING_SYSTEM.md`


