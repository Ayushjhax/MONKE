// Staking Service - Core business logic for staking operations

import { StakingRecord, UserStakingStats } from '../db/schema.js';
import * as db from '../db/index.js';
import { verifyCNFTOwnership, getAssetMetadata } from './ownership-verifier.js';
import { calculateStakingTier, calculatePendingRewards, calculateTotalPendingRewards } from './reward-calculator.js';

export interface StakeRequest {
  assetId: string;
  ownerAddress: string;
}

export interface StakeResult {
  success: boolean;
  stake?: StakingRecord;
  error?: string;
}

export interface UnstakeRequest {
  stakeId: string;
  ownerAddress: string;
}

export interface UnstakeResult {
  success: boolean;
  error?: string;
  cooldownEndsAt?: string;
}

export interface ClaimRewardsRequest {
  ownerAddress: string;
}

export interface ClaimRewardsResult {
  success: boolean;
  totalAmount: number;
  signatures?: string[];
  error?: string;
}

const COOLDOWN_DAYS = 7;
const MAX_VERIFICATION_FAILURES = 3;

/**
 * Start staking an NFT
 */
export async function stakeNFT(request: StakeRequest): Promise<StakeResult> {
  try {
    // Check if NFT is already staked
    const existingStake = db.getStakingRecordByAssetId(request.assetId);
    if (existingStake && existingStake.status === 'active') {
      return {
        success: false,
        error: 'This NFT is already being staked'
      };
    }

    // Verify ownership
    const ownershipCheck = await verifyCNFTOwnership(
      request.assetId,
      request.ownerAddress
    );

    if (!ownershipCheck.isOwner) {
      return {
        success: false,
        error: ownershipCheck.error || 'Failed to verify ownership'
      };
    }

    // Get asset metadata
    const assetData = ownershipCheck.assetData;
    if (!assetData) {
      return {
        success: false,
        error: 'Failed to fetch asset metadata'
      };
    }

    // Extract NFT information
    const attrs = assetData.content?.metadata?.attributes || [];
    const metadataName = assetData.content?.metadata?.name || 'Unknown NFT';
    
    // Find discount percentage
    let discountPercent = 0;
    const discountAttr = attrs.find((attr: any) => 
      attr.trait_type === 'Discount Percent' || 
      attr.trait_type === 'Discount' ||
      attr.trait_type === 'discount_percent'
    );
    
    if (discountAttr) {
      discountPercent = parseInt(discountAttr.value) || 0;
    }

    // Find merchant name
    let merchant = 'Unknown';
    const merchantAttr = attrs.find((attr: any) => 
      attr.trait_type === 'Merchant' || 
      attr.trait_type === 'merchant'
    );
    
    if (merchantAttr) {
      merchant = merchantAttr.value;
    }

    // Determine tier
    const tier = calculateStakingTier(discountPercent);

    // Create staking record
    const stake: StakingRecord = {
      stakeId: db.generateId(),
      assetId: request.assetId,
      ownerAddress: request.ownerAddress,
      nftName: metadataName,
      discountPercent,
      merchant,
      tier,
      stakedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'active',
      consecutiveDays: 1,
      verificationFailures: 0,
      totalRewardsEarned: 0,
      totalRewardsClaimed: 0,
      pendingRewards: 0,
      metadata: {
        category: assetData.content?.metadata?.name || undefined,
        expiryDate: attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value,
        merchantId: assetData.creators?.[0]?.address
      }
      }
    };

    db.createStakingRecord(stake);

    // Update user stats
    updateUserStatsAfterStake(request.ownerAddress, tier);

    return {
      success: true,
      stake
    };

  } catch (error) {
    console.error('Error staking NFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Request to unstake an NFT
 */
export function requestUnstake(request: UnstakeRequest): UnstakeResult {
  const stake = db.getStakingRecordById(request.stakeId);

  if (!stake) {
    return {
      success: false,
      error: 'Staking record not found'
    };
  }

  if (stake.ownerAddress !== request.ownerAddress) {
    return {
      success: false,
      error: 'Unauthorized: not the owner of this stake'
    };
  }

  if (stake.status === 'pending_unstake') {
    return {
      success: false,
      error: 'Unstaking already in progress'
    };
  }

  // Calculate cooldown period
  const cooldownEndsAt = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Update stake status
  db.updateStakingRecord(request.stakeId, {
    status: 'pending_unstake',
    unstakeRequestedAt: new Date().toISOString(),
    cooldownEndsAt
  });

  return {
    success: true,
    cooldownEndsAt
  };
}

/**
 * Complete unstaking after cooldown
 */
export async function completeUnstake(stakeId: string, ownerAddress: string): Promise<UnstakeResult> {
  const stake = db.getStakingRecordById(stakeId);

  if (!stake) {
    return {
      success: false,
      error: 'Staking record not found'
    };
  }

  if (stake.ownerAddress !== ownerAddress) {
    return {
      success: false,
      error: 'Unauthorized: not the owner of this stake'
    };
  }

  if (stake.status !== 'pending_unstake') {
    return {
      success: false,
      error: 'Stake is not in pending_unstake status'
    };
  }

  // Check if cooldown has expired
  if (stake.cooldownEndsAt && new Date(stake.cooldownEndsAt) > new Date()) {
    return {
      success: false,
      error: 'Cooldown period has not expired yet'
    };
  }

  // Process final rewards
  const pendingRewards = calculatePendingRewards(stake);
  const finalTotalRewards = stake.totalRewardsEarned + pendingRewards;

  // Update stake status
  db.updateStakingRecord(stakeId, {
    status: 'unstaked',
    unstakedAt: new Date().toISOString(),
    totalRewardsEarned: finalTotalRewards,
    pendingRewards: 0
  });

  // Update user stats
  updateUserStatsAfterUnstake(ownerAddress, finalTotalRewards);

  return {
    success: true
  };
}

/**
 * Claim pending rewards
 */
export function claimRewards(request: ClaimRewardsRequest): ClaimRewardsResult {
  try {
    const stakes = db.getStakingRecordsByOwner(request.ownerAddress);
    const activeStakes = stakes.filter(s => s.status === 'active' || s.status === 'pending_unstake');
    
    let totalRewards = 0;
    const stakesToUpdate: { stakeId: string; reward: number }[] = [];

    // Calculate pending rewards for each stake
    for (const stake of activeStakes) {
      const pendingReward = calculatePendingRewards(stake);
      totalRewards += pendingReward;
      
      stakesToUpdate.push({
        stakeId: stake.stakeId,
        reward: pendingReward
      });
    }

    if (totalRewards === 0) {
      return {
        success: false,
        totalAmount: 0,
        error: 'No pending rewards to claim'
      };
    }

    // Update all stakes with claimed rewards
    for (const { stakeId, reward } of stakesToUpdate) {
      const stake = db.getStakingRecordById(stakeId);
      if (stake) {
        db.updateStakingRecord(stakeId, {
          totalRewardsEarned: stake.totalRewardsEarned + reward,
          pendingRewards: 0,
          lastVerifiedAt: new Date().toISOString()
        });
      }
    }

    // Update user stats
    updateUserStatsAfterClaim(request.ownerAddress, totalRewards);

    return {
      success: true,
      totalAmount: totalRewards
    };

  } catch (error) {
    console.error('Error claiming rewards:', error);
    return {
      success: false,
      totalAmount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get staking status for an asset
 */
export function getStakingStatus(assetId: string): StakingRecord | null {
  return db.getStakingRecordByAssetId(assetId);
}

/**
 * Get user's staking stats
 */
export function getUserStats(ownerAddress: string): UserStakingStats {
  const stats = db.getUserStakingStats(ownerAddress);
  
  if (!stats) {
    return {
      userAddress: ownerAddress,
      totalNFTsStaked: 0,
      totalRewardsEarned: 0,
      totalRewardsClaimed: 0,
      totalDaysStaked: 0,
      averageAPY: 0,
      tierDistribution: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    };
  }
  
  return stats;
}

/**
 * Helper to update user stats after staking
 */
function updateUserStatsAfterStake(ownerAddress: string, tier: string): void {
  const stats = db.getUserStakingStats(ownerAddress);
  const stakes = db.getStakingRecordsByOwner(ownerAddress);
  
  const newStats: UserStakingStats = {
    userAddress: ownerAddress,
    totalNFTsStaked: stakes.filter(s => s.status === 'active').length,
    totalRewardsEarned: stats?.totalRewardsEarned || 0,
    totalRewardsClaimed: stats?.totalRewardsClaimed || 0,
    totalDaysStaked: stats?.totalDaysStaked || 0,
    averageAPY: stats?.averageAPY || 0,
    lastStakedAt: new Date().toISOString(),
    lastClaimedAt: stats?.lastClaimedAt,
    tierDistribution: calculateTierDistribution(stakes)
  };
  
  db.createOrUpdateUserStats(newStats);
}

/**
 * Helper to update user stats after unstaking
 */
function updateUserStatsAfterUnstake(ownerAddress: string, rewardsEarned: number): void {
  const stats = db.getUserStakingStats(ownerAddress);
  const stakes = db.getStakingRecordsByOwner(ownerAddress);
  
  const newStats: UserStakingStats = {
    userAddress: ownerAddress,
    totalNFTsStaked: stakes.filter(s => s.status === 'active').length,
    totalRewardsEarned: (stats?.totalRewardsEarned || 0) + rewardsEarned,
    totalRewardsClaimed: stats?.totalRewardsClaimed || 0,
    totalDaysStaked: (stats?.totalDaysStaked || 0) + (rewardsEarned / 10), // Approximate days
    averageAPY: stats?.averageAPY || 0,
    lastStakedAt: stats?.lastStakedAt,
    lastClaimedAt: stats?.lastClaimedAt,
    tierDistribution: calculateTierDistribution(stakes)
  };
  
  db.createOrUpdateUserStats(newStats);
}

/**
 * Helper to update user stats after claiming rewards
 */
function updateUserStatsAfterClaim(ownerAddress: string, claimedAmount: number): void {
  const stats = db.getUserStakingStats(ownerAddress);
  
  const newStats: UserStakingStats = {
    ...stats || {
      userAddress: ownerAddress,
      totalNFTsStaked: 0,
      totalRewardsEarned: 0,
      totalRewardsClaimed: 0,
      totalDaysStaked: 0,
      averageAPY: 0,
      tierDistribution: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    },
    totalRewardsClaimed: (stats?.totalRewardsClaimed || 0) + claimedAmount,
    lastClaimedAt: new Date().toISOString()
  };
  
  db.createOrUpdateUserStats(newStats);
}

/**
 * Calculate tier distribution from stakes
 */
function calculateTierDistribution(stakes: StakingRecord[]): { bronze: number; silver: number; gold: number; platinum: number } {
  const activeStakes = stakes.filter(s => s.status === 'active');
  
  return {
    bronze: activeStakes.filter(s => s.tier === 'bronze').length,
    silver: activeStakes.filter(s => s.tier === 'silver').length,
    gold: activeStakes.filter(s => s.tier === 'gold').length,
    platinum: activeStakes.filter(s => s.tier === 'platinum').length
  };
}

