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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get('ownerAddress');

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: ownerAddress' },
        { status: 400 }
      );
    }

    const records = readStakingRecords();
    const stakes = records.filter(r => r.ownerAddress === ownerAddress);
    
    const enrichedStakes = stakes.map(stake => ({
      ...stake,
      pendingRewards: calculatePendingRewards(stake)
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

