import { NextRequest, NextResponse } from 'next/server';
import { getStakesByOwner, initializeDatabase, StakingRecordRow } from '@/lib/db';

function calculatePendingRewards(stake: { tier: string; lastVerifiedAt: string; consecutiveDays: number }): number {
  const REWARD_RATES: { [key: string]: number } = {
    bronze: 10,
    silver: 15,
    gold: 25,
    platinum: 50
  };
  
  const MULTIPLIERS: { [key: string]: number } = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0
  };

  const dailyRate = REWARD_RATES[stake.tier] || 10;
  const multiplier = MULTIPLIERS[stake.tier] || 1.0;
  const consecutiveBonus = Math.min(stake.consecutiveDays * 0.01, 0.5);
  
  const timeSinceVerify = (Date.now() - new Date(stake.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
  let reward = dailyRate * timeSinceVerify * multiplier * (1 + consecutiveBonus);
  
  return Math.round(reward * 1000000) / 1000000;
}

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get('ownerAddress');

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: ownerAddress' },
        { status: 400 }
      );
    }

    const rows = await getStakesByOwner(ownerAddress);
    const stakes = rows.map((r: StakingRecordRow) => ({
      stakeId: r.stake_id,
      assetId: r.asset_id,
      ownerAddress: r.owner_address,
      nftName: r.nft_name,
      discountPercent: r.discount_percent,
      merchant: r.merchant,
      tier: r.tier,
      stakedAt: r.staked_at,
      lastVerifiedAt: r.last_verified_at,
      status: r.status,
      consecutiveDays: r.consecutive_days,
      verificationFailures: r.verification_failures,
      totalRewardsEarned: parseFloat(r.total_rewards_earned || '0'),
      totalRewardsClaimed: parseFloat(r.total_rewards_claimed || '0'),
      pendingRewards: parseFloat(r.pending_rewards || '0')
    }));
    
    const enrichedStakes = stakes.map(stake => ({
      ...stake,
      // Compute fresh pending rewards based on last verification time
      pendingRewards: calculatePendingRewards({
        tier: stake.tier,
        lastVerifiedAt: stake.lastVerifiedAt,
        consecutiveDays: stake.consecutiveDays
      })
    }));

    const totalPendingRewards = enrichedStakes
      .filter(s => s.status === 'active' || s.status === 'pending_unstake')
      .reduce((sum, s) => sum + s.pendingRewards, 0);

    return NextResponse.json({
      success: true,
      stakes: enrichedStakes,
      totalActive: enrichedStakes.filter(s => s.status === 'active').length,
      totalPendingRewards
    });
  } catch (error) {
    console.error('Error fetching stakes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

