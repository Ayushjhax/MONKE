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

const COOLDOWN_DAYS = 7;

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
  cooldownEndsAt?: string;
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

export async function POST(request: NextRequest) {
  try {
    const { stakeId, ownerAddress } = await request.json();

    if (!stakeId || !ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: stakeId and ownerAddress' },
        { status: 400 }
      );
    }

    const records = readStakingRecords();
    const stake = records.find(r => r.stakeId === stakeId);

    if (!stake) {
      return NextResponse.json(
        { success: false, error: 'Staking record not found' },
        { status: 404 }
      );
    }

    if (stake.ownerAddress !== ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: not the owner of this stake' },
        { status: 403 }
      );
    }

    if (stake.status === 'pending_unstake') {
      return NextResponse.json(
        { success: false, error: 'Unstaking already in progress' },
        { status: 400 }
      );
    }

    // Calculate cooldown
    const cooldownEndsAt = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Update stake
    const index = records.indexOf(stake);
    records[index].status = 'pending_unstake';
    records[index].cooldownEndsAt = cooldownEndsAt;
    
    if (!records[index].hasOwnProperty('unstakeRequestedAt')) {
      records[index] = { ...records[index], unstakeRequestedAt: new Date().toISOString() } as StakingRecord;
    }

    writeStakingRecords(records);

    return NextResponse.json({
      success: true,
      cooldownEndsAt,
      message: 'Unstaking initiated. Cooldown period: 7 days'
    });
  } catch (error) {
    console.error('Error in unstake endpoint:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

