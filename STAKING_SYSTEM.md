# cNFT Staking/Rewards System

## Overview

The cNFT Staking System is a **Proof-of-Hold + Time-Based Reward System** that allows users to earn rewards by holding their discount voucher NFTs (cNFTs) in their wallets. Unlike traditional staking, this system doesn't require transferring NFTs to an escrow contract.

## Features

- ✅ **Proof-of-Hold**: Keep cNFTs in your wallet
- ✅ **Ownership Verification**: Automated verification every 6 hours via DAS API
- ✅ **Tier-Based Rewards**: Bronze, Silver, Gold, and Platinum tiers
- ✅ **Time-Based Rewards**: Rewards accrue based on time held
- ✅ **Consecutive Bonus**: Up to 50% bonus for long-term holders
- ✅ **7-Day Cooldown**: Prevents gaming when unstaking
- ✅ **Real-Time UI**: View staking stats and pending rewards

## System Architecture

### Backend Components

#### 1. Database Layer (`MONKE/api/db/`)
- **schema.ts**: TypeScript interfaces for all database tables
- **index.ts**: Database operations (currently JSON-based, ready for PostgreSQL migration)

#### 2. Service Layer (`MONKE/api/services/`)
- **staking-service.ts**: Core business logic for staking operations
- **reward-calculator.ts**: Reward calculation engine with tier system
- **ownership-verifier.ts**: DAS API integration for ownership checks

#### 3. API Routes (`MONKE/api/routes/`)
- **staking.ts**: REST API endpoints for staking operations

#### 4. Background Jobs (`MONKE/api/jobs/`)
- **staking-verification.ts**: Periodic verification and reward processing

### Frontend Components

#### 1. Staking Dashboard (`MONKE/frontend/app/staking/page.tsx`)
- Main staking interface
- View all staked NFTs
- Claim rewards
- Request unstaking

#### 2. Components (`MONKE/frontend/components/`)
- **StakingCard.tsx**: Individual stake display
- **StakingStats.tsx**: Aggregate statistics dashboard
- **RewardClaimModal.tsx**: Modal for claiming rewards

#### 3. Integration (`MONKE/frontend/app/redeem/page.tsx`)
- Added staking button to NFT cards
- Show staking status on each NFT
- Display pending rewards

## Reward Tiers

```typescript
const REWARD_TIERS = {
  bronze: { 
    dailyRate: 10,      // tokens per day
    multiplier: 1.0,
    minDiscount: 0,
    maxDiscount: 14
  },
  silver: { 
    dailyRate: 15,
    multiplier: 1.2,
    minDiscount: 15,
    maxDiscount: 29
  },
  gold: { 
    dailyRate: 25,
    multiplier: 1.5,
    minDiscount: 30,
    maxDiscount: 49
  },
  platinum: { 
    dailyRate: 50,
    multiplier: 2.0,
    minDiscount: 50,
    maxDiscount: 100
  }
};
```

Tier is determined by the discount percentage of the NFT:
- **Platinum**: 50-100% discount
- **Gold**: 30-49% discount
- **Silver**: 15-29% discount
- **Bronze**: 0-14% discount

## Reward Calculation Formula

```typescript
// Base formula
dailyReward = baseRewardRate * tierMultiplier * consecutiveBonus * merchantBonus

// Where:
// - baseRewardRate = from tier (10-50 tokens/day)
// - tierMultiplier = 1.0 - 2.0 based on tier
// - consecutiveBonus = min(consecutiveDays * 0.01, 0.5) // max 50% bonus
// - merchantBonus = varies by merchant loyalty program
```

### Example Calculation

For a **Gold tier** NFT staked for 10 days:
- Base daily rate: 25 tokens/day
- Tier multiplier: 1.5x
- Consecutive bonus: 10 days × 0.01 = 0.1 (10% bonus)
- Final calculation: 25 × 1.5 × 1.1 = **41.25 tokens/day**

## API Endpoints

### Stake an NFT
```http
POST /api/staking/stake
Content-Type: application/json

{
  "assetId": "cNFT-asset-id",
  "ownerAddress": "wallet-address"
}
```

### Request Unstaking
```http
POST /api/staking/unstake
Content-Type: application/json

{
  "stakeId": "stake-id",
  "ownerAddress": "wallet-address"
}
```

### Complete Unstaking
```http
POST /api/staking/unstake-complete
Content-Type: application/json

{
  "stakeId": "stake-id",
  "ownerAddress": "wallet-address"
}
```

### Claim Rewards
```http
POST /api/staking/rewards/claim
Content-Type: application/json

{
  "ownerAddress": "wallet-address"
}
```

### Get Staking Status
```http
GET /api/staking/status/:assetId
```

### Get My Stakes
```http
GET /api/staking/my-stakes?ownerAddress=wallet-address
```

### Get Pending Rewards
```http
GET /api/staking/rewards/pending?ownerAddress=wallet-address
```

