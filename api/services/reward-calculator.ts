// Reward Calculator Service - Calculates staking rewards based on tier and time

import { StakingRecord } from '../db/schema.js';
import * as db from '../db/index.js';

// Reward tier configuration
export const REWARD_TIERS = {
  bronze: { 
    dailyRate: 10,      // tokens per day
    multiplier: 1.0,
    minDiscount: 0,
    maxDiscount: 14,
    displayName: 'Bronze'
  },
  silver: { 
    dailyRate: 15,
    multiplier: 1.2,
    minDiscount: 15,
    maxDiscount: 29,
    displayName: 'Silver'
  },
  gold: { 
    dailyRate: 25,
    multiplier: 1.5,
    minDiscount: 30,
    maxDiscount: 49,
    displayName: 'Gold'
  },
  platinum: { 
    dailyRate: 50,
    multiplier: 2.0,
    minDiscount: 50,
    maxDiscount: 100,
    displayName: 'Platinum'
  }
};

export type RewardTier = keyof typeof REWARD_TIERS;

/**
 * Determine staking tier based on NFT discount percentage
 */
export function calculateStakingTier(discountPercent: number): RewardTier {
  if (discountPercent >= 50) return 'platinum';
  if (discountPercent >= 30) return 'gold';
  if (discountPercent >= 15) return 'silver';
  return 'bronze';
}

/**
 * Get reward multiplier for a tier
 */
export function getRewardMultiplier(tier: RewardTier): number {
  return REWARD_TIERS[tier].multiplier;
}

/**
 * Calculate bonus based on consecutive days staked
 * Max bonus of 50% after 50 consecutive days
 */
export function calculateConsecutiveBonus(consecutiveDays: number): number {
  return Math.min(consecutiveDays * 0.01, 0.5); // max 50% bonus
}

/**
 * Calculate merchant bonus (placeholder for future merchant loyalty programs)
 */
export function calculateMerchantBonus(merchant: string): number {
  // Default: no bonus
  // Future: implement merchant-specific bonuses based on merchant loyalty programs
  return 1.0;
}

/**
 * Calculate pending rewards for a stake
 */
export function calculatePendingRewards(
  stake: StakingRecord,
  verificationInterval: number = 6 // hours
): number {
  const tier = REWARD_TIERS[stake.tier];
  const timeSinceLastVerify = new Date().getTime() - new Date(stake.lastVerifiedAt).getTime();
  const hoursSinceLastVerify = timeSinceLastVerify / (1000 * 60 * 60);
  
  // Calculate base daily reward
  const baseDailyReward = tier.dailyRate;
  
  // Calculate rewards since last verification
  const daysSinceLastVerify = hoursSinceLastVerify / 24;
  let baseReward = baseDailyReward * daysSinceLastVerify;
  
  // Apply tier multiplier
  baseReward = baseReward * tier.multiplier;
  
  // Apply consecutive bonus
  const consecutiveBonus = calculateConsecutiveBonus(stake.consecutiveDays);
  baseReward = baseReward * (1 + consecutiveBonus);
  
  // Apply merchant bonus
  const merchantBonus = calculateMerchantBonus(stake.merchant);
  baseReward = baseReward * merchantBonus;
  
  // Round to 6 decimal places
  return Math.round(baseReward * 1000000) / 1000000;
}

/**
 * Calculate total pending rewards for a user
 */
export function calculateTotalPendingRewards(ownerAddress: string): number {
  const stakes = db.getStakingRecordsByOwner(ownerAddress);
  
  return stakes
    .filter(stake => stake.status === 'active' || stake.status === 'pending_unstake')
    .reduce((total, stake) => {
      const pending = calculatePendingRewards(stake);
      return total + pending;
    }, 0);
}

/**
 * Calculate APY for a stake
 */
export function calculateAPY(tier: RewardTier, consecutiveDays: number): number {
  const tierConfig = REWARD_TIERS[tier];
  const baseDailyReward = tierConfig.dailyRate;
  const consecutiveBonus = calculateConsecutiveBonus(consecutiveDays);
  
  const adjustedDailyReward = baseDailyReward * tierConfig.multiplier * (1 + consecutiveBonus);
  const yearlyReward = adjustedDailyReward * 365;
  
  // APY calculation (assuming 1 SOL = $100 base value for conversion)
  return yearlyReward / 1.0; // This is simplified - adjust based on token economics
}

/**
 * Get reward rate per day for a tier
 */
export function getRewardRatePerDay(tier: RewardTier): number {
  return REWARD_TIERS[tier].dailyRate;
}

/**
 * Get reward multiplier for a tier
 */
export function getTierMultiplier(tier: RewardTier): number {
  return REWARD_TIERS[tier].multiplier;
}

/**
 * Calculate total rewards earned (claimed + pending) for a stake
 */
export function calculateTotalRewardsEarned(stake: StakingRecord): number {
  return stake.totalRewardsEarned + calculatePendingRewards(stake);
}

/**
 * Format reward amount for display
 */
export function formatRewardAmount(amount: number): string {
  return amount.toFixed(6);
}

/**
 * Calculate reward breakdown for display
 */
export interface RewardBreakdown {
  baseReward: number;
  tierMultiplier: number;
  consecutiveBonus: number;
  merchantBonus: number;
  totalReward: number;
  dailyRate: number;
  apy: number;
}

export function getRewardBreakdown(stake: StakingRecord): RewardBreakdown {
  const tier = REWARD_TIERS[stake.tier];
  const consecutiveBonus = calculateConsecutiveBonus(stake.consecutiveDays);
  const merchantBonus = calculateMerchantBonus(stake.merchant);
  
  const daysSinceLastVerify = (Date.now() - new Date(stake.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
  const baseReward = tier.dailyRate * daysSinceLastVerify;
  
  return {
    baseReward,
    tierMultiplier: tier.multiplier,
    consecutiveBonus: consecutiveBonus * 100, // Convert to percentage
    merchantBonus: (merchantBonus - 1) * 100, // Convert to percentage
    totalReward: calculatePendingRewards(stake),
    dailyRate: tier.dailyRate,
    apy: calculateAPY(stake.tier, stake.consecutiveDays)
  };
}

