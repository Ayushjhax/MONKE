// Database Schema - TypeScript interfaces for staking system
// This schema is designed to work with JSON files (MVP) and can be migrated to PostgreSQL later

export interface StakingRecord {
  // Primary identifier
  stakeId: string; // UUID format
  
  // NFT Information
  assetId: string; // cNFT asset ID from DAS API
  ownerAddress: string; // Wallet address of the owner
  nftName: string; // Name of the NFT
  discountPercent: number; // Discount percentage from NFT
  merchant: string; // Merchant name
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'; // Staking tier
  
  // Staking Metadata
  stakedAt: string; // ISO timestamp when staked
  lastVerifiedAt: string; // ISO timestamp of last ownership verification
  status: 'active' | 'pending_unstake' | 'unstaked' | 'inactive'; // Stake status
  consecutiveDays: number; // Days held continuously
  verificationFailures: number; // Count of failed ownership verifications
  
  // Unstaking Information
  unstakeRequestedAt?: string; // ISO timestamp when unstaking was requested
  cooldownEndsAt?: string; // ISO timestamp when cooldown ends
  unstakedAt?: string; // ISO timestamp when unstake completed
  
  // Reward Information
  totalRewardsEarned: number; // Total rewards earned (SOL or tokens)
  totalRewardsClaimed: number; // Total rewards claimed
  pendingRewards: number; // Current pending rewards
  
  // Additional Metadata
  metadata?: {
    category?: string;
    expiryDate?: string;
    redemptionCode?: string;
    merchantId?: string;
  };
}

export interface StakingReward {
  // Primary identifier
  rewardId: string; // UUID format
  
  // Reference to staking record
  stakeId: string;
  assetId: string;
  
  // Reward Information
  amount: number; // Reward amount
  claimedAt: string; // ISO timestamp when claimed
  claimed: boolean; // Whether reward has been claimed
  
  // Reward Period
  periodStart: string; // ISO timestamp
  periodEnd: string; // ISO timestamp
  
  // Transaction Info
  signature?: string; // Transaction signature for claiming
}

export interface StakingSession {
  // Primary identifier
  sessionId: string; // UUID format
  
  // Session Information
  stakeId: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp (undefined if ongoing)
  
  // Session Stats
  durationHours: number; // Total hours staked in this session
  rewardsEarned: number; // Rewards earned during this session
  verificationCount: number; // Number of successful verifications
  status: 'active' | 'completed';
}

export interface UserStakingStats {
  // User identifier
  userAddress: string; // Wallet address
  
  // Aggregate Statistics
  totalNFTsStaked: number; // Total NFTs currently staked
  totalRewardsEarned: number; // Lifetime rewards earned
  totalRewardsClaimed: number; // Lifetime rewards claimed
  totalDaysStaked: number; // Lifetime days staked
  averageAPY: number; // Average APY across all stakes
  
  // Recent Activity
  lastStakedAt?: string; // ISO timestamp
  lastClaimedAt?: string; // ISO timestamp
  
  // Tier Distribution
  tierDistribution: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

// Database file paths (for JSON storage)
export const DB_PATHS = {
  STAKING_RECORDS: './data/staking-records.json',
  STAKING_REWARDS: './data/staking-rewards.json',
  STAKING_SESSIONS: './data/staking-sessions.json',
  USER_STATS: './data/user-staking-stats.json'
};


