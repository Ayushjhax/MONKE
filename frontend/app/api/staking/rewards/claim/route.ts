import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Fix path - go up from frontend/app/api/staking to MONKE/data
const DATA_DIR = path.join(process.cwd(), '../../../data');
const STAKING_RECORDS_FILE = path.join(DATA_DIR, 'staking-records.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure file exists
if (!fs.existsSync(STAKING_RECORDS_FILE)) {
  fs.writeFileSync(STAKING_RECORDS_FILE, JSON.stringify([], null, 2));
}

interface StakingRecord {
  stakeId: string;
  assetId: string;
  ownerAddress: string;
  nftName: string;
  discountPercent: number;
  merchant: string;
  tier: string;
  stakedAt: string;
  lastVerifiedAt: string;
  status: string;
  consecutiveDays: number;
  verificationFailures: number;
  totalRewardsEarned: number;
  totalRewardsClaimed: number;
  pendingRewards: number;
}

function readStakingRecords(): StakingRecord[] {
  try {
    const data = fs.readFileSync(STAKING_RECORDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeStakingRecords(records: StakingRecord[]): void {
  try {
    fs.writeFileSync(STAKING_RECORDS_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error writing staking records:', error);
  }
}

function calculatePendingRewards(stake: StakingRecord): number {
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

export async function POST(request: NextRequest) {
  try {
    const { ownerAddress } = await request.json();

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: ownerAddress' },
        { status: 400 }
      );
    }

    const records = readStakingRecords();
    const userStakes = records.filter(
      r => r.ownerAddress === ownerAddress && (r.status === 'active' || r.status === 'pending_unstake')
    );
    
    let totalRewards = 0;
    const now = new Date().toISOString();

    // Calculate and update rewards for each stake
    for (const stake of userStakes) {
      const pendingReward = calculatePendingRewards(stake);
      totalRewards += pendingReward;
      
      // Update the stake
      stake.totalRewardsEarned += pendingReward;
      stake.pendingRewards = 0;
      stake.lastVerifiedAt = now;
    }

    if (totalRewards === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending rewards to claim' },
        { status: 400 }
      );
    }

    writeStakingRecords(records);

    return NextResponse.json({
      success: true,
      totalAmount: Math.round(totalRewards * 1000000) / 1000000,
      message: `Successfully claimed ${totalRewards.toFixed(6)} rewards`
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