### Get User Stats
```http
GET /api/staking/stats/:ownerAddress
```

## Staking Flow

### 1. Stake an NFT

1. User clicks "Stake NFT" button on redeem page
2. Backend verifies ownership via DAS API
3. Determines staking tier from NFT attributes
4. Creates staking record in database
5. Returns success with staking details

### 2. Periodic Verification (Every 6 Hours)

1. Background job runs verification for all active stakes
2. For each stake:
   - Check ownership via DAS API
   - Calculate rewards since last verification
   - Update staking record with new rewards
   - Update consecutive days if ownership valid
   - If ownership lost 3+ times, mark as inactive

### 3. Claim Rewards

1. User clicks "Claim Rewards" button
2. Backend calculates total pending rewards
3. Updates totalRewardsEarned in all stakes
4. Resets pendingRewards to 0
5. Updates user stats

### 4. Unstake NFT

1. User clicks "Unstake" button
2. Backend sets status to "pending_unstake"
3. Sets cooldownEndsAt to 7 days from now
4. User must wait cooldown period
5. After cooldown, user can complete unstaking
6. Final reward calculation and status update

## Background Jobs

### Verification Job (Every 6 Hours)

Runs automatically to:
- Verify ownership for all active stakes
- Calculate and update pending rewards
- Track consecutive days
- Mark stale stakes as inactive
- Process unstake requests ready to complete

### Job Configuration

In `MONKE/api/server.ts`:

```typescript
// Run verification job every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Running scheduled staking verification job...');
  await runAllJobs();
});
```

## Security Features

1. **Ownership Verification**: Every 6 hours via DAS API
2. **Failure Tracking**: Max 3 consecutive failures before marking inactive
3. **Cooldown Period**: 7-day cooldown prevents instant unstaking
4. **Auditable Calculations**: All reward calculations are transparent
5. **Rate Limiting**: API endpoints should have rate limiting

## Data Storage

### MVP: JSON Files

Currently stores data in JSON files:
- `MONKE/data/staking-records.json`
- `MONKE/data/staking-rewards.json`
- `MONKE/data/staking-sessions.json`
- `MONKE/data/user-staking-stats.json`

### Future: PostgreSQL Migration

The database layer is designed to be easily migrated to PostgreSQL. Simply swap out the file operations in `MONKE/api/db/index.ts` with SQL queries.

## Environment Variables

Add to `.env`:

```env
# Staking Configuration
STAKING_COOLDOWN_DAYS=7
STAKING_VERIFICATION_INTERVAL_HOURS=6

# Helius API (for ownership verification)
HELIUS_API_KEY=your-helius-api-key
NODE_ENV=development  # or 'production' for mainnet
```

## Frontend Routes

- **Staking Dashboard**: `/staking` - View all staked NFTs, claim rewards, manage stakes
- **Redeem Page**: `/redeem` - View NFTs, stake or redeem

## Usage

### Staking an NFT

1. Go to `/redeem` page
2. Connect your wallet
3. Find an NFT you want to stake
4. Click "⭐ Stake NFT" button
5. Confirm the staking request
6. View your stake in `/staking` dashboard

### Claiming Rewards

1. Go to `/staking` dashboard
2. Click "Claim Rewards" on any stake
3. Or click "Claim All" button at the top
4. Confirm the transaction
5. Rewards are added to your account

### Unstaking

1. Go to `/staking` dashboard
2. Click "Unstake" on a stake
3. Wait for 7-day cooldown
4. Complete the unstaking after cooldown
5. Final rewards are calculated and paid out

## Testing

To test the staking system:

1. Start the backend server:
```bash
cd MONKE
bun install  # Install node-cron
bun run start
```

2. Start the frontend:
```bash
cd MONKE/frontend
npm install
npm run dev
```

3. Connect wallet on devnet
4. Navigate to `/redeem` page
5. Stake an NFT
6. Check `/staking` dashboard for rewards

## Database Migration to PostgreSQL

When ready to migrate to PostgreSQL:

1. Install PostgreSQL and create database
2. Create tables based on schema in `MONKE/api/db/schema.ts`
3. Update `MONKE/api/db/index.ts` to use SQL queries instead of file operations
4. Update connection string in environment variables

## Troubleshooting

### Stakes Not Showing

- Check ownership verification is running
- Check console logs for DAS API errors
- Verify wallet is connected

### Rewards Not Accruing

- Check background job is running
- Verify ownership checks are passing
- Check verification interval configuration

### Unstaking Not Working

- Ensure cooldown period has passed
- Check stake status is "pending_unstake"
- Verify ownership hasn't changed during cooldown

## Future Enhancements

- [ ] Merchant-specific bonus programs
- [ ] Referral rewards
- [ ] Leaderboards
- [ ] Social features
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Push notifications for failed verifications

## Support

For issues or questions, please open an issue on the repository or contact the development team.


