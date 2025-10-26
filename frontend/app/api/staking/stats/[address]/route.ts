import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Fix path - go up from frontend/app/api/staking to MONKE/data
const DATA_DIR = path.join(process.cwd(), '../../../data');
const STAKING_RECORDS_FILE = path.join(DATA_DIR, 'staking-records.json');
const USER_STATS_FILE = path.join(DATA_DIR, 'user-staking-stats.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure files exist
if (!fs.existsSync(STAKING_RECORDS_FILE)) {
  fs.writeFileSync(STAKING_RECORDS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(USER_STATS_FILE)) {
  fs.writeFileSync(USER_STATS_FILE, JSON.stringify([], null, 2));
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

function readUserStats(): any[] {
  try {
    const data = fs.readFileSync(USER_STATS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const ownerAddress = address;

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const records = readStakingRecords();
    const userStakes = records.filter(r => r.ownerAddress === ownerAddress);
    const activeStakes = userStakes.filter(s => s.status === 'active');

    // Calculate stats
    const totalNFTsStaked = activeStakes.length;
    const totalRewardsEarned = userStakes.reduce((sum, s) => sum + s.totalRewardsEarned, 0);
    const totalRewardsClaimed = userStakes.reduce((sum, s) => sum + s.totalRewardsClaimed, 0);
    const totalDaysStaked = userStakes.length > 0 ? 
      Math.floor((Date.now() - new Date(userStakes[0].stakedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Calculate tier distribution
    const tierDistribution = {
      bronze: activeStakes.filter(s => s.tier === 'bronze').length,
      silver: activeStakes.filter(s => s.tier === 'silver').length,
      gold: activeStakes.filter(s => s.tier === 'gold').length,
      platinum: activeStakes.filter(s => s.tier === 'platinum').length
    };

    const stats = {
      userAddress: ownerAddress,
      totalNFTsStaked,
      totalRewardsEarned,
      totalRewardsClaimed,
      totalDaysStaked,
      averageAPY: totalNFTsStaked > 0 ? (totalRewardsEarned / totalDaysStaked) * 365 : 0,
      tierDistribution
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

